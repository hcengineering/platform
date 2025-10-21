use std::{collections::HashMap, fmt::Display, io, str::FromStr, time::SystemTime};

use actix_web::{
    HttpRequest, HttpResponse,
    body::SizedStream,
    dev::ServiceRequest,
    http::{
        self, StatusCode,
        header::{self, ContentLength, ContentType, EntityTag, HttpDate, Range},
    },
    web::{Data, Header, Path, Payload},
};
use aws_sdk_s3::error::SdkError;
use chrono::{DateTime, Utc};
use futures::{StreamExt, stream};
use serde::{Deserialize, Serialize};
use size::Size;
use tracing::*;
use uuid::Uuid;

use crate::s3::S3Client;
use crate::{
    blob,
    conditional::{ConditionalMatch, any_match, none_match},
    merge,
    postgres::ObjectPart,
};
use crate::{compact::CompactWorker, conditional};
use crate::{
    config::CONFIG,
    postgres::{self, Pool},
};
use crate::{merge::MergeStrategy, recovery};

#[derive(Deserialize, Debug)]
pub struct ObjectPath {
    pub workspace: Uuid,
    pub key: String,
}

#[derive(thiserror::Error, Debug)]
pub enum ApiError {
    #[error("S3 Error: {0}")]
    S3(String),

    #[error(transparent)]
    Db(#[from] postgres::DbError),

    #[error(transparent)]
    ActixError(#[from] actix_web::error::Error),

    #[error(transparent)]
    ActixParseError(#[from] actix_web::error::ParseError),

    #[error(transparent)]
    ConditionalError(#[from] conditional::ConditionalError),

    #[error("Precondition Failed")]
    PreconditionFailed,

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

pub type HandlerResult<T> = Result<T, ApiError>;

impl actix_web::error::ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        match self {
            ApiError::ActixError(error) => error.error_response(),

            ApiError::ConditionalError(_) => HttpResponse::BadRequest().body("Bad Request"),

            ApiError::PreconditionFailed => {
                HttpResponse::PreconditionFailed().body("Precondition Failed")
            }

            _ => {
                tracing::error!(error=?self, "Internal error in http handler");
                HttpResponse::InternalServerError().body("Internal Server Error")
            }
        }
    }
}

impl From<recovery::RecoveryError> for ApiError {
    fn from(error: recovery::RecoveryError) -> Self {
        match error {
            recovery::RecoveryError::S3(err) => ApiError::S3(err),
            recovery::RecoveryError::PreconditionFailed => ApiError::PreconditionFailed,
            recovery::RecoveryError::Other(err) => ApiError::Other(err),
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
    pub huly_headers: Vec<(String, String)>,
    pub meta: Vec<(String, String)>,
}

async fn extract_headers(request: &mut ServiceRequest) -> HandlerResult<(Headers, MergeStrategy)> {
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
        .unwrap_or_default();

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

    Ok((
        Headers {
            content_length,
            content_type,
            huly_headers,
            meta,
        },
        merge_strategy,
    ))
}

async fn extract_range_header(request: &mut ServiceRequest) -> Option<String> {
    request
        .extract::<Header<Range>>()
        .await
        .map(|header| header.0.to_string())
        .ok()
}
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PartData {
    pub workspace: Uuid,
    pub key: String,
    pub part: u32,
    pub size: usize,
    pub blob: String,
    pub etag: String,

    #[serde(default)]
    pub date: DateTime<Utc>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub merge_strategy: Option<MergeStrategy>,
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn put(request: HttpRequest, payload: Payload) -> HandlerResult<HttpResponse> {
    let span = Span::current();
    debug!("put request");

    let mut request = ServiceRequest::from_request(request);
    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();
    let (headers, merge_strategy) = extract_headers(&mut request).await?;

    merge::validate_put_request(merge_strategy, &headers)?;

    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    let parts = postgres::find_parts::<PartData>(&pool, path.workspace, &path.key).await?;

    let conditionals = validate_put_conditionals(request.request(), &parts)?;

    let uploaded = blob::upload(&s3, &pool, headers.content_length, payload).await?;

    merge::validate_put_body(merge_strategy, &uploaded)?;

    let part_data = PartData {
        workspace: path.workspace,
        key: path.key,
        part: 0,
        blob: uploaded.s3_key,
        size: uploaded.length,
        etag: random_etag(),
        date: chrono::Utc::now(),

        headers: Some(headers.huly_headers.clone().into_iter().collect()),
        meta: Some(headers.meta.into_iter().collect()),
        merge_strategy: Some(merge_strategy),
    };

    let inline = uploaded.inline.and_then(|inline| {
        if inline.len() < CONFIG.inline_threshold.bytes() as usize {
            Some(inline)
        } else {
            None
        }
    });

    let obj_parts = vec![&part_data];

    recovery::set_object(&s3, path.workspace, &part_data.key, obj_parts, conditionals).await?;

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
    let (headers, _) = extract_headers(&mut request).await?;

    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    let parts = postgres::find_parts::<PartData>(&pool, path.workspace, &path.key).await?;

    let mut response = if !parts.is_empty() {
        let conditionals = validate_patch_conditionals(request.request(), &parts)?;

        let merge_strategy = objectpart_strategy(&parts).unwrap();

        merge::validate_patch_request(merge_strategy, &headers)?;

        let uploaded = blob::upload(&s3, &pool, headers.content_length, payload).await?;

        merge::validate_patch_body(merge_strategy, &uploaded)?;

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
            date: chrono::Utc::now(),

            // defined in the first part
            headers: None,
            meta: None,
            merge_strategy: None,
        };

        let obj_parts = parts
            .iter()
            .map(|p| &p.data)
            .chain(std::iter::once(&part_data))
            .collect::<Vec<&PartData>>();

        recovery::set_object(&s3, path.workspace, &part_data.key, obj_parts, conditionals).await?;

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

        if uploaded.deduplicated {
            response.insert_header(("Huly-Deduplicated", "true"));
        } else {
            if let Some(parts_count) = uploaded.parts_count {
                response.insert_header(("Huly-S3-Parts-Count", parts_count.to_string()));
            }
        }

        response
    } else {
        HttpResponse::NotFound()
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

    let parts = postgres::find_parts::<PartData>(&pool, path.workspace, &path.key).await?;

    let response = if !parts.is_empty() {
        let etag = objectpart_etag(&parts).unwrap();
        let date = objectpart_date(&parts).unwrap();

        let range = extract_range_header(&mut request).await;

        match none_match(request.request(), Some(etag.clone()))? {
            Some(false) => HttpResponse::NotModified()
                .insert_header((header::ETAG, etag))
                .insert_header((header::LAST_MODIFIED, HttpDate::from(date)))
                .insert_header((header::CACHE_CONTROL, CONFIG.cache_control.clone()))
                .finish(),
            _ => {
                let mut response = HttpResponse::Ok();

                let s3 = request
                    .app_data::<Data<S3Client>>()
                    .unwrap()
                    .to_owned()
                    .into_inner();

                let headers = parts[0].data.headers.as_ref();
                if let Some(headers) = headers {
                    for (header, value) in headers.iter() {
                        response.insert_header((header.as_str(), value.to_owned()));
                    }
                }

                let accept_ranges = objectpart_accept_ranges(&parts);
                if let Some(accept_ranges) = accept_ranges {
                    response.insert_header((header::ACCEPT_RANGES, accept_ranges));
                }

                response.insert_header((header::ETAG, etag));
                response.insert_header((header::LAST_MODIFIED, HttpDate::from(date)));
                response.insert_header((header::CACHE_CONTROL, CONFIG.cache_control.clone()));

                match range {
                    Some(range) => {
                        let partial = merge::partial(s3, parts, range).await?;

                        if partial.partial {
                            response.status(StatusCode::PARTIAL_CONTENT);
                        }

                        if let Some(content_range) = partial.content_range {
                            response.insert_header((header::CONTENT_RANGE, content_range));
                        }

                        response.body(SizedStream::new(partial.content_length, partial.stream))
                    }
                    None => {
                        let compact = request.app_data::<Data<CompactWorker>>().unwrap();
                        compact.send(&parts).await;

                        let stream = merge::stream(s3.clone(), parts).await?;
                        response.body(SizedStream::new(stream.content_length, stream.stream))
                    }
                }
            }
        }
    } else {
        HttpResponse::NotFound().finish()
    };

    Ok(response)
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn head(request: HttpRequest) -> HandlerResult<HttpResponse> {
    let span = Span::current();

    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();

    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();

    let parts = postgres::find_parts::<PartData>(&pool, path.workspace, &path.key).await?;

    let response = if !parts.is_empty() {
        let etag = objectpart_etag(&parts).unwrap();
        let date = objectpart_date(&parts).unwrap();

        match none_match(request.request(), Some(etag.clone()))? {
            Some(false) => HttpResponse::NotModified()
                .insert_header((header::ETAG, etag))
                .insert_header((header::LAST_MODIFIED, HttpDate::from(date)))
                .insert_header((header::CACHE_CONTROL, CONFIG.cache_control.clone()))
                .finish(),
            _ => {
                let mut response = HttpResponse::Ok();

                let headers = parts[0].data.headers.as_ref();
                if let Some(headers) = headers {
                    for (header, value) in headers.iter() {
                        response.insert_header((header.as_str(), value.to_owned()));
                    }
                }

                let accept_ranges = objectpart_accept_ranges(&parts);
                if let Some(accept_ranges) = accept_ranges {
                    response.insert_header((header::ACCEPT_RANGES, accept_ranges));
                }

                response.insert_header((header::ETAG, etag));
                response.insert_header((header::LAST_MODIFIED, HttpDate::from(date)));
                response.insert_header((header::CACHE_CONTROL, CONFIG.cache_control.clone()));

                // see https://github.com/actix/examples/blob/master/forms/multipart-s3/src/main.rs#L67-L79
                let content_length = merge::content_length(parts);
                match content_length {
                    Some(content_length) => response.body(SizedStream::new(
                        content_length as u64,
                        stream::empty::<Result<_, io::Error>>().boxed_local(),
                    )),
                    None => response.finish(),
                }
            }
        }
    } else {
        HttpResponse::NotFound().finish()
    };

    Ok(response)
}

pub async fn delete(_path: Path<ObjectPath>) -> HandlerResult<HttpResponse> {
    unimplemented!("delete is not implemented")
}

fn objectpart_etag(parts: &Vec<ObjectPart<PartData>>) -> Option<EntityTag> {
    parts
        .last()
        .map(|p| EntityTag::new_strong(p.data.etag.to_owned()))
}

fn objectpart_date(parts: &Vec<ObjectPart<PartData>>) -> Option<SystemTime> {
    parts.last().map(|p| p.data.date).map(|d| d.into())
}

fn objectpart_strategy(parts: &Vec<ObjectPart<PartData>>) -> Option<MergeStrategy> {
    parts.first().map(|p| p.data.merge_strategy.unwrap())
}

fn objectpart_accept_ranges(parts: &Vec<ObjectPart<PartData>>) -> Option<&str> {
    let strategy = objectpart_strategy(parts)?;
    match strategy {
        MergeStrategy::JsonPatch => None,
        _ => {
            if parts.len() == 1 {
                Some("bytes")
            } else {
                None
            }
        }
    }
}

fn validate_patch_conditionals(
    req: &HttpRequest,
    parts: &Vec<ObjectPart<PartData>>,
) -> Result<Option<ConditionalMatch>, ApiError> {
    let etag = objectpart_etag(parts);

    match any_match(req, etag)? {
        Some(false) => Err(ApiError::PreconditionFailed),
        Some(true) => {
            let parts_data = parts.iter().map(|p| &p.data).collect::<Vec<&PartData>>();
            let parts_etag = recovery::object_etag(parts_data)?;

            Ok(Some(ConditionalMatch::IfMatch(parts_etag)))
        }
        None => Ok(None),
    }
}

fn validate_put_conditionals(
    req: &HttpRequest,
    parts: &Vec<ObjectPart<PartData>>,
) -> Result<Option<ConditionalMatch>, ApiError> {
    let etag = objectpart_etag(parts);

    match any_match(req, etag.clone())? {
        Some(true) => {
            let parts_data = parts.iter().map(|p| &p.data).collect::<Vec<&PartData>>();
            let parts_etag = recovery::object_etag(parts_data)?;

            Ok(Some(ConditionalMatch::IfMatch(parts_etag)))
        }
        Some(false) => Err(ApiError::PreconditionFailed),
        None => match none_match(req, etag.clone())? {
            Some(true) => Ok(Some(ConditionalMatch::IfNoneMatch("*".to_owned()))),
            Some(false) => Err(ApiError::PreconditionFailed),
            None => Ok(None),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test::TestRequest;

    fn object_part(etag: &str) -> ObjectPart<PartData> {
        ObjectPart {
            inline: None,
            data: PartData {
                workspace: Uuid::new_v4(),
                key: "test".to_string(),
                part: 0,
                size: 0,
                blob: "test".to_string(),
                etag: etag.to_owned(),
                date: Utc::now(),
                headers: None,
                meta: None,
                merge_strategy: None,
            },
        }
    }

    #[test]
    fn test_objectpart_etag() {
        let parts = vec![object_part("foo"), object_part("bar")];

        let etag = objectpart_etag(&parts);
        assert_eq!(etag, Some(EntityTag::new_strong("bar".to_owned())));
    }

    #[test]
    fn test_validate_patch_conditionals_none_none() {
        let req = TestRequest::default().to_http_request();
        let parts = vec![];

        let res = validate_patch_conditionals(&req, &parts);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), None);
    }

    #[test]
    fn test_validate_patch_conditionals_none_some() {
        let req = TestRequest::default().to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_patch_conditionals(&req, &parts);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), None);
    }

    #[test]
    fn test_validate_patch_conditionals_some_some_match() {
        let req = TestRequest::default()
            .insert_header((header::IF_MATCH, "\"foo\""))
            .to_http_request();
        let parts = vec![object_part("foo")];
        let etag = recovery::object_etag(vec![&parts[0].data]).unwrap();

        let res = validate_patch_conditionals(&req, &parts);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), Some(ConditionalMatch::IfMatch(etag)));
    }

    #[test]
    fn test_validate_patch_conditionals_some_some_not_match() {
        let req = TestRequest::default()
            .insert_header((header::IF_MATCH, "\"bar\""))
            .to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_patch_conditionals(&req, &parts);
        assert!(res.is_err());
        assert_eq!(
            res.unwrap_err().to_string(),
            ApiError::PreconditionFailed.to_string()
        );
    }

    #[test]
    fn test_validate_put_conditionals_none_none() {
        let req = TestRequest::default().to_http_request();
        let parts = vec![];

        let res = validate_put_conditionals(&req, &parts);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), None);
    }

    #[test]
    fn test_validate_put_conditionals_none_some() {
        let req = TestRequest::default().to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_put_conditionals(&req, &parts);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), None);
    }

    #[test]
    fn test_validate_put_conditionals_some_some_match() {
        let req = TestRequest::default()
            .insert_header((header::IF_MATCH, "\"foo\""))
            .to_http_request();
        let parts = vec![object_part("foo")];
        let etag = recovery::object_etag(vec![&parts[0].data]).unwrap();

        let res = validate_put_conditionals(&req, &parts);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), Some(ConditionalMatch::IfMatch(etag)));
    }

    #[test]
    fn test_validate_put_conditionals_some_some_not_match() {
        let req = TestRequest::default()
            .insert_header((header::IF_MATCH, "\"bar\""))
            .to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_put_conditionals(&req, &parts);
        assert!(res.is_err());
        assert_eq!(
            res.unwrap_err().to_string(),
            ApiError::PreconditionFailed.to_string()
        );
    }

    #[test]
    fn test_validate_put_conditionals_if_match_if_none_match() {
        let req = TestRequest::default()
            .insert_header((header::IF_MATCH, "\"bar\""))
            .insert_header((header::IF_NONE_MATCH, "*"))
            .to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_put_conditionals(&req, &parts);
        assert!(res.is_err());
        assert_eq!(
            res.unwrap_err().to_string(),
            ApiError::PreconditionFailed.to_string()
        );
    }

    #[test]
    fn test_validate_put_conditionals_if_none_match_match() {
        let req = TestRequest::default()
            .insert_header((header::IF_NONE_MATCH, "\"bar\""))
            .to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_put_conditionals(&req, &parts);
        assert!(res.is_ok());
        assert_eq!(
            res.unwrap(),
            Some(ConditionalMatch::IfNoneMatch("*".to_owned()))
        );
    }

    #[test]
    fn test_validate_put_conditionals_if_none_match_not_match() {
        let req = TestRequest::default()
            .insert_header((header::IF_NONE_MATCH, "\"foo\""))
            .to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_put_conditionals(&req, &parts);
        assert_eq!(
            res.unwrap_err().to_string(),
            ApiError::PreconditionFailed.to_string()
        );
    }

    #[test]
    fn test_validate_put_conditionals_if_none_match_err() {
        let req = TestRequest::default()
            .insert_header((header::IF_NONE_MATCH, "*"))
            .to_http_request();
        let parts = vec![object_part("foo")];

        let res = validate_put_conditionals(&req, &parts);
        assert!(res.is_err());
        assert_eq!(
            res.unwrap_err().to_string(),
            ApiError::PreconditionFailed.to_string()
        );
    }
}
