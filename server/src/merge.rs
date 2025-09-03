use std::{io::Error as IoError, pin::Pin, sync::Arc};

use actix_web::body::SizedStream;
use actix_web::error::ErrorBadRequest;
use async_stream::stream;
use bytes::Bytes;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use serde_json::{Value, from_slice};

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
    dbg!(&headers);

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

pub fn stream(
    s3: Arc<S3Client>,
    parts: Vec<ObjectPart<PartData>>,
) -> SizedStream<Pin<Box<dyn Stream<Item = Result<Bytes, IoError>>>>> {
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

            SizedStream::new(content_length as u64, Box::pin(stream))
        }

        MergeStrategy::JsonPatch => {
            let stream = stream! {
                yield Result::<Bytes, IoError>::Ok(Bytes::from(r#"{}"#));
            };

            SizedStream::new(2, Box::pin(stream))
        }
    }
}
