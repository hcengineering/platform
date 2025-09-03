use actix_web::error::ErrorBadRequest;
use serde::{Deserialize, Serialize};
use serde_json::{Value, from_slice};

use crate::handlers::{HandlerResult, Headers};
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
