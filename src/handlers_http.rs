use redis::aio::MultiplexedConnection;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;
use anyhow::anyhow;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{error, trace};
use uuid::Uuid;
use crate::ws_owner;

type ObjectPath = web::Path<(String, String)>;

use crate::redis::{
    Ttl, SaveMode,
    RedisArray,
    redis_save,
    redis_read,
    redis_delete,
    redis_list,
};

use actix_web::{
    HttpRequest, HttpResponse, error, Error,
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
                _     => actix_web::error::ErrorInternalServerError("unexpected error"),
            };
        }
    }
    actix_web::error::ErrorInternalServerError("internal error")
}


/// list

// #[derive(Deserialize)]
pub async fn list(
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<HashMap<String, String>>,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::Error> {

    ws_owner::workspace_owner(&req)?; // Check workspace

    let workspace = path.into_inner();
    let prefix = query.get("prefix").map(|s| s.as_str());

    trace!(workspace, prefix, "list request");

    async move || -> anyhow::Result<HttpResponse> {

        let mut conn = redis.lock().await;

	let entries = redis_list(&mut *conn, &workspace, prefix).await?;

        Ok(HttpResponse::Ok().json(entries))

    }().await.map_err(map_handler_error)
}

/// get / (test)

pub async fn get(
    req: HttpRequest,
    path: ObjectPath,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::error::Error> {

    ws_owner::workspace_owner(&req)?; // Check workspace

    let (workspace, key) = path.into_inner();

    trace!(workspace, key, "get request");

    async move || -> anyhow::Result<HttpResponse> {

        let mut conn = redis.lock().await;

	Ok(
	    redis_read(&mut *conn, &workspace, &key).await?
    		.map(|entry| HttpResponse::Ok()
                    .insert_header(("ETag", &*entry.etag))
		    .json(entry))
	        .unwrap_or_else(|| HttpResponse::NotFound().body("empty"))
	)

    }().await.map_err(map_handler_error)
}


/// put

pub async fn put(
    req: HttpRequest,
    path: ObjectPath,
    body: web::Bytes,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::error::Error> {

    ws_owner::workspace_owner(&req)?; // Check workspace

    let (workspace, key) = path.into_inner();

    async move || -> anyhow::Result<HttpResponse> {

        let mut conn = redis.lock().await;

	// TTL logic
	let mut ttl = None;
	if let Some(x) = req.headers().get("HULY-TTL") {
	    let s = x.to_str().map_err(|_| anyhow!("Invalid HULY-TTL header"))?;
	    let secs = s.parse::<usize>().map_err(|_| anyhow!("Invalid TTL value in HULY-TTL header"))?;
	    ttl = Some(Ttl::Sec(secs));
	} else if let Some(x) = req.headers().get("HULY-EXPIRE-AT") {
	    let s = x.to_str().map_err(|_| anyhow!("Invalid HULY-EXPIRE-AT header"))?;
	    let ts = s.parse::<u64>().map_err(|_| anyhow!("Invalid EXPIRE-AT value in HULY-EXPIRE-AT header"))?;
	    ttl = Some(Ttl::At(ts));
	}

	// MODE logic
	let mut mode = Some(SaveMode::Upsert);
	if let Some(h) = req.headers().get("If-Match") { // `If-Match: *` - update only if the key exists
	    let s = h.to_str().map_err(|_| anyhow!("Invalid If-Match header"))?;
	    if s == "*" { mode = Some(SaveMode::Update); } // `If-Match: *` — update only if exist
	    else { mode = Some(SaveMode::Equal(s.to_string())); } // `If-Match: <md5>` — update only if current
	} else if let Some(h) = req.headers().get("If-None-Match") { // `If-None-Match: *` — insert only if does not exist
	    let s = h.to_str().map_err(|_| anyhow!("Invalid If-None-Match header"))?;
	    if s == "*" { mode = Some(SaveMode::Insert); } else { return Err(anyhow!("If-None-Match must be '*'")); }
	}

        redis_save(&mut *conn, &workspace, &key, &body[..], ttl, mode).await?;
	return Ok(HttpResponse::Ok().body("DONE"));

    }().await.map_err(map_handler_error)
}



// delete

pub async fn delete(
    req: HttpRequest,
    path: ObjectPath,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::error::Error> {

    ws_owner::workspace_owner(&req)?; // Check workspace

    let (workspace, key) = path.into_inner();
    trace!(workspace, key, "delete request");

    async move || -> anyhow::Result<HttpResponse> {
        let mut conn = redis.lock().await;

        let deleted = redis_delete(&mut *conn, &workspace, &key).await?;

        let response = match deleted {
            true => HttpResponse::NoContent().finish(),
            false => HttpResponse::NotFound().body("not found"),
        };

        Ok(response)
    }().await.map_err(map_handler_error)
}

