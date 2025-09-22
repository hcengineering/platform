use bytes::Bytes;

use crate::conditional::ConditionalMatch;
use crate::config::CONFIG;
use crate::{handlers::PartData, s3::S3Client};

pub fn object_etag(parts: Vec<&PartData>) -> anyhow::Result<String> {
    let body = Bytes::from(serde_json::to_string(&parts)?);
    let digest = md5::compute(body);
    Ok(format!("{:x}", digest))
}

pub async fn set_object(
    s3: &S3Client,
    workspace: uuid::Uuid,
    key: &str,
    parts: Vec<&PartData>,
    conditions: Option<ConditionalMatch>,
) -> anyhow::Result<()> {
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

pub async fn set_blob(s3: &S3Client, key: &str, hash: &str) -> anyhow::Result<()> {
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
