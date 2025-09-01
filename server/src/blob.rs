use std::error::Error as StdError;

use aws_sdk_s3::primitives::ByteStream;
use blake3::Hasher;
use bytes::{Bytes, BytesMut};
use futures::stream::StreamExt;
use futures_util::Stream;
use size::Size;
use tracing::*;

use crate::handlers::ApiError;
use crate::s3::S3Client;
use crate::{
    config::CONFIG,
    postgres::{self, Pool},
};

pub struct Blob {
    pub s3_key: String,
    pub length: usize,
    pub inline: Option<Vec<u8>>,
}

fn random_key() -> String {
    ksuid::Ksuid::generate().to_base62()
}

#[instrument(level = "debug", skip_all, fields(s3_bucket))]
pub async fn upload<S, E>(
    s3: &S3Client,
    pool: &Pool,
    length: Size,
    mut source: S,
) -> Result<Blob, ApiError>
where
    S: Stream<Item = Result<Bytes, E>> + Unpin,
    E: StdError + Send + Sync + 'static,
{
    let span = Span::current();

    let s3_bucket = &CONFIG.s3_bucket;
    span.record("s3_bucket", &s3_bucket);

    let blob = if length < CONFIG.multipart_threshold {
        let mut hash = Hasher::new();

        let mut buffer = BytesMut::new();

        // read in all chunks, but not more that length
        while let Some(Ok(chunk)) = source.next().await {
            buffer.extend_from_slice(&chunk);

            if buffer.len() > length.bytes() as usize {
                return Err(actix_web::error::ErrorPayloadTooLarge("payload too large").into());
            }
        }

        if buffer.len() != length.bytes() as usize {
            return Err(actix_web::error::ErrorBadRequest("payload size mismatch").into());
        }

        let hash = hash.update(&buffer).finalize().to_hex();
        let length = buffer.len();

        let inline = if length < CONFIG.inline_threshold.bytes() as usize {
            Some(buffer.to_vec())
        } else {
            None
        };

        let s3_key = if let Some(s3_key_found) = postgres::find_blob_by_hash(&pool, &hash).await? {
            span.record("s3_key", &s3_key_found);
            debug!(s3_key_found, "blob deduplicated");
            s3_key_found
        } else {
            let s3_key = random_key();
            span.record("s3_key", &s3_key);

            s3.put_object()
                .bucket(s3_bucket)
                .key(&s3_key)
                .body(ByteStream::from(buffer.freeze()))
                .send()
                .await?;

            postgres::insert_blob(&pool, &s3_key, &hash).await?;

            debug!("blob created");
            s3_key
        };

        Blob {
            s3_key,
            length,
            inline,
        }
    } else {
        let s3_key = random_key();
        span.record("s3_key", &s3_key);

        let upload = crate::s3::multipart_upload(&s3, &s3_bucket, &s3_key, source).await?;

        let hash = upload.hash.to_hex().to_string();

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

        Blob {
            s3_key,
            length: upload.length,
            inline: None,
        }
    };

    Ok(blob)
}
