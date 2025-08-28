use std::{collections::HashMap, fmt::Display, sync::Arc};

use actix_web::{
    HttpRequest, HttpResponse,
    body::SizedStream,
    dev::ServiceRequest,
    http::{
        self,
        header::{self, ContentType},
    },
    web::{Data, Header, Path, Payload},
};
use aws_sdk_s3::error::SdkError;
use bytes::Bytes;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use tracing::*;
use uuid::Uuid;

use crate::blob::upload;
use crate::s3::S3Client;
use crate::{
    config::CONFIG,
    postgres::{self, Pool},
};

#[derive(Deserialize, Debug)]
pub struct ObjectPath {
    workspace: Uuid,
    key: String,
}

#[derive(thiserror::Error, Debug)]
pub enum ApiError {
    #[error("S3 Error: {0}")]
    S3(String),

    #[error(transparent)]
    ActixError(#[from] actix_web::error::Error),

    #[error(transparent)]
    ActixParseError(#[from] actix_web::error::ParseError),

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

pub type HandlerResult<T> = Result<T, ApiError>;

impl actix_web::error::ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        match self {
            ApiError::ActixError(error) => error.error_response(),

            _ => {
                tracing::error!(error=%self, "Internal error in http handler");
                HttpResponse::InternalServerError().body("Internal Server Error")
            }
        }
    }
}

impl<E: Display + std::error::Error + 'static, B: std::fmt::Debug> From<SdkError<E, B>>
    for ApiError
{
    fn from(error: SdkError<E, B>) -> Self {
        error.raw_response();

        ApiError::S3(format!("{} {:#?}", error, error.raw_response()))
    }
}

#[derive(Serialize, serde::Deserialize, Debug)]
struct PartData {
    workspace: Uuid,
    key: String,
    part: u32,
    size: u64,
    blob: String,
    etag: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    headers: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    meta: Option<HashMap<String, String>>,
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn put(request: HttpRequest, payload: Payload) -> HandlerResult<HttpResponse> {
    let span = Span::current();

    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();
    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    debug!("put request");

    let mut headers = Vec::new();
    for (key, value) in request.headers().iter() {
        if let Some(header) = key.as_str().strip_prefix("huly-header-") {
            if let Ok(value) = value.to_str() {
                headers.push((header.to_owned(), value.to_owned()));
            }
        }
    }

    let content_type = request
        .extract::<Header<header::ContentType>>()
        .await
        .unwrap_or(Header(ContentType::octet_stream()))
        .into_inner();
    headers.push((
        http::header::CONTENT_TYPE.as_str().to_owned(),
        content_type.to_string(),
    ));

    let mut meta = Vec::new();
    for (key, value) in request.headers().iter() {
        if let Some(header) = key.as_str().strip_prefix("huly-meta-") {
            if let Ok(value) = value.to_str() {
                meta.push((header.to_owned(), value.to_owned()));
            }
        }
    }

    let uploaded = upload(&s3, &pool, payload).await?;

    let part_data = PartData {
        workspace: path.workspace,
        key: path.key,
        part: 0,
        blob: uploaded.s3_key,
        size: uploaded.size,
        etag: ksuid::Ksuid::generate().to_base62(),
        headers: Some(headers.clone().into_iter().collect()),
        meta: Some(meta.into_iter().collect()),
    };

    postgres::set_part(&pool, path.workspace, &part_data.key, None, &part_data).await?;

    let mut response = HttpResponse::Created();
    response.insert_header((header::CONTENT_LOCATION, part_data.key));
    response.insert_header((header::ETAG, part_data.etag));

    for (key, value) in headers {
        response.insert_header((key.as_str(), value));
    }

    Ok(response.finish())
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn post(request: HttpRequest, payload: Payload) -> HandlerResult<HttpResponse> {
    let span = Span::current();

    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();
    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    let uploaded = upload(&s3, &pool, payload).await?;

    let parts = postgres::find_parts::<PartData>(&pool, path.workspace, &path.key).await?;

    let part = parts
        .iter()
        .map(|p| p.data.part)
        .reduce(u32::max)
        .map(|m| m + 1)
        .unwrap_or(0);

    let part_data = PartData {
        workspace: path.workspace,
        key: path.key,
        part,
        blob: uploaded.s3_key,
        size: uploaded.size,
        etag: ksuid::Ksuid::generate().to_base62(),
        headers: None,
        meta: None,
    };

    if parts.is_empty() {
        postgres::set_part(&pool, path.workspace, &part_data.key, None, &part_data).await?;
    } else {
        // append
        postgres::append_part(
            &pool,
            path.workspace,
            &part_data.key,
            part_data.part,
            None,
            &part_data,
        )
        .await?;
    }

    let mut response = HttpResponse::Created();
    response.insert_header((header::ETAG, part_data.etag));

    Ok(response.finish())
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn get(request: HttpRequest) -> HandlerResult<HttpResponse> {
    let span = Span::current();

    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();

    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request
        .app_data::<Data<S3Client>>()
        .unwrap()
        .to_owned()
        .into_inner();

    let parts = postgres::find_parts::<PartData>(&pool, path.workspace, &path.key).await?;

    fn stream(
        parts: Vec<postgres::Object<PartData>>,
        s3: Arc<S3Client>,
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> {
        use async_stream::stream;

        stream! {
            for parts in parts {
                match parts.inline {
                    Some(inline) => {
                        yield Ok(Bytes::from(inline));
                    },
                    None => {
                        let mut response = s3.get_object().bucket(&CONFIG.s3_bucket).key(parts.data.blob).send().await.unwrap();

                        while let Some(bytes) = response.body.next().await {
                            yield Ok(bytes?);
                        }
                    }
                }
            }
        }
    }

    let response = if !parts.is_empty() {
        let mut content_length = 0;

        for part in parts.iter() {
            content_length += part.data.size;
        }

        let mut response = HttpResponse::Ok();

        let etag = parts.last().unwrap().data.etag.to_owned();

        response.insert_header((header::CONTENT_LENGTH, content_length));
        response.insert_header((header::ETAG, etag));

        let headers = parts[0].data.headers.as_ref();
        if let Some(headers) = headers {
            for (header, value) in headers.iter() {
                response.insert_header((header.as_str(), value.to_owned()));
            }
        }

        response.body(SizedStream::new(content_length, stream(parts, s3)))
    } else {
        HttpResponse::NotFound().finish()
    };

    Ok(response)
}

pub async fn delete(_path: Path<ObjectPath>) -> HandlerResult<HttpResponse> {
    unimplemented!("delete is not implemented")
}
