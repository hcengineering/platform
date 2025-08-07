use redis::aio::MultiplexedConnection;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;
use anyhow::anyhow;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{error, trace};
use uuid::Uuid;
use crate::ws_owner;

// type BucketPath = web::Path<(String)>;
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
    Error, HttpMessage, HttpRequest, HttpResponse, error,
    web::{self, Data, Json, Query},
};


/// list
// #[derive(Deserialize)]
// pub struct ListInfo { prefix: Option<String> }

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

    }()
    .await
    .map_err(|err| {
        tracing::error!(error = %err, "Internal error in GET handler");
        actix_web::error::ErrorInternalServerError("internal error")
    })

}
/*
    path: BucketPath,
    query: Query<ListInfo>,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<Json<ListResponse>, actix_web::error::Error> {

    ws_owner::workspace_owner(&req)?; // Check workspace

    let (workspace) = path.into_inner();
    trace!(workspace, prefix = ?query.prefix, "list request");

    // ...

    async move || -> anyhow::Result<Json<ListResponse>> {
        let connection = pool.get().await?;

        let response = if let Some(prefix) = &query.prefix {
            let pattern = format!("{}%", prefix);
            let statement = r#"
                select key from kvs where workspace=$1 and namespace=$2 and key like $3
            "#;

            connection
                .query(statement, &[&wsuuid, &nsstr, &pattern])
                .await?
        } else {
            let statement = r#"
                select key from kvs where workspace=$1 and namespace=$2
            "#;

            connection.query(statement, &[&wsuuid, &nsstr]).await?
        };

        let count = response.len();

        let keys = response.into_iter().map(|row| row.get(0)).collect();

        Ok(Json(ListResponse {
            keys,
            count,
            namespace: nsstr.to_owned(),
            workspace: wsstr.to_owned(),
        }))
    }()
    .await
    .map_err(|error| {
        error!(op = "list", workspace, namespace, ?error, "internal error");
        error::ErrorInternalServerError("")
    })
}
*/


/// get / (test)

pub async fn get(
    req: HttpRequest,
    path: ObjectPath,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, actix_web::error::Error> {

    ws_owner::workspace_owner(&req)?; // Check workspace

    let (workspace, key) = path.into_inner();
    //    println!("\nworkspace = {}", workspace);
    //    println!("key = {}\n", key);

    trace!(workspace, key, "get request");

    async move || -> anyhow::Result<HttpResponse> {

        let mut conn = redis.lock().await;

	Ok(
	    redis_read(&mut *conn, &workspace, &key).await?
    		.map(|entry| HttpResponse::Ok().json(entry))
	        .unwrap_or_else(|| HttpResponse::NotFound().body("empty"))
	)

    }()
    .await
    .map_err(|err| {
        tracing::error!(error = %err, "Internal error in GET handler");
        actix_web::error::ErrorInternalServerError("internal error")
    })
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

    trace!(workspace, key, "put request");

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
	    if s == "*" { mode = Some(SaveMode::Update); } else {
		// TODO: `If-Match: <md5>` — update only if current value's MD5 matches
	        return Err(anyhow!("TODO: Only '*' suported now"));
	    }
	} else if let Some(h) = req.headers().get("If-None-Match") { // `If-None-Match: *` — insert only if the key does not exist
	    let s = h.to_str().map_err(|_| anyhow!("Invalid If-None-Match header"))?;
	    if s == "*" { mode = Some(SaveMode::Insert); } else { return Err(anyhow!("If-None-Match must be '*'")); }
	}

        redis_save(&mut *conn, &workspace, &key, &body[..], ttl, mode).await?;
	return Ok(HttpResponse::Ok().body("DONE"));

    }()
    .await
    .map_err(|err| {
        tracing::error!(error = %err, "Internal error in GET handler");
        actix_web::error::ErrorInternalServerError("internal error")
    })
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

//    let wsuuid = Uuid::parse_str(workspace.as_str())
//        .map_err(|e| error::ErrorBadRequest(format!("Invalid UUID in workspace: {}", e)))?;

    async move || -> anyhow::Result<HttpResponse> {
        let mut conn = redis.lock().await;

        let deleted = redis_delete(&mut *conn, &workspace, &key).await?;

        let response = match deleted {
            true => HttpResponse::NoContent().finish(),
            false => HttpResponse::NotFound().body("not found"),
        };

        Ok(response)
    }()
    .await
    .map_err(|err| {
        tracing::error!(error = %err, "Internal error in DELETE handler");
        actix_web::error::ErrorInternalServerError("internal error")
    })
}
