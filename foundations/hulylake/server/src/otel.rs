use derive_builder::Builder;
use opentelemetry::{KeyValue, global};
use opentelemetry_sdk::{
    Resource, logs::SdkLoggerProvider, metrics::SdkMeterProvider, trace::SdkTracerProvider,
};
use serde::Deserialize;

#[derive(Deserialize, Debug, Default, Clone)]
#[serde(rename_all = "lowercase")]
pub enum OtelMode {
    On,
    Stdout,
    #[default]
    Off,
}

#[derive(Deserialize, Debug, Builder, Clone)]
#[serde(rename_all = "lowercase")]
pub struct OtelConfig {
    pub mode: OtelMode,
    pub service_name: String,
    pub service_version: String,
}

fn resource(config: &OtelConfig) -> Resource {
    Resource::builder()
        .with_service_name(config.service_name.clone())
        .with_attribute(KeyValue::new(
            "service.version",
            config.service_version.clone(),
        ))
        .build()
}

pub fn init(config: &OtelConfig) {
    let resource = resource(config);

    match config.mode {
        OtelMode::On => {
            global::set_meter_provider(
                SdkMeterProvider::builder()
                    .with_periodic_exporter(
                        opentelemetry_otlp::MetricExporter::builder()
                            .with_http()
                            .build()
                            .unwrap(),
                    )
                    .with_resource(resource.clone())
                    .build(),
            );
        }
        OtelMode::Stdout => {
            global::set_meter_provider(
                SdkMeterProvider::builder()
                    .with_periodic_exporter(
                        opentelemetry_stdout::MetricExporterBuilder::default().build(),
                    )
                    .with_resource(resource.clone())
                    .build(),
            );
        }
        OtelMode::Off => {
            global::set_meter_provider(
                SdkMeterProvider::builder()
                    .with_resource(resource.clone())
                    .build(),
            );
        }
    }
}

pub fn tracer_provider(config: &OtelConfig) -> Option<SdkTracerProvider> {
    let resource = resource(config);

    match config.mode {
        OtelMode::On => Some(
            SdkTracerProvider::builder()
                .with_batch_exporter(
                    opentelemetry_otlp::SpanExporter::builder()
                        .with_http()
                        .build()
                        .unwrap(),
                )
                .with_resource(resource.clone())
                .build(),
        ),
        OtelMode::Stdout => Some(
            SdkTracerProvider::builder()
                .with_batch_exporter(opentelemetry_stdout::SpanExporter::default())
                .with_resource(resource.clone())
                .build(),
        ),
        OtelMode::Off => None,
    }
}

pub fn logger_provider(config: &OtelConfig) -> Option<SdkLoggerProvider> {
    let resource = resource(config);

    match config.mode {
        OtelMode::On => Some(
            SdkLoggerProvider::builder()
                .with_batch_exporter(
                    opentelemetry_otlp::LogExporterBuilder::default()
                        .with_http()
                        .build()
                        .unwrap(),
                )
                .with_resource(resource.clone())
                .build(),
        ),

        OtelMode::Stdout => Some(
            SdkLoggerProvider::builder()
                .with_batch_exporter(opentelemetry_stdout::LogExporter::default())
                .with_resource(resource.clone())
                .build(),
        ),

        OtelMode::Off => None,
    }
}
