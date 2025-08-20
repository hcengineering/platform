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

use actix::prelude::*;
use actix_cors::Cors;
use actix_web::{
    App, Error, HttpMessage, HttpResponse, HttpServer,
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    middleware::{self, Next},
    web::{self, Path, Query},
};
use hulyrs::services::jwt::{Claims, actix::ServiceRequestExt};
use secrecy::ExposeSecret;
use tracing::*;

mod config;
mod handlers_http;
mod handlers_ws;
mod redis_events;
mod redis_lib;
mod workspace_owner;
mod ws_hub;

use config::CONFIG;
use redis_lib::redis_connect;
use uuid::Uuid;
use ws_hub::{TestGetSubs, WsHub};

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

async fn extract_claims(
    mut request: ServiceRequest,
    next: Next<impl MessageBody>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    #[derive(serde::Deserialize)]
    struct QueryString {
        token: Option<String>,
    }

    let query = request.extract::<Query<QueryString>>().await?.into_inner();

    let claims = if let Some(token) = query.token {
        Claims::from_token(token, CONFIG.token_secret.expose_secret()).unwrap()
    } else {
        request.extract_claims(&CONFIG.token_secret)?
    };

    let workspace = Uuid::parse_str(&request.extract::<Path<String>>().await?);

    if claims.is_system() || Ok(claims.workspace.clone()) == workspace.clone().map(Some) {
        request.extensions_mut().insert(claims);
        next.call(request).await
    } else {
        warn!(
            expected = ?claims.workspace,
            actual = ?workspace,
            "Unauthorized request, workspace mismatch"
        );
        Err(actix_web::error::ErrorUnauthorized("Unauthorized").into())
    }
}

async fn check_workspace(
    mut request: ServiceRequest,
    next: Next<impl MessageBody>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    let workspace = Uuid::parse_str(&request.extract::<Path<String>>().await?);
    let claims = request.extensions().get::<Claims>().cloned().unwrap();

    if claims.is_system() || Ok(claims.workspace.clone()) == workspace.clone().map(Some) {
        next.call(request).await
    } else {
        warn!(
            expected = ?claims.workspace,
            actual = ?workspace,
            "Unauthorized request, workspace mismatch"
        );
        Err(actix_web::error::ErrorUnauthorized("Unauthorized").into())
    }
}

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

                hub.do_send(ev);
            }
        }
        Err(e) => eprintln!("[redis] pubsub init error: {e}"),
    }
}

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing(tracing::Level::DEBUG);

    tracing::info!("{}/{}", env!("CARGO_BIN_NAME"), env!("CARGO_PKG_VERSION"));

    let redis = redis_connect().await?;

    // starting Hub
    let hub = WsHub::new(redis.clone()).start();

    // starting Logger
    tokio::spawn(start_redis_logger(
        "redis://127.0.0.1/".to_string(),
        hub.clone(),
    ));

    let socket = std::net::SocketAddr::new(CONFIG.bind_host.as_str().parse()?, CONFIG.bind_port);

    let server = HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(redis.clone()))
            .app_data(web::Data::new(hub.clone()))
            .wrap(middleware::Logger::default())
            .wrap(cors)
            .service(
                web::scope("/api/{workspace}")
                    .wrap(middleware::from_fn(check_workspace))
                    .wrap(middleware::from_fn(extract_claims))
                    .route("/{key:.+/}", web::get().to(handlers_http::list))
                    .route("/{key:.+}", web::get().to(handlers_http::get))
                    .route("/{key:.+}", web::put().to(handlers_http::put))
                    .route("/{key:.+}", web::delete().to(handlers_http::delete)),
            )
            .route(
                "/ws",
                web::get()
                    .to(handlers_ws::handler)
                    .wrap(middleware::from_fn(extract_claims)),
            ) // WebSocket
            .route("/status", web::get().to(async || "ok"))
            //
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
    })
    .bind(socket)?
    .run();

    server.await?;

    Ok(())
}
