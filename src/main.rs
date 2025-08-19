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
    error::ErrorBadRequest,
    http::header::{AUTHORIZATION, HeaderValue},
    middleware::{self, Next},
    web::{self, Data, PayloadConfig},
};

use url::form_urlencoded;

use actix_web_actors::ws;

use tracing::info;

mod config;
mod handlers_http;
mod handlers_ws;
use crate::handlers_ws::{WsSession, handler};

mod redis_lib;
use crate::redis_lib::redis_connect;

mod workspace_owner;

mod redis_events;
mod ws_hub;
use crate::ws_hub::{ServerMessage, TestGetSubs, WsHub};
use actix::prelude::*;

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

async fn interceptor(
    mut request: ServiceRequest,
    next: Next<impl MessageBody>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    // Authorization/token patch
    if request.headers().get(AUTHORIZATION).is_none() {
        if let Some(qs) = request.uri().query() {
            if let Some(token) = form_urlencoded::parse(qs.as_bytes())
                .find(|(k, _)| k == "token")
                .map(|(_, v)| v.into_owned())
            {
                let auth_value = HeaderValue::from_str(&format!("Bearer {}", token))
                    .map_err(|_| ErrorBadRequest("Malformed token"))?;
                request.headers_mut().insert(AUTHORIZATION, auth_value);
            }
        }
    }

    let secret = SecretString::new(CONFIG.token_secret.clone().into_boxed_str());
    let claims = request.extract_claims(&secret)?;

    request.extensions_mut().insert(claims.to_owned());

    next.call(request).await
}

use crate::redis_events::RedisEventAction::*; // Set, Del, Unlink, Expired, Other

pub async fn start_redis_logger(redis_url: String, hub: Addr<WsHub>) {
    let client = match redis::Client::open(redis_url) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[redis] bad url: {e}");
            return;
        }
    };

    match crate::redis_events::make_pubsub_with_kea(&client).await {
        Ok(pubsub) => {
            let (mut rx, _handle) = crate::redis_events::start_keyevent_listener(pubsub);
            while let Some(ev) = rx.recv().await {
                /*
                        match ev.action {
                            Set           => println!("[redis] db{} SET {}", ev.db, ev.key),
                            Del | Unlink  => println!("[redis] db{} DEL {}", ev.db, ev.key),
                            Expired       => println!("[redis] db{} EXPIRED {}", ev.db, ev.key),
                            Other(ref k)  => println!("[redis] db{} {} {}", ev.db, k, ev.key),
                        }
                */

                hub.do_send(ev.clone());
            }
        }
        Err(e) => eprintln!("[redis] pubsub init error: {e}"),
    }
}

// #[tokio::main]
#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing(tracing::Level::DEBUG);

    tracing::info!("{}/{}", env!("CARGO_BIN_NAME"), env!("CARGO_PKG_VERSION"));

    let redis = redis_connect().await?;
    let redis = std::sync::Arc::new(tokio::sync::Mutex::new(redis));
    let redis_data = web::Data::new(redis.clone());

    // starting Hub
    let hub = WsHub::new(redis.clone()).start();

    let hub_data = web::Data::new(hub.clone());
    // starting Logger
    tokio::spawn(start_redis_logger(
        "redis://127.0.0.1/".to_string(),
        hub.clone(),
    ));

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
            .app_data(hub_data.clone())
            .wrap(middleware::Logger::default())
            .wrap(cors)
            .service(
                web::scope("/api")
                    .wrap(middleware::from_fn(interceptor))
                    .route("/{key:.+/}", web::get().to(handlers_http::list))
                    .route("/{key:.+}", web::get().to(handlers_http::get))
                    .route("/{key:.+}", web::put().to(handlers_http::put))
                    .route("/{key:.+}", web::delete().to(handlers_http::delete)),
            )
            .route("/status", web::get().to(async || "ok"))
            .route(
                "/stat2",
                web::get().to(|hub: web::Data<Addr<WsHub>>| async move {
                    let count = hub.send(crate::ws_hub::Count).await.unwrap_or(0);
                    HttpResponse::Ok().json(serde_json::json!({ "connections": count }))
                }),
            )
            .route(
                "/subs",
                web::get().to(|hub: web::Data<Addr<WsHub>>| async move {
                    match hub.send(TestGetSubs).await {
                        Ok(subs) => HttpResponse::Ok().json(subs),
                        Err(_) => {
                            HttpResponse::InternalServerError().body("Failed to get subscriptions")
                        }
                    }
                }),
            )
            .route("/ws", web::get().to(handlers_ws::handler)) // WebSocket
    })
    .bind(socket)?
    .run();

    server.await?;

    Ok(())
}
