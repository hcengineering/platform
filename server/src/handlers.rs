use std::{collections::HashMap, fmt::Display, str::FromStr, sync::Arc};

use actix_web::{
    HttpRequest, HttpResponse,
    body::SizedStream,
    dev::ServiceRequest,
    http::{
        self,
        header::{self, ContentLength, ContentType},
    },
    web::{Data, Header, Path, Payload},
};
use aws_sdk_s3::error::SdkError;
use bytes::Bytes;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use size::Size;
use tracing::*;
use uuid::Uuid;

use crate::merge::MergeStrategy;
use crate::s3::S3Client;
use crate::{blob, merge};
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
                tracing::error!(error=?self, "Internal error in http handler");
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

fn random_etag() -> String {
    ksuid::Ksuid::generate().to_base62()
}

#[derive(Debug, Clone)]
pub struct Headers {
    pub content_length: Size,
    pub content_type: Option<String>,
    pub merge_strategy: MergeStrategy,
    pub huly_headers: Vec<(String, String)>,
    pub meta: Vec<(String, String)>,
}

async fn extract_headers(request: &mut ServiceRequest) -> HandlerResult<Headers> {
    let content_length = request
        .extract::<Header<ContentLength>>()
        .await
        .map(|header| Size::from_bytes(*header.0))
        .map_err(|_| actix_web::error::ErrorBadRequest("invalid content length"))?;

    let content_type = request
        .extract::<Header<ContentType>>()
        .await
        .map(|header| header.0.to_string())
        .ok();

    let merge_strategy = request
        .headers()
        .get("Huly-Merge-Strategy")
        .and_then(|v| v.to_str().ok())
        .map(|v| {
            MergeStrategy::from_str(v).map_err(|_| {
                actix_web::error::ErrorBadRequest(format!("invalid merge strategy: {v}"))
            })
        })
        .transpose()?
        .unwrap_or(MergeStrategy::Concatenate);

    let mut huly_headers = Vec::new();
    for (key, value) in request.headers().iter() {
        if let Some(header) = key.as_str().strip_prefix("huly-header-") {
            if let Ok(value) = value.to_str() {
                huly_headers.push((header.to_owned(), value.to_owned()));
            }
        }
    }
    if let Some(content_type) = &content_type {
        huly_headers.push((
            http::header::CONTENT_TYPE.as_str().to_owned(),
            content_type.to_owned(),
        ));
    }

    let mut meta = Vec::new();
    for (key, value) in request.headers().iter() {
        if let Some(header) = key.as_str().strip_prefix("huly-meta-") {
            if let Ok(value) = value.to_str() {
                meta.push((header.to_owned(), value.to_owned()));
            }
        }
    }

    meta.push((
        "merge-strategy".to_owned(),
        serde_json::to_string(&merge_strategy).unwrap(),
    ));

    Ok(Headers {
        content_length,
        content_type,
        merge_strategy,
        huly_headers,
        meta,
    })
}

#[derive(Serialize, Deserialize, Debug)]
struct PartData {
    workspace: Uuid,
    key: String,
    part: u32,
    size: usize,
    blob: String,
    etag: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    headers: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    meta: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    merge_strategy: Option<MergeStrategy>,
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn put(request: HttpRequest, payload: Payload) -> HandlerResult<HttpResponse> {
    debug!("put request");

    let span = Span::current();

    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();

    let headers = extract_headers(&mut request).await?;

    merge::validate_put_request(&headers)?;

    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    let uploaded = blob::upload(&s3, &pool, headers.content_length, payload).await?;

    merge::validate_put_body(&headers, &uploaded)?;

    let part_data = PartData {
        workspace: path.workspace,
        key: path.key,
        part: 0,
        blob: uploaded.s3_key,
        size: uploaded.length,
        etag: random_etag(),

        headers: Some(headers.huly_headers.clone().into_iter().collect()),
        meta: Some(headers.meta.into_iter().collect()),
        merge_strategy: Some(headers.merge_strategy),
    };

    let inline = uploaded.inline.and_then(|inline| {
        if inline.len() < CONFIG.inline_threshold.bytes() as usize {
            Some(inline)
        } else {
            None
        }
    });

    postgres::set_part(&pool, path.workspace, &part_data.key, inline, &part_data).await?;

    let mut response = HttpResponse::Created();
    response.insert_header((header::ETAG, part_data.etag));

    if uploaded.deduplicated {
        response.insert_header(("Huly-Deduplicated", "true"));
    } else {
        if let Some(parts_count) = uploaded.parts_count {
            response.insert_header(("Huly-S3-Parts-Count", parts_count.to_string()));
        }
    }

    for (key, value) in headers.huly_headers {
        response.insert_header((key.as_str(), value.to_owned()));
    }

    Ok(response.finish())
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn patch(request: HttpRequest, payload: Payload) -> HandlerResult<HttpResponse> {
    let span = Span::current();

    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();
    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    let headers = extract_headers(&mut request).await?;

    let uploaded = blob::upload(&s3, &pool, headers.content_length, payload).await?;

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
        size: uploaded.length,
        etag: random_etag(),

        // defined in the first part
        headers: None,
        meta: None,
        merge_strategy: None,
    };

    let mut response = if parts.is_empty() {
        HttpResponse::NotFound()
    } else {
        // append
        postgres::append_part(
            &pool,
            path.workspace,
            &part_data.key,
            part_data.part,
            uploaded.inline,
            &part_data,
        )
        .await?;

        let mut response = HttpResponse::Created();
        response.insert_header((header::ETAG, part_data.etag));

        response
    };

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
        parts: Vec<postgres::ObjectPart<PartData>>,
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
                        match s3.get_object().bucket(&CONFIG.s3_bucket).key(parts.data.blob).send().await {
                            Ok(mut response) => {
                                while let Some(bytes) = response.body.next().await {
                                    yield Ok(bytes?);
                                }
                            },
                            Err(error) => {
                                yield Err(std::io::Error::new(std::io::ErrorKind::Other, error));
                                break;
                            }
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

        response.body(SizedStream::new(content_length as u64, stream(parts, s3)))
    } else {
        HttpResponse::NotFound().finish()
    };

    Ok(response)
}

pub async fn delete(_path: Path<ObjectPath>) -> HandlerResult<HttpResponse> {
    unimplemented!("delete is not implemented")
}
