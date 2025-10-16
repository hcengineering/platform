//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

use serde::Deserialize;
use std::str::FromStr;
use tracing::*;

use actix_web::{
    Error, HttpRequest, HttpResponse,
    error::ParseError,
    http::header::{self, HeaderName, HeaderValue, IfMatch, IfNoneMatch, TryIntoHeaderValue},
    web,
};

use crate::{
    config::CONFIG,
    db::Db,
    redis::{SaveMode, Ttl},
    workspace_owner::test_rego_http,
};

pub fn map_redis_error(err: impl std::fmt::Display) -> Error {
    let msg = err.to_string();

    if let Some(detail) = msg.split(" - ExtensionError: ").nth(1) {
        if let Some((code, text)) = detail.split_once(": ") {
            let text = format!("{} {}", code, text);
            return match code {
                "400" => actix_web::error::ErrorBadRequest(text),
                "404" => actix_web::error::ErrorNotFound(text),
                "412" => actix_web::error::ErrorPreconditionFailed(text),
                "500" => actix_web::error::ErrorInternalServerError(text),
                _ => actix_web::error::ErrorInternalServerError("unexpected error"),
            };
        }
    }
    actix_web::error::ErrorInternalServerError("internal error")
}

#[derive(Deserialize, Debug)]
pub struct PathParams {
    key: String,
    workspace: String,
}

pub struct TtlSecsHeader(Option<usize>);
pub struct TtlExpiresAtHeader(Option<u64>);

/// list
pub async fn list(
    req: HttpRequest,
    path: web::Path<PathParams>,
    db: web::Data<Db>,
) -> Result<HttpResponse, actix_web::Error> {
    let params = path.into_inner();
    let key = format!("{}/{}", &params.workspace, &params.key);
    trace!(key, "list request");

    if !CONFIG.no_authorization && !test_rego_http(req, "List") {
        return Err(actix_web::error::ErrorForbidden("forbidden"));
    }

    let entries = db.list(&key).await.map_err(map_redis_error)?;
    Ok(HttpResponse::Ok().json(entries))
}

/// get
pub async fn get(
    req: HttpRequest,
    path: web::Path<PathParams>,
    db: web::Data<Db>,
) -> Result<HttpResponse, actix_web::error::Error> {
    let params = path.into_inner();
    let key = format!("{}/{}", &params.workspace, &params.key);
    trace!(key, "get request");

    if !CONFIG.no_authorization && !test_rego_http(req, "Get") {
        return Err(actix_web::error::ErrorForbidden("forbidden"));
    }

    let entry_opt = db.read(&key).await.map_err(map_redis_error)?;
    let resp = match entry_opt {
        Some(entry) => HttpResponse::Ok()
            .insert_header((header::ETAG, entry.etag.clone()))
            .json(entry),
        None => HttpResponse::NotFound().body("empty"),
    };
    Ok(resp)
}

/// put
pub async fn put(
    req: HttpRequest,
    path: web::Path<PathParams>,
    body: web::Bytes,
    db: web::Data<Db>,
    (secs, expires_at): (
        Result<web::Header<TtlSecsHeader>, ParseError>,
        Result<web::Header<TtlExpiresAtHeader>, ParseError>,
    ),
    (if_match, if_none_match): (
        web::Header<header::IfMatch>,
        web::Header<header::IfNoneMatch>,
    ),
) -> Result<HttpResponse, actix_web::error::Error> {
    let params = path.into_inner();
    let key = format!("{}/{}", &params.workspace, &params.key);
    trace!(key, "put request");

    if !CONFIG.no_authorization && !test_rego_http(req, "Put") {
        return Err(actix_web::error::ErrorForbidden("forbidden"));
    }

    // TTL logic
    let ttl = match (secs?.into_inner().0, expires_at?.into_inner().0) {
        (None, None) => None,
        (Some(secs), None) => Some(Ttl::Sec(secs)),
        (None, Some(timestamp)) => Some(Ttl::At(timestamp)),
        _ => {
            return Err(actix_web::error::ErrorBadRequest("Multiple ttl specified"));
        }
    };

    // MODE logic
    let mode = match (if_match.into_inner(), if_none_match.into_inner()) {
        (IfMatch::Items(items), IfNoneMatch::Items(nitems))
            if items.is_empty() && nitems.is_empty() =>
        {
            SaveMode::Upsert
        }
        (IfMatch::Any, IfNoneMatch::Items(nitems)) if nitems.is_empty() => SaveMode::Update,
        (IfMatch::Items(etags), IfNoneMatch::Items(nitems))
            if etags.len() == 1 && nitems.is_empty() =>
        {
            SaveMode::Equal(etags[0].tag().to_string())
        }
        (IfMatch::Items(items), IfNoneMatch::Any) if items.is_empty() => SaveMode::Insert,
        _ => {
            return Err(actix_web::error::ErrorBadRequest(
                "Unsupported combination of If-Match and If-None-Match",
            ));
        }
    };

    db.save(&key, &body[..], ttl, Some(mode))
        .await
        .map_err(map_redis_error)?;
    Ok(HttpResponse::Ok().body("DONE"))
}

/// delete
pub async fn delete(
    req: HttpRequest,
    path: web::Path<PathParams>,
    db: web::Data<Db>,
    if_match: web::Header<header::IfMatch>,
) -> Result<HttpResponse, actix_web::error::Error> {
    let params = path.into_inner();
    let key = format!("{}/{}", &params.workspace, &params.key);
    trace!(key, "delete request");

    if !CONFIG.no_authorization && !test_rego_http(req, "Delete") {
        return Err(actix_web::error::ErrorForbidden("forbidden"));
    }

    // MODE logic
    let mode = match if_match.into_inner() {
        IfMatch::Any => SaveMode::Update,
        IfMatch::Items(etags) => {
            if etags.len() == 1 {
                SaveMode::Equal(etags[0].tag().to_string())
            } else if etags.is_empty() {
                SaveMode::Upsert
            } else {
                return Err(actix_web::error::ErrorBadRequest(
                    "Multiple If-Match are not supported",
                ));
            }
        }
    };

    let deleted = db.delete(&key, Some(mode)).await.map_err(map_redis_error)?;
    let response = match deleted {
        true => HttpResponse::NoContent().finish(),
        false => HttpResponse::NotFound().body("not found"),
    };

    Ok(response)
}

impl TryIntoHeaderValue for TtlSecsHeader {
    type Error = std::convert::Infallible;

    fn try_into_value(self) -> Result<header::HeaderValue, Self::Error> {
        Ok(self
            .0
            .map(HeaderValue::from)
            .unwrap_or(HeaderValue::from_static("")))
    }
}

impl header::Header for TtlSecsHeader {
    fn name() -> HeaderName {
        HeaderName::from_static("huly-ttl")
    }

    fn parse<M: actix_web::HttpMessage>(msg: &M) -> Result<Self, ParseError> {
        let mut values = msg.headers().get_all(Self::name());
        let val = if let Some(value) = values.next() {
            Some(
                usize::from_str(value.to_str().map_err(|_| ParseError::Header)?.trim())
                    .map_err(|_| ParseError::Header)?,
            )
        } else {
            None
        };
        if values.next().is_some() {
            return Err(ParseError::TooLarge);
        }
        Ok(Self(val))
    }
}

impl TryIntoHeaderValue for TtlExpiresAtHeader {
    type Error = std::convert::Infallible;

    fn try_into_value(self) -> Result<header::HeaderValue, Self::Error> {
        Ok(self
            .0
            .map(HeaderValue::from)
            .unwrap_or(HeaderValue::from_static("")))
    }
}

impl header::Header for TtlExpiresAtHeader {
    fn name() -> HeaderName {
        HeaderName::from_static("huly-expire-at")
    }

    fn parse<M: actix_web::HttpMessage>(msg: &M) -> Result<Self, ParseError> {
        let mut values = msg.headers().get_all(Self::name());
        let val = if let Some(value) = values.next() {
            Some(
                u64::from_str(value.to_str().map_err(|_| ParseError::Header)?.trim())
                    .map_err(|_| ParseError::Header)?,
            )
        } else {
            None
        };
        if values.next().is_some() {
            return Err(ParseError::TooLarge);
        }
        Ok(Self(val))
    }
}
