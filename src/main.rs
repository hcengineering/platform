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
mod redis;
mod workspace_owner;
mod ws_hub;

use config::CONFIG;
use uuid::Uuid;
use ws_hub::{TestGetSubs, WsHub};

fn initialize_tracing(level: tracing::Level) {
    use tracing_subscriber::{filter::targets::Targets, prelude::*};

    let filter = Targets::default()
        .with_target(env!("CARGO_BIN_NAME"), level)
        .with_target("actix", tracing::Level::WARN);
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

    request.extensions_mut().insert(claims);
    next.call(request).await
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

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing(tracing::Level::TRACE);

    tracing::info!("{}/{}", env!("CARGO_BIN_NAME"), env!("CARGO_PKG_VERSION"));

    let redis_client = redis::client().await?;
    let redis_connection = redis_client.get_multiplexed_async_connection().await?;

    // starting Hub
    let hub = WsHub::new(redis_connection.clone()).start();

    // starting Logger
    tokio::spawn(redis::receiver(redis_client));

    let socket = std::net::SocketAddr::new(CONFIG.bind_host.as_str().parse()?, CONFIG.bind_port);

    let server = HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(redis_connection.clone()))
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
