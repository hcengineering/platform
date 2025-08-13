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

#![allow(unused_imports)]

use std::pin::Pin;

use actix_cors::Cors;

use actix_web::{
    App, Error, HttpMessage, HttpRequest, HttpResponse, HttpServer,
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    middleware::{self, Next},
    web::{self, Data, PayloadConfig},
};

use actix_web_actors::ws;

use tracing::info;

mod config;
mod handlers_http;
mod handlers_ws;
use crate::handlers_ws::{WsSession, handler};

mod redis;
use crate::redis::redis_connect;
// use ::redis::cmd as redis_cmd; // redis_cmd для GET в таске

mod workspace_owner;

// == =hub ===
// mod redis_events;
mod ws_hub;
use actix::prelude::*;
use crate::ws_hub::{WsHub, Broadcast, Count, ServerMessage, Join, Leave};
// === /hub ===


use config::CONFIG;

use hulyrs::services::jwt::actix::ServiceRequestExt;
use secrecy::SecretString;

fn initialize_tracing(level: tracing::Level) {
    use tracing_subscriber::{filter::targets::Targets, prelude::*};

    let filter = Targets::default()
        .with_target(env!("CARGO_BIN_NAME"), level)
        .with_target("actix", level);
    let format = tracing_subscriber::fmt::layer().compact();

    tracing_subscriber::registry()
        .with(filter)
        .with(format)
        .init();
}

// #[allow(dead_code)]
async fn interceptor(
    request: ServiceRequest,
    next: Next<impl MessageBody>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    let secret = SecretString::new(CONFIG.token_secret.clone().into_boxed_str());

    let claims = request.extract_claims(&secret)?;

    request.extensions_mut().insert(claims.to_owned());

    next.call(request).await
}


// #[tokio::main]
#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing(tracing::Level::DEBUG);

    tracing::info!("{}/{}", env!("CARGO_BIN_NAME"), env!("CARGO_PKG_VERSION"));

    let redis = redis_connect().await?;
    let redis = std::sync::Arc::new(tokio::sync::Mutex::new(redis));
    let redis_data = web::Data::new(redis.clone());


// ======================================

let hub_addr = WsHub::default().start();                // NEW
let hub_data = web::Data::new(hub_addr.clone());        // NEW

// let hub_addr: Addr<WsHub> = WsHub::default().start();
// let hub_data: web::Data<Addr<WsHub>> = web::Data::new(hub_addr.clone());

/*
// === HUB: общий реестр WS-подключений ===


// === Redis Pub/Sub listener (отдельное соединение) ===
let mut pubsub_conn = redis_connect().await?;           // NEW: отдельный коннект только для Pub/Sub
// (опционально) пробуем включить нотификации
let _ = crate::redis_events::try_enable_keyspace_notifications(&mut pubsub_conn).await; // можно игнорить ошибку
let (mut rx, _handle) = crate::redis_events::start_keyevent_listener(pubsub_conn);      // NEW
// поток, который читает события из Redis и шлёт их всем WS
{
    let hub_for_task = hub_addr.clone();
    let redis_for_task = redis.clone();
    tokio::spawn(async move {
        use crate::redis_events::RedisEventKind;
        while let Some(ev) = rx.recv().await {
            let payload_json = match ev.kind {
                RedisEventKind::Set => {
                    let mut conn = redis_for_task.lock().await;
                    let val: Option<String> = redis_cmd("GET")
                        .arg(&ev.key)
                        .query_async(&mut *conn)
                        .await
                        .ok()
                        .flatten();
                    serde_json::json!({
                        "type": "redis",
                        "event": "set",
                        "key": ev.key,
                        "value": val
                    })
                }
                RedisEventKind::Del => serde_json::json!({
                    "type": "redis",
                    "event": "del",
                    "key": ev.key
                }),
                RedisEventKind::Expired => serde_json::json!({
                    "type": "redis",
                    "event": "expired",
                    "key": ev.key
                }),
            };
            hub_for_task.do_send(Broadcast { text: payload_json.to_string() });
        }
    });
}

*/

// ============================================


    let socket = std::net::SocketAddr::new(CONFIG.bind_host.as_str().parse()?, CONFIG.bind_port);
    let payload_config = PayloadConfig::new(CONFIG.payload_size_limit.bytes() as usize);

    let server = HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);

        App::new()
            .app_data(payload_config.clone())
            .app_data(redis_data.clone())
	    .app_data(hub_data.clone()) // ← ЭТО ОБЯЗАТЕЛЬНО

            .wrap(middleware::Logger::default())
            .wrap(cors)
            .service(
                web::scope("/api")
                    .wrap(middleware::from_fn(interceptor))
            	    .route("/{key:.+/}", web::get().to(handlers_http::list))
                    .route("/{key:.+}", web::get().to(handlers_http::get))
		    .route("/{key:.+}", web::put().to(handlers_http::put))
                    .route("/{key:.+}", web::delete().to(handlers_http::delete))
            )
            .route("/status", web::get().to(async || "ok"))

            .route("/stat", web::get().to(|hub: web::Data<Addr<WsHub>>| async move {
	            // let count = hub.send(Count).await.unwrap_or(0);
		    let count = hub.send(crate::ws_hub::Count).await.unwrap_or(0);
	            HttpResponse::Ok().json(serde_json::json!({
	                "status": "ok",
	                "connections": count
	            }))
	    }))

 	    .route("/ws", web::get().to(handlers_ws::handler)) // WebSocket
    })
    .bind(socket)?
    .run();

    server.await?;

    Ok(())
}
