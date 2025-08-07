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

mod ws_owner;

use config::CONFIG;

use hulyrs::services::jwt::actix::ServiceRequestExt;
use secrecy::SecretString;

// pub type Pool = bb8::Pool<PostgresConnectionManager<tokio_postgres::NoTls>>;

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


#[tokio::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing(tracing::Level::DEBUG);

    tracing::info!("{}/{}", env!("CARGO_BIN_NAME"), env!("CARGO_PKG_VERSION"));

    let redis = redis_connect().await?;
    let redis = std::sync::Arc::new(tokio::sync::Mutex::new(redis));
    let redis_data = web::Data::new(redis.clone());

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
            .wrap(middleware::Logger::default())
            .wrap(cors)
            .service(
                web::scope("/api")
                    .wrap(middleware::from_fn(interceptor))
                    .route("/{workspace}", web::get().to(handlers_http::list))
                    .route("/{workspace}/{key:.*}",web::get().to(handlers_http::get))
		    .route("/{workspace}/{key:.*}",web::put().to(handlers_http::put))
                    .route("/{workspace}/{key:.*}",web::delete().to(handlers_http::delete))
            )
            .route("/status", web::get().to(async || "ok"))
	    .route("/ws/{workspace}", web::get().to(handlers_ws::handler)) // WebSocket
    })
    .bind(socket)?
    .run();

    server.await?;

    Ok(())
}
