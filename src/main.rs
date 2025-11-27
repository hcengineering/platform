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

use actix_cors::Cors;
use actix_web::{
    App, HttpResponse, HttpServer,
    middleware::{self},
    web::{self},
};

#[cfg(feature = "auth")]
use actix_web::{
    Error, HttpMessage,
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    middleware::Next,
    web::{Path, Query},
};

#[cfg(feature = "auth")]
use hulyrs::services::jwt::{Claims, actix::ServiceRequestExt};

#[cfg(feature = "auth")]
use secrecy::ExposeSecret;

#[cfg(feature = "auth")]
use tracing::*;

#[cfg(feature = "auth")]
use uuid::Uuid;

mod config;
mod handlers_http;
mod handlers_ws;

#[cfg(feature = "db-redis")]
mod redis;

#[cfg(feature = "auth")]
mod workspace_owner;

mod hub_service;
use hub_service::HubState;

use config::CONFIG;

mod db;
use crate::db::Db;

#[cfg(not(feature = "db-redis"))]
mod memory;
#[cfg(not(feature = "db-redis"))]
use crate::memory::MemoryBackend;

use crate::hub_service::check_heartbeat;

#[cfg(feature = "db-redis")]
pub const BACKEND: &str = "REDIS";
#[cfg(not(feature = "db-redis"))]
pub const BACKEND: &str = "MEMORY";

fn initialize_tracing(level: tracing::Level) {
    use tracing_subscriber::{filter::targets::Targets, prelude::*};

    let filter = Targets::default()
        .with_target(env!("CARGO_BIN_NAME"), level)
        .with_target("actix", tracing::Level::WARN);

    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().compact())
        .init();
}

#[cfg(feature = "auth")]
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
    request.extensions_mut().insert(claims);

    next.call(request).await
}

#[cfg(feature = "auth")]
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

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing(match CONFIG.loglevel.as_str() {
        "TRACE" => tracing::Level::TRACE, // full
        "DEBUG" => tracing::Level::DEBUG, // for developer
        "INFO" => tracing::Level::INFO,   // normal
        "WARN" => tracing::Level::WARN,   // something went wrong
        "ERROR" => tracing::Level::ERROR, // serious error
        _ => tracing::Level::ERROR,
    });

    tracing::info!("{}/{}", env!("CARGO_BIN_NAME"), env!("CARGO_PKG_VERSION"));

    // starting HubService
    let hub_state = Arc::new(RwLock::new(HubState::default()));

    // starting heartbeat checker
    check_heartbeat(hub_state.clone());

    let db_backend = {
        #[cfg(feature = "db-redis")]
        {
            let redis_client = redis::client().await?;
            let db_connection = redis_client
                .get_multiplexed_async_connection()
                .await
                .map_err(|e| {
                    tracing::error!(
                        "REDIS not found: {:?}",
                        &CONFIG
                            .redis_urls
                            .iter()
                            .map(|u| u.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    );
                    e
                })?;
            tokio::spawn(crate::redis::receiver(redis_client, hub_state.clone()));
            Db::new_db(db_connection)
        }

        #[cfg(not(feature = "db-redis"))]
        {
            let db_connection = MemoryBackend::new();
            db_connection.spawn_ticker(hub_state.clone());
            Db::new_db(db_connection, hub_state.clone())
        }
    };

    tracing::info!("DB mode: {}", BACKEND);

    let socket = std::net::SocketAddr::new(CONFIG.bind_host.as_str().parse()?, CONFIG.bind_port);

    let url = format!("http://{}:{}", &CONFIG.bind_host, &CONFIG.bind_port);
    tracing::info!("Server running at {}", &url);
    tracing::info!("API: {}/api", &url);
    tracing::info!(
        "WS: {}/ws",
        format!("ws://{}:{}", &CONFIG.bind_host, &CONFIG.bind_port)
    );
    tracing::info!("Status: {}/status", &url);

    use std::sync::Arc;
    use tokio::sync::RwLock;

    let server = HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);

        let api_scope = {
            #[cfg(feature = "auth")]
            {
                web::scope("/api/{workspace}")
                    .wrap(middleware::from_fn(check_workspace))
                    .wrap(middleware::from_fn(extract_claims))
                    .route("/{key:.+/}", web::get().to(handlers_http::list))
                    .route("/{key:.+}", web::get().to(handlers_http::get))
                    .route("/{key:.+}", web::put().to(handlers_http::put))
                    .route("/{key:.+}", web::delete().to(handlers_http::delete))
            }

            #[cfg(not(feature = "auth"))]
            {
                web::scope("/api/{workspace}")
                    .route("/{key:.+/}", web::get().to(handlers_http::list))
                    .route("/{key:.+}", web::get().to(handlers_http::get))
                    .route("/{key:.+}", web::put().to(handlers_http::put))
                    .route("/{key:.+}", web::delete().to(handlers_http::delete))
            }
        };

        let ws_route = {
            let r = web::get().to(handlers_ws::handler);

            #[cfg(feature = "auth")]
            let r = r.wrap(middleware::from_fn(extract_claims));

            r
        };

        App::new()
            .app_data(web::Data::new(db_backend.clone()))
            .app_data(web::Data::new(hub_state.clone()))
            .wrap(middleware::Logger::default())
            .wrap(cors)
            .service(api_scope)
            .route("/ws", ws_route)
            .route(
                "/status",
                web::get().to({
                    move |hub_state: web::Data<Arc<RwLock<HubState>>>, db_backend: web::Data<Db>| {
                        let hub_state = hub_state.clone();
                        async move {
                            let info = hub_state.read().await.info_json(&db_backend).await;
                            Ok::<_, actix_web::Error>(HttpResponse::Ok().json(info))
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
