use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::put_object::PutObjectError;
use bytes::Bytes;

use crate::conditional::ConditionalMatch;
use crate::config::CONFIG;
use crate::{handlers::PartData, s3::S3Client};

#[derive(thiserror::Error, Debug)]
pub enum RecoveryError {
    #[error("S3 Error: {0}")]
    S3(String),

    #[error("Precondition Failed")]
    PreconditionFailed,

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl From<serde_json::Error> for RecoveryError {
    fn from(err: serde_json::Error) -> Self {
        RecoveryError::Other(err.into())
    }
}

impl From<SdkError<PutObjectError>> for RecoveryError {
    fn from(err: SdkError<PutObjectError>) -> Self {
        match err {
            SdkError::ServiceError(service_err) if service_err.raw().status().as_u16() == 412 => {
                RecoveryError::PreconditionFailed
            }
            _ => RecoveryError::S3(err.to_string()),
        }
    }
}

pub fn object_etag(parts: Vec<&PartData>) -> anyhow::Result<String> {
    let body = Bytes::from(serde_json::to_string(&parts)?);
    let digest = md5::compute(body);
    Ok(format!("{:x}", digest))
}

#[tracing::instrument(level = "debug", skip_all)]
pub async fn set_object(
    s3: &S3Client,
    workspace: uuid::Uuid,
    key: &str,
    parts: Vec<&PartData>,
    conditions: Option<ConditionalMatch>,
) -> Result<(), RecoveryError> {
    let s3_bucket = &CONFIG.s3_bucket;

    let key = format!("blob/{}/{}", workspace, key);
    let body = Bytes::from(serde_json::to_string(&parts)?);

    let mut cmd = s3
        .put_object()
        .bucket(s3_bucket)
        .key(key)
        .body(body.into())
        .content_type("application/json");

    cmd = match conditions {
        Some(ConditionalMatch::IfMatch(etag)) => cmd.if_match(etag),
        Some(ConditionalMatch::IfNoneMatch(etag)) => cmd.if_none_match(etag),
        None => cmd,
    };

    cmd.send().await?;

    Ok(())
}

#[tracing::instrument(level = "debug", skip_all)]
pub async fn set_blob(s3: &S3Client, key: &str, hash: &str) -> Result<(), RecoveryError> {
    let s3_bucket = &CONFIG.s3_bucket;

    let key = format!("hash/{}", key);
    let body = Bytes::from(hash.to_string());

    s3.put_object()
        .bucket(s3_bucket)
        .key(key)
        .body(body.into())
        .content_type("text/plain")
        .send()
        .await?;

    Ok(())
}
