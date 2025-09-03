use std::{io::Error as IoError, pin::Pin, sync::Arc};

use actix_web::body::SizedStream;
use actix_web::error::ErrorBadRequest;
use async_stream::stream;
use bytes::Bytes;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use serde_json::{Value, from_slice};
use tracing::*;

use crate::handlers::PartData;
use crate::handlers::{HandlerResult, Headers};
use crate::postgres::ObjectPart;
use crate::s3::S3Client;
use crate::{blob::Blob, config::CONFIG};

#[derive(
    Clone, Copy, Debug, Serialize, Deserialize, Default, strum::EnumString, strum::Display,
)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
pub enum MergeStrategy {
    JsonPatch,

    #[default]
    Concatenate,
}

pub fn validate_put_request(merge_strategy: MergeStrategy, headers: &Headers) -> HandlerResult<()> {
    match merge_strategy {
        MergeStrategy::JsonPatch
            if headers.content_type != Some("application/json".to_string())
                || headers.content_length > CONFIG.inline_threshold =>
        {
            Err(ErrorBadRequest("invalid content type and length").into())
        }

        _ => Ok(()),
    }
}

pub fn validate_put_body(merge_strategy: MergeStrategy, blob: &Blob) -> HandlerResult<()> {
    match merge_strategy {
        MergeStrategy::JsonPatch => {
            from_slice::<Value>(blob.inline.as_ref().unwrap())
                .map_err(|e| ErrorBadRequest(e.to_string()))?;

            Ok(())
        }

        _ => Ok(()),
    }
}

pub fn validate_patch_request(
    merge_strategy: MergeStrategy,
    headers: &Headers,
) -> HandlerResult<()> {
    match merge_strategy {
        MergeStrategy::JsonPatch
            if headers.content_type != Some("application/json-patch+json".to_string())
                || headers.content_length > CONFIG.inline_threshold =>
        {
            Err(ErrorBadRequest("invalid content type and length").into())
        }

        _ => Ok(()),
    }
}

pub fn validate_patch_body(merge_strategy: MergeStrategy, blob: &Blob) -> HandlerResult<()> {
    match merge_strategy {
        MergeStrategy::JsonPatch => {
            from_slice::<Value>(blob.inline.as_ref().unwrap())
                .map_err(|x| actix_web::error::ErrorBadRequest(x.to_string()))?;

            Ok(())
        }

        _ => Ok(()),
    }
}

pub async fn stream(
    s3: Arc<S3Client>,
    parts: Vec<ObjectPart<PartData>>,
) -> anyhow::Result<SizedStream<Pin<Box<dyn Stream<Item = Result<Bytes, IoError>>>>>> {
    let first = parts.first().unwrap();
    let merge_strategy = first.data.merge_strategy.unwrap();

    match merge_strategy {
        MergeStrategy::Concatenate => {
            let mut content_length = 0;

            for part in parts.iter() {
                content_length += part.data.size;
            }

            let stream = stream! {
                for parts in parts {
                    match parts.inline {
                        Some(inline) => {
                            yield Ok(Bytes::from(inline));
                        },
                        None => {
                            match s3.get_object().bucket(&CONFIG.s3_bucket).key(parts.data.blob).send().await {
                                Ok(mut response) => {
                                    while let Some(bytes) = response.body.next().await {
                                        yield Ok(bytes?);
                                    }
                                },

                                Err(error) => {
                                    yield Err(IoError::new(std::io::ErrorKind::Other, error));
                                    break;
                                }
                            }
                        }
                    }
                }
            };

            Ok(SizedStream::new(content_length as u64, Box::pin(stream)))
        }

        MergeStrategy::JsonPatch => {
            let mut acc = None;

            for part in parts {
                let part_data = part_data(&s3, part).await?;

                use json_patch::PatchOperation;
                use serde_json::from_slice;

                if let Some(acc) = &mut acc {
                    let ops = from_slice::<Vec<PatchOperation>>(&part_data)?;

                    if let Err(error) = json_patch::patch(acc, &ops) {
                        error!("json patch error: {error}");
                    }
                } else {
                    acc = Some(serde_json::from_slice::<Value>(&part_data)?);
                }
            }

            let bytes = serde_json::to_vec(&acc.unwrap())?;
            let content_length = bytes.len() as u64;

            let stream = stream! {
                yield Result::<Bytes, IoError>::Ok(Bytes::from(bytes));
            };

            Ok(SizedStream::new(content_length, Box::pin(stream)))
        }
    }
}

async fn part_data(s3: &S3Client, part: ObjectPart<PartData>) -> anyhow::Result<Vec<u8>> {
    match part.inline {
        Some(inline) => Ok(inline),

        None => {
            let response = s3
                .get_object()
                .bucket(&CONFIG.s3_bucket)
                .key(&part.data.blob)
                .send()
                .await?;

            let bytes = response.body().bytes().unwrap_or_default().to_vec();

            Ok(bytes)
        }
    }
}
