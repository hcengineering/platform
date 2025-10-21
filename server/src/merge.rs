use std::{io::Error as IoError, pin::Pin, sync::Arc};

use actix_web::error::ErrorBadRequest;
use async_stream::stream;
use bytes::Bytes;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use serde_json::{Value, from_slice};
use tracing::*;

use crate::handlers::PartData;
use crate::handlers::{HandlerResult, Headers};
use crate::patch;
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
        MergeStrategy::JsonPatch => match blob.inline.as_ref() {
            Some(inline) => {
                from_slice::<Value>(inline).map_err(|e| ErrorBadRequest(e.to_string()))?;
                Ok(())
            }
            _ => Err(ErrorBadRequest("missing inline body").into()),
        },

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
        MergeStrategy::JsonPatch => match blob.inline.as_ref() {
            Some(inline) => {
                from_slice::<Vec<patch::PatchOperation>>(inline)
                    .map_err(|e| ErrorBadRequest(e.to_string()))?;
                Ok(())
            }
            _ => Err(ErrorBadRequest("missing inline body").into()),
        },

        _ => Ok(()),
    }
}

pub struct PartialResponse {
    pub partial: bool,
    pub content_range: Option<String>,
    pub content_length: u64,
    pub stream: Pin<Box<dyn Stream<Item = Result<Bytes, IoError>>>>,
}

#[instrument(level = "debug", skip_all)]
pub async fn partial(
    s3: Arc<S3Client>,
    parts: Vec<ObjectPart<PartData>>,
    range: String,
) -> anyhow::Result<PartialResponse> {
    let part = parts.first().unwrap();

    let mut response = s3
        .get_object()
        .bucket(&CONFIG.s3_bucket)
        .key(&part.data.blob)
        .range(range)
        .send()
        .await?;

    let content_range = response.content_range().map(|s| s.to_string());
    let content_length = response.content_length().map_or(0, |c| c as u64);

    let stream = stream! {
        while let Some(chunk) = response.body.next().await {
            yield Ok(Bytes::from(chunk?));
        };
    };

    Ok(PartialResponse {
        partial: part.data.size != content_length as usize,
        content_range,
        content_length,
        stream: Box::pin(stream),
    })
}

pub struct StreamResponse {
    pub content_length: u64,
    pub stream: Pin<Box<dyn Stream<Item = Result<Bytes, IoError>> + Send>>,
}

#[instrument(level = "debug", skip_all)]
pub async fn stream(
    s3: Arc<S3Client>,
    parts: Vec<ObjectPart<PartData>>,
) -> anyhow::Result<StreamResponse> {
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

            Ok(StreamResponse {
                content_length: content_length as u64,
                stream: Box::pin(stream),
            })
        }

        MergeStrategy::JsonPatch => {
            let mut acc = None;

            for part in parts {
                let part_data = part_data(&s3, part).await?;

                if let Some(acc) = &mut acc {
                    let ops = serde_json::from_slice::<Vec<patch::PatchOperation>>(&part_data);
                    match ops {
                        Ok(ops) => {
                            if let Err(error) = patch::apply(acc, &ops) {
                                error!("json patch error: {error}");
                            }
                        }
                        Err(error) => {
                            error!("json patch deserialization error: {error}");
                        }
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

            Ok(StreamResponse {
                content_length,
                stream: Box::pin(stream),
            })
        }
    }
}

pub fn content_length(parts: Vec<ObjectPart<PartData>>) -> Option<usize> {
    let first = parts.first().unwrap();
    let merge_strategy = first.data.merge_strategy.unwrap();

    match merge_strategy {
        MergeStrategy::Concatenate => {
            let mut content_length = 0;

            for part in parts {
                content_length += part.data.size;
            }

            Some(content_length)
        }

        MergeStrategy::JsonPatch => None,
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

#[cfg(test)]
mod tests {
    use super::*;
    use size::Size;

    #[test]
    fn test_validate_put_request() {
        let test_cases: Vec<(MergeStrategy, &str, Size, HandlerResult<()>)> = vec![
            (
                MergeStrategy::JsonPatch,
                "application/json",
                Size::from_bytes(100),
                Ok(()),
            ),
            (
                MergeStrategy::JsonPatch,
                "application/json",
                Size::from_kb(10),
                Ok(()),
            ),
            (
                MergeStrategy::JsonPatch,
                "application/json",
                Size::from_mb(1),
                Err(ErrorBadRequest("invalid content type and length").into()),
            ),
            (
                MergeStrategy::JsonPatch,
                "text/plain",
                Size::from_kb(10),
                Err(ErrorBadRequest("invalid content type and length").into()),
            ),
            (
                MergeStrategy::Concatenate,
                "text/plain",
                Size::from_mb(1),
                Ok(()),
            ),
        ];

        for (merge_strategy, content_type, content_length, expected) in test_cases {
            let headers = Headers {
                content_length,
                content_type: Some(content_type.to_string()),
                huly_headers: Vec::new(),
                meta: Vec::new(),
            };
            let res = validate_put_request(merge_strategy, &headers);
            match expected {
                Ok(_) => assert!(res.is_ok(), "Expected Ok, got Err: {:?}", res.err()),
                Err(e) => assert_eq!(res.unwrap_err().to_string(), e.to_string()),
            }
        }
    }

    #[test]
    fn test_validate_put_body() {
        let test_cases: Vec<(MergeStrategy, Option<Bytes>, HandlerResult<()>)> = vec![
            (
                MergeStrategy::JsonPatch,
                Some(Bytes::from(
                    r#"{ "op": "add", "path": "/foo", "value": "bar" }"#,
                )),
                Ok(()),
            ),
            (
                MergeStrategy::JsonPatch,
                None,
                Err(ErrorBadRequest("missing inline body").into()),
            ),
            (MergeStrategy::Concatenate, None, Ok(())),
        ];

        for (merge_strategy, body, expected) in test_cases {
            let blob = Blob {
                hash: "hash".to_string(),
                s3_key: "key".to_string(),
                length: body.as_ref().map(|b| b.len()).unwrap_or(0),
                inline: body,
                parts_count: None,
                deduplicated: false,
            };
            let res = validate_put_body(merge_strategy, &blob);
            match expected {
                Ok(_) => assert!(res.is_ok(), "Expected Ok, got Err: {:?}", res.err()),
                Err(e) => assert_eq!(res.unwrap_err().to_string(), e.to_string()),
            }
        }
    }

    #[test]
    fn test_validate_patch_request() {
        let test_cases: Vec<(MergeStrategy, &str, Size, HandlerResult<()>)> = vec![
            (
                MergeStrategy::JsonPatch,
                "application/json-patch+json",
                Size::from_bytes(100),
                Ok(()),
            ),
            (
                MergeStrategy::JsonPatch,
                "application/json-patch+json",
                Size::from_kb(10),
                Ok(()),
            ),
            (
                MergeStrategy::JsonPatch,
                "application/json-patch+json",
                Size::from_mb(1),
                Err(ErrorBadRequest("invalid content type and length").into()),
            ),
            (
                MergeStrategy::JsonPatch,
                "application/json",
                Size::from_kb(10),
                Err(ErrorBadRequest("invalid content type and length").into()),
            ),
            (
                MergeStrategy::Concatenate,
                "text/plain",
                Size::from_mb(1),
                Ok(()),
            ),
        ];

        for (merge_strategy, content_type, content_length, expected) in test_cases {
            let headers = Headers {
                content_length,
                content_type: Some(content_type.to_string()),
                huly_headers: Vec::new(),
                meta: Vec::new(),
            };
            let res = validate_patch_request(merge_strategy, &headers);
            match expected {
                Ok(_) => assert!(res.is_ok(), "Expected Ok, got Err: {:?}", res.err()),
                Err(e) => assert_eq!(res.unwrap_err().to_string(), e.to_string()),
            }
        }
    }

    #[test]
    fn test_validate_patch_body() {
        let test_cases: Vec<(MergeStrategy, Option<Bytes>, HandlerResult<()>)> = vec![
            (
                MergeStrategy::JsonPatch,
                Some(Bytes::from(
                    r#"[{ "op": "add", "path": "/foo", "value": "bar" }]"#,
                )),
                Ok(()),
            ),
            (
                MergeStrategy::JsonPatch,
                None,
                Err(ErrorBadRequest("missing inline body").into()),
            ),
            (MergeStrategy::Concatenate, None, Ok(())),
        ];

        for (merge_strategy, body, expected) in test_cases {
            let blob = Blob {
                hash: "hash".to_string(),
                s3_key: "key".to_string(),
                length: body.as_ref().map(|b| b.len()).unwrap_or(0),
                inline: body,
                parts_count: None,
                deduplicated: false,
            };
            let res = validate_patch_body(merge_strategy, &blob);
            match expected {
                Ok(_) => assert!(res.is_ok(), "Expected Ok, got Err: {:?}", res.err()),
                Err(e) => assert_eq!(res.unwrap_err().to_string(), e.to_string()),
            }
        }
    }
}
