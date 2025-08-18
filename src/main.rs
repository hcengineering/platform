use std::net::SocketAddr;

use actix_cors::Cors;
use actix_web::{
    App, Error, HttpMessage, HttpServer,
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    middleware::{Next, from_fn},
    web::{Data, Path, delete, get, post, put, scope},
};
use tracing::*;
use tracing_actix_web::TracingLogger;
use uuid::Uuid;

use hulyrs::services::jwt::actix::ServiceRequestExt;

mod config;
mod handlers;
mod postgres;
mod s3;

use config::CONFIG;

fn initialize_tracing() {
    use tracing_subscriber::{filter::targets::Targets, prelude::*};

    let filter = Targets::default()
        .with_target(env!("CARGO_BIN_NAME"), config::hulyrs::CONFIG.log)
        .with_target("actix", Level::WARN);
    let format = tracing_subscriber::fmt::layer().compact();

    tracing_subscriber::registry()
        .with(filter)
        .with(format)
        .init();
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing();

    tracing::info!(
        "{}/{} started",
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION")
    );

    let s3 = s3::client().await;
    let postgres = postgres::pool().await?;

    let bind_to = SocketAddr::new(CONFIG.bind_host.as_str().parse()?, CONFIG.bind_port);

    async fn auth(
        mut request: ServiceRequest,
        next: Next<impl MessageBody>,
    ) -> Result<ServiceResponse<impl MessageBody>, Error> {
        let claims = request
            .extract_claims(&CONFIG.token_secret)
            .map_err(|error| {
                warn!(%error, "Unauthorized request");
                error
            })?;

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

    let server = HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);

        const KEY_PATH: &str = "/{key:.*}";

        App::new()
            .app_data(Data::new(postgres.clone()))
            .app_data(Data::new(s3.clone()))
            .wrap(TracingLogger::default())
            .wrap(cors)
            .service(
                scope("/api/{workspace}")
                    .wrap(from_fn(auth))
                    .route(KEY_PATH, get().to(handlers::get))
                    .route(KEY_PATH, put().to(handlers::put))
                    .route(KEY_PATH, post().to(handlers::post))
                    .route(KEY_PATH, delete().to(handlers::delete)),
            )
            .route("/status", get().to(async || "ok"))
    })
    .bind(bind_to)?
    .run();

    info!("http listener on {}", bind_to);

    server.await?;

    Ok(())
}

#[tokio::main]
async fn main_() -> anyhow::Result<()> {
    use crate::{postgres::Pool, s3};
    use aws_sdk_s3::{presigning::PresigningConfig, primitives::ByteStream};

    initialize_tracing();

    let expires_in: std::time::Duration = std::time::Duration::from_secs(600);
    let expires_in: aws_sdk_s3::presigning::PresigningConfig =
        PresigningConfig::expires_in(expires_in).unwrap();

    let s3 = s3::client().await;

    let presigned_request = s3
        .put_object()
        .set_bucket(Some("hulylake".into()))
        .set_key(Some("myobject".into()))
        .presigned(expires_in)
        .await
        .unwrap();

    let url = presigned_request.uri();

    debug!(?url, "presigned request");

    let client = reqwest::Client::new();
    let res = client.put(url).body("hello world").send().await.unwrap();

    debug!(?res, "response");
    debug!("body: {:?}", res.text().await.unwrap());

    Ok(())
}
