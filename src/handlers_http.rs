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

use crate::workspace_owner::workspace_check;
use anyhow::anyhow;
use redis::aio::MultiplexedConnection;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use tracing::{error, trace};
use uuid::Uuid;

use crate::redis_lib::{
    RedisArray, SaveMode, Ttl, redis_delete, redis_list, redis_read, redis_save,
};

use actix_web::{
    Error, HttpRequest, HttpResponse, error,
    web::{self, Data, Json, Query},
};

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

/// list
pub async fn list(
    req: HttpRequest,
    path: web::Path<String>,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::Error> {
    workspace_check(&req)?; // Check workspace

    let key = path.into_inner();

    trace!(key, "list request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut conn = redis.lock().await;

        let entries = redis_list(&mut *conn, &key).await?;

        Ok(HttpResponse::Ok().json(entries))
    }()
    .await
    .map_err(map_handler_error)
}

/// get
pub async fn get(
    req: HttpRequest,
    path: web::Path<String>,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::error::Error> {
    workspace_check(&req)?; // Check workspace

    let key = path.into_inner();

    // trace!(key, "get request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut conn = redis.lock().await;

        Ok(redis_read(&mut *conn, &key)
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

/// put
pub async fn put(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Bytes,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::error::Error> {
    workspace_check(&req)?; // Check workspace

    let key: String = path.into_inner();

    async move || -> anyhow::Result<HttpResponse> {
        if !req.query_string().is_empty() {
            return Err(anyhow!("Query parameters are not allowed"));
        }

        let mut conn = redis.lock().await;

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

        redis_save(&mut *conn, &key, &body[..], ttl, mode).await?;
        return Ok(HttpResponse::Ok().body("DONE"));
    }()
    .await
    .map_err(map_handler_error)
}

/// delete
pub async fn delete(
    req: HttpRequest,
    path: web::Path<String>,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::error::Error> {
    workspace_check(&req)?; // Check workspace

    let key: String = path.into_inner();

    trace!(key, "delete request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut conn = redis.lock().await;

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

        let deleted = redis_delete(&mut *conn, &key, mode).await?;

        let response = match deleted {
            true => HttpResponse::NoContent().finish(),
            false => HttpResponse::NotFound().body("not found"),
        };

        Ok(response)
    }()
    .await
    .map_err(map_handler_error)
}
