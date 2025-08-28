use actix_web::web::Payload;
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};
use blake3::Hasher;
use bytes::BytesMut;
use futures_util::StreamExt;
use tracing::*;

use crate::s3::S3Client;
use crate::{
    config::CONFIG,
    postgres::{self, Pool},
};

use crate::handlers::{ApiError, HandlerResult};

pub struct Blob {
    pub s3_key: String,
    pub size: u64,
}

// upload and deduplicate blob
#[instrument(level = "debug", skip_all, fields(s3_bucket, s3_key, upload))]
pub async fn upload(s3: &S3Client, pool: &Pool, mut payload: Payload) -> Result<Blob, ApiError> {
    let span = Span::current();

    let s3_bucket = &CONFIG.s3_bucket;
    let s3_key = ksuid::Ksuid::generate().to_base62();

    span.record("s3_bucket", &s3_bucket);
    span.record("s3_key", &s3_key);

    let create_multipart = s3
        .create_multipart_upload()
        .bucket(s3_bucket)
        .key(&s3_key)
        .send()
        .await?;

    let upload_id = create_multipart.upload_id().unwrap();

    span.record("upload", &upload_id[upload_id.len().saturating_sub(16)..]);

    debug!("upload start");

    let upload_part = async |number, buffer: BytesMut| -> HandlerResult<CompletedPart> {
        let upload = s3
            .upload_part()
            .bucket(s3_bucket)
            .key(&s3_key)
            .upload_id(upload_id)
            .body(buffer.freeze().into())
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
    let mut total_uploaded = 0;

    while let Some(part) = payload.next().await {
        if let Ok(part) = part {
            hash.update(&part);

            total_in += part.len();

            buffer.extend_from_slice(&part);

            // each part must be at least 5MB
            if buffer.len() > 1024 * 1024 * 5 {
                trace!(length = buffer.len(), part_number, "upload part");

                total_uploaded += buffer.len();

                let uploaded = upload_part(part_number, buffer).await?;

                complete = complete.parts(uploaded);

                buffer = BytesMut::new();
                part_number += 1;
            }
        } else {
            // TODO: cleanup incomplete upload
            panic!("read error")
        }
    }

    // the last part
    if buffer.len() > 0 {
        total_uploaded += buffer.len();

        trace!(length = buffer.len(), part_number, "upload part");
        let uploaded = upload_part(part_number, buffer).await?;
        complete = complete.parts(uploaded);
    }

    assert_eq!(total_in, total_uploaded);

    let _ = s3
        .complete_multipart_upload()
        .bucket(s3_bucket)
        .key(&s3_key)
        .multipart_upload(complete.build())
        .upload_id(upload_id)
        .send()
        .await?;

    let hash = hash.finalize().to_hex().to_string();

    debug!(hash, "upload complete");

    let s3_key = if let Some(s3_key_found) = postgres::find_blob_by_hash(&pool, &hash).await? {
        debug!(s3_key_found, "blob deduplicated");

        // delete uploaded
        s3.delete_object()
            .bucket(s3_bucket)
            .key(s3_key)
            .send()
            .await?;

        s3_key_found
    } else {
        debug!("blob created");
        postgres::insert_blob(&pool, &s3_key, &hash).await?;
        s3_key
    };

    Ok(Blob {
        s3_key,
        size: total_uploaded as u64,
    })
}
