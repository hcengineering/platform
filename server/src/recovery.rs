use bytes::Bytes;

use crate::config::CONFIG;
use crate::{handlers::PartData, s3::S3Client};

pub async fn set_object(
    s3: &S3Client,
    workspace: uuid::Uuid,
    key: &str,
    parts: Vec<&PartData>,
) -> anyhow::Result<()> {
    let s3_bucket = &CONFIG.s3_bucket;

    let key = format!("object/{}/{}", workspace, key);
    let body = Bytes::from(serde_json::to_string(&parts)?);

    s3.put_object()
        .bucket(s3_bucket)
        .key(key)
        .body(body.into())
        .content_type("application/json")
        .send()
        .await?;

    Ok(())
}

pub async fn set_blob(s3: &S3Client, key: &str, hash: &str) -> anyhow::Result<()> {
    let s3_bucket = &CONFIG.s3_bucket;

    let key = format!("blob/{}", key);
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
