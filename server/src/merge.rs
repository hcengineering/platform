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

pub fn validate_put_request(headers: &Headers) -> HandlerResult<()> {
    dbg!(&headers);

    match headers.merge_strategy {
        MergeStrategy::JsonPatch => {
            if headers.content_type != Some("application/json".to_string())
                || headers.content_length > CONFIG.inline_threshold
            {
                return Err(
                    actix_web::error::ErrorBadRequest("invalid content type and length").into(),
                );
            }
        }

        _ => {
            //
        }
    }

    Ok(())
}

pub fn validate_put_body(headers: &Headers, blob: &Blob) -> HandlerResult<()> {
    dbg!(&headers);
    dbg!(&blob);

    match headers.merge_strategy {
        MergeStrategy::JsonPatch => {
            from_slice::<Value>(blob.inline.as_ref().unwrap())
                .map_err(|x| actix_web::error::ErrorBadRequest(x.to_string()))?;
        }

        _ => {
            //
        }
    }

    Ok(())
}
