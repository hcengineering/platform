use std::{net::SocketAddr, sync::Arc};

use actix_cors::Cors;
use actix_web::{
    App, Error, HttpMessage, HttpServer,
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    middleware::{Next, from_fn},
    web::{self, Data, Path},
};
use tracing::*;
use tracing_actix_web::TracingLogger;
use uuid::Uuid;

use hulyrs::services::jwt::actix::ServiceRequestExt;
use hulyrs::services::otel;

mod blob;
mod compact;
mod conditional;
mod config;
mod handlers;
mod merge;
mod mutex;
mod patch;
mod postgres;
mod recovery;
mod s3;

use config::CONFIG;

use crate::mutex::KeyMutex;

fn initialize_tracing() {
    use opentelemetry::trace::TracerProvider;
    use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
    use tracing::Level;
    use tracing_opentelemetry::OpenTelemetryLayer;
    use tracing_subscriber::{filter::targets::Targets, prelude::*};

    let otel_config = otel::OtelConfig {
        mode: config::hulyrs::CONFIG.otel_mode.clone(),
        service_name: env!("CARGO_PKG_NAME").to_string(),
        service_version: env!("CARGO_PKG_VERSION").to_string(),
    };

    otel::init(&otel_config);

    let filter = Targets::default()
        .with_target(env!("CARGO_BIN_NAME"), config::hulyrs::CONFIG.log)
        .with_target("actix", Level::WARN);
    let format = tracing_subscriber::fmt::layer().compact();

    match &config::hulyrs::CONFIG.otel_mode {
        otel::OtelMode::Off => {
            tracing_subscriber::registry()
                .with(filter)
                .with(format)
                .init();
        }

        _ => {
            tracing_subscriber::registry()
                .with(filter)
                .with(format)
                .with(otel::tracer_provider(&otel_config).map(|provider| {
                    let filter = Targets::default()
                        .with_default(Level::DEBUG)
                        .with_target(env!("CARGO_PKG_NAME"), config::hulyrs::CONFIG.log);

                    OpenTelemetryLayer::new(provider.tracer("hulylake")).with_filter(filter)
                }))
                .with(otel::logger_provider(&otel_config).as_ref().map(|logger| {
                    let filter = Targets::default()
                        .with_default(Level::DEBUG)
                        .with_target(env!("CARGO_PKG_NAME"), Level::DEBUG);

                    OpenTelemetryTracingBridge::new(logger).with_filter(filter)
                }))
                .init();
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    initialize_tracing();

    tracing::info!(
        "{}/{} started",
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION")
    );

    tracing::debug!(
        db_connection = &CONFIG.db_connection,
        db_scheme = &CONFIG.db_scheme,
        s3_bucket = &CONFIG.s3_bucket,
        "configuration"
    );

    let lock = mutex::KeyMutex::new();
    let postgres = postgres::pool().await?;
    let s3 = s3::client().await;

    match s3.head_bucket().bucket(&CONFIG.s3_bucket).send().await {
        Ok(_) => info!(bucket = &CONFIG.s3_bucket, "s3 bucket exists and available"),
        Err(_) => {
            s3.create_bucket().bucket(&CONFIG.s3_bucket).send().await?;
            info!(bucket = &CONFIG.s3_bucket, "s3 bucket created");
        }
    }

    let bind_to = SocketAddr::new(CONFIG.bind_host.as_str().parse()?, CONFIG.bind_port);

    #[allow(dead_code)]
    async fn auth(
        mut request: ServiceRequest,
        next: Next<impl MessageBody>,
    ) -> Result<ServiceResponse<impl MessageBody>, Error> {
        let claims = request
            .extract_claims(&CONFIG.token_secret)
            .map_err(|error| {
                let method = request.method();
                let path = request.path();
                warn!(%method, path, %error, "Unauthorized request");
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

    async fn mutex(
        mut request: ServiceRequest,
        next: Next<impl MessageBody>,
    ) -> Result<ServiceResponse<impl MessageBody>, Error> {
        let path = request
            .extract::<Path<handlers::ObjectPath>>()
            .await?
            .into_inner();

        let mutex = request.app_data::<Data<KeyMutex>>().unwrap().to_owned();

        let _guard = mutex.lock(path.workspace, path.key).await;

        next.call(request).await
    }

    let compactor = compact::CompactWorker::new(
        Arc::new(s3.clone()),
        postgres.clone(),
        lock.clone(),
        CONFIG.compact_buffer_size,
    );
    let compactor_handle = compactor.clone();

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
            .app_data(Data::new(lock.clone()))
            .app_data(Data::new(compactor.clone()))
            .wrap(TracingLogger::default())
            .wrap(cors)
            .service(
                web::scope("/api/{workspace}")
                    .wrap(from_fn(auth))
                    .route(KEY_PATH, web::head().to(handlers::head))
                    .route(KEY_PATH, web::get().to(handlers::get))
                    .route(KEY_PATH, web::put().to(handlers::put).wrap(from_fn(mutex)))
                    .route(
                        KEY_PATH,
                        web::patch().to(handlers::patch).wrap(from_fn(mutex)),
                    )
                    .route(KEY_PATH, web::delete().to(handlers::delete)),
            )
            .route("/status", web::get().to(async || "ok"))
    })
    .bind(bind_to)?
    .run();

    info!("http listener on {}", bind_to);

    server.await?;
    compactor_handle.stop().await;

    Ok(())
}
