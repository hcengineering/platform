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

use anyhow::anyhow;
use redis::aio::MultiplexedConnection;
use serde::{Deserialize, de};
use tracing::*;

use actix_web::{
    Error, HttpRequest, HttpResponse,
    web::{self},
};
use uuid::Uuid;

use crate::redis_lib::{SaveMode, Ttl, redis_delete, redis_list, redis_read, redis_save};
use crate::workspace_owner::workspace_check;

pub fn map_handler_error(err: impl std::fmt::Display) -> Error {
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
    //workspace: Uuid,
    key: String,
}

/// list
pub async fn list(
    path: web::Path<PathParams>,
    redis: web::Data<MultiplexedConnection>,
) -> Result<HttpResponse, actix_web::Error> {
    let key = path.into_inner().key;

    trace!(key, "list request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut redis = redis.get_ref().clone();

        let entries = redis_list(&mut redis, &key).await?;

        Ok(HttpResponse::Ok().json(entries))
    }()
    .await
    .map_err(map_handler_error)
}

/// get
pub async fn get(
    path: web::Path<PathParams>,
    redis: web::Data<MultiplexedConnection>,
) -> Result<HttpResponse, actix_web::error::Error> {
    let key = path.into_inner().key;

    trace!(key, "get request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut redis = redis.get_ref().clone();

        Ok(redis_read(&mut redis, &key)
            .await?
            .map(|entry| {
                HttpResponse::Ok()
                    .insert_header(("ETag", &*entry.etag))
                    .json(entry)
            })
            .unwrap_or_else(|| HttpResponse::NotFound().body("empty")))
    }()
    .await
    .map_err(map_handler_error)
}

#[derive(serde::Deserialize)]
struct MyHeaders {
    #[serde(rename = "HULY-TTL")]
    ttl: Option<u64>,
}

/// put
pub async fn put(
    req: HttpRequest,
    path: web::Path<PathParams>,
    body: web::Bytes,
    redis: web::Data<MultiplexedConnection>,
) -> Result<HttpResponse, actix_web::error::Error> {
    let key: String = path.into_inner().key;

    trace!(key, "put request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut redis = redis.get_ref().clone();

        // TTL logic
        let mut ttl = None;
        if let Some(x) = req.headers().get("HULY-TTL") {
            let s = x.to_str().map_err(|_| anyhow!("Invalid HULY-TTL header"))?;
            let secs = s
                .parse::<usize>()
                .map_err(|_| anyhow!("Invalid TTL value in HULY-TTL header"))?;
            ttl = Some(Ttl::Sec(secs));
        } else if let Some(x) = req.headers().get("HULY-EXPIRE-AT") {
            let s = x
                .to_str()
                .map_err(|_| anyhow!("Invalid HULY-EXPIRE-AT header"))?;
            let ts = s
                .parse::<u64>()
                .map_err(|_| anyhow!("Invalid EXPIRE-AT value in HULY-EXPIRE-AT header"))?;
            ttl = Some(Ttl::At(ts));
        }

        // MODE logic
        let mut mode = Some(SaveMode::Upsert);
        if let Some(h) = req.headers().get("If-Match") {
            // `If-Match: *` - update only if the key exists
            let s = h.to_str().map_err(|_| anyhow!("Invalid If-Match header"))?;
            if s == "*" {
                mode = Some(SaveMode::Update);
            }
            // `If-Match: *` — update only if exist
            else {
                mode = Some(SaveMode::Equal(s.to_string()));
            } // `If-Match: <md5>` — update only if current
        } else if let Some(h) = req.headers().get("If-None-Match") {
            // `If-None-Match: *` — insert only if does not exist
            let s = h
                .to_str()
                .map_err(|_| anyhow!("Invalid If-None-Match header"))?;
            if s == "*" {
                mode = Some(SaveMode::Insert);
            } else {
                return Err(anyhow!("If-None-Match must be '*'"));
            }
        }

        redis_save(&mut redis, &key, &body[..], ttl, mode).await?;
        return Ok(HttpResponse::Ok().body("DONE"));
    }()
    .await
    .map_err(map_handler_error)
}

/// delete
pub async fn delete(
    req: HttpRequest,
    path: web::Path<PathParams>,
    redis: web::Data<MultiplexedConnection>,
) -> Result<HttpResponse, actix_web::error::Error> {
    workspace_check(&req)?; // Check workspace

    let key: String = path.into_inner().key;

    trace!(key, "delete request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut redis = redis.get_ref().clone();

        // MODE logic
        let mut mode = Some(SaveMode::Upsert);
        if let Some(h) = req.headers().get("If-Match") {
            // `If-Match: *` - delete only if the key exists
            let s = h.to_str().map_err(|_| anyhow!("Invalid If-Match header"))?;
            if s == "*" {
                mode = Some(SaveMode::Update);
            }
            // `If-Match: *` — return error if not exist
            else {
                mode = Some(SaveMode::Equal(s.to_string()));
            } // `If-Match: <md5>` — delete only if current
        }

        let deleted = redis_delete(&mut redis, &key, mode).await?;

        let response = match deleted {
            true => HttpResponse::NoContent().finish(),
            false => HttpResponse::NotFound().body("not found"),
        };

        Ok(response)
    }()
    .await
    .map_err(map_handler_error)
}
