use std::error::Error as StdError;

use anyhow::Result;
use aws_config::BehaviorVersion;
use aws_sdk_s3::{
    Config,
    types::{CompletedMultipartUpload, CompletedPart},
};
use blake3::{Hash, Hasher};
use bytes::{Bytes, BytesMut};
use futures::stream::StreamExt;
use futures_util::Stream;
use tracing::*;

pub type S3Client = aws_sdk_s3::Client;

pub async fn client() -> S3Client {
    let ref sdk_config = aws_config::defaults(BehaviorVersion::latest())
        .load()
        .await
        .into_builder()
        .build();

    let s3_config = Config::from(sdk_config)
        .to_builder()
        .force_path_style(true)
        .build();

    S3Client::from_conf(s3_config)
}

pub struct Upload {
    pub hash: Hash,
    pub length: usize,
    pub parts_count: usize,
}

async fn multipart_upload_stream<S, E>(
    s3: &S3Client,
    bucket: &str,
    key: &str,
    upload_id: &str,
    mut source: S,
) -> Result<(CompletedMultipartUpload, Upload)>
where
    S: Stream<Item = Result<Bytes, E>> + Unpin,
    E: StdError + Send + Sync + 'static,
{
    debug!("upload start");

    let upload_part = async |number, buffer: Bytes| -> Result<CompletedPart> {
        let upload = s3
            .upload_part()
            .bucket(bucket)
            .key(key)
            .upload_id(upload_id)
            .body(buffer.into())
            .part_number(number)
            .send()
            .await?;

        let part = CompletedPart::builder()
            .e_tag(upload.e_tag.unwrap())
            .part_number(number)
            .build();

        Ok(part)
    };

    let mut buffer = BytesMut::with_capacity(1024 * 1024 * 6);
    let mut complete = CompletedMultipartUpload::builder();
    let mut part_number = 1;
    let mut hash = Hasher::new();
    let mut total_in = 0;
    let mut length = 0;

    while let Some(part) = source.next().await {
        let part = part.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

        hash.update(&part);

        total_in += part.len();

        buffer.extend_from_slice(&part);

        // each part must be at least 5MB
        if buffer.len() > 1024 * 1024 * 5 {
            trace!(length = buffer.len(), part_number, "upload part");

            length += buffer.len();

            let uploaded = upload_part(part_number, buffer.freeze()).await?;

            complete = complete.parts(uploaded);

            buffer = BytesMut::new();
            part_number += 1;
        }
    }

    // the last part
    if buffer.len() > 0 {
        length += buffer.len();

        trace!(length = buffer.len(), part_number, "upload part");
        let uploaded = upload_part(part_number, buffer.freeze()).await?;
        complete = complete.parts(uploaded);
    }

    assert_eq!(total_in, length);

    let hash = hash.finalize();

    let complete = complete.build();
    let parts_count = complete.parts().len();

    Ok((
        complete,
        Upload {
            hash,
            length,
            parts_count,
        },
    ))
}

#[tracing::instrument(level = "debug", skip_all)]
pub async fn multipart_upload<S, E>(
    s3: &S3Client,
    bucket: &str,
    key: &str,
    source: S,
) -> Result<Upload>
where
    S: Stream<Item = Result<Bytes, E>> + Unpin,
    E: StdError + Send + Sync + 'static,
{
    let span = Span::current();

    let create_multipart = s3
        .create_multipart_upload()
        .bucket(bucket)
        .key(key)
        .send()
        .await?;

    let upload_id = create_multipart.upload_id().unwrap();

    span.record("upload", &upload_id[upload_id.len().saturating_sub(16)..]);

    match multipart_upload_stream(s3, bucket, key, upload_id, source).await {
        Ok((complete, upload)) => {
            s3.complete_multipart_upload()
                .bucket(bucket)
                .key(key)
                .multipart_upload(complete)
                .upload_id(upload_id)
                .send()
                .await?;

            debug!(hash = %upload.hash, length = upload.length, "upload complete");

            Ok(upload)
        }
        Err(error) => {
            s3.abort_multipart_upload()
                .bucket(bucket)
                .key(key)
                .upload_id(upload_id)
                .send()
                .await?;

            error!(%error, "upload error");
            Err(error)
        }
    }
}
