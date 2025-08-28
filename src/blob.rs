use actix_web::dev::ServiceRequest;
use actix_web::http::header::ContentLength;
use actix_web::web::{Header, Payload};
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};
use blake3::Hasher;
use bytes::BytesMut;
use futures_util::StreamExt;
use size::Size;
use tracing::*;

use crate::s3::S3Client;
use crate::{
    config::CONFIG,
    postgres::{self, Pool},
};

use crate::handlers::{ApiError, HandlerResult};

pub struct Blob {
    pub s3_key: String,
    pub length: u64,
    pub inline: Option<Vec<u8>>,
}

const MULTIPART_THRESHOLD: usize = 4; // mb
const INLINE_THRESHHOLD: usize = 100; // kb

fn random_key() -> String {
    ksuid::Ksuid::generate().to_base62()
}

#[instrument(level = "debug", skip_all, fields(s3_bucket))]
pub async fn upload(
    s3: &S3Client,
    pool: &Pool,
    request: &mut ServiceRequest,
    payload: Payload,
) -> Result<Blob, ApiError> {
    let span = Span::current();

    let s3_bucket = &CONFIG.s3_bucket;

    span.record("s3_bucket", &s3_bucket);

    if let Ok(length) = request.extract::<Header<ContentLength>>().await
        && length.0 < Size::from_megabytes(MULTIPART_THRESHOLD).bytes() as usize
    {
        upload_regular(
            s3,
            pool,
            &s3_bucket,
            length.0 < Size::from_kilobytes(INLINE_THRESHHOLD).bytes() as usize,
            payload,
        )
        .await
    } else {
        upload_multipart(s3, pool, &s3_bucket, payload).await
    }
}

#[instrument(level = "debug", skip_all, fields(s3_key))]
async fn upload_regular(
    s3: &S3Client,
    pool: &Pool,
    s3_bucket: &str,
    require_inline: bool,
    payload: Payload,
) -> Result<Blob, ApiError> {
    let span = Span::current();

    let payload = payload
        .to_bytes_limited(Size::from_megabytes(MULTIPART_THRESHOLD).bytes() as usize)
        .await
        .map_err(|_| actix_web::error::ErrorPayloadTooLarge("payload too large"))??;

    let length = payload.len() as u64;
    let inline = if require_inline {
        Some(payload.to_vec())
    } else {
        None
    };

    let mut hash = Hasher::new();
    hash.update(&payload);

    let hash = hash.finalize().to_hex().to_string();

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
            .body(ByteStream::from(payload))
            .send()
            .await?;

        postgres::insert_blob(&pool, &s3_key, &hash).await?;

        debug!("blob created");

        s3_key
    };

    Ok(Blob {
        s3_key,
        length,
        inline,
    })
}

#[instrument(level = "debug", skip_all, fields(upload, s3_key))]
async fn upload_multipart(
    s3: &S3Client,
    pool: &Pool,
    s3_bucket: &str,
    mut payload: Payload,
) -> Result<Blob, ApiError> {
    let span = Span::current();

    let s3_key = random_key();

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
        length: total_uploaded as u64,
        inline: None,
    })
}
