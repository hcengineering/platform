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
use blake3::Hasher;
use bytes::{Bytes, BytesMut};
use futures_util::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use tracing::*;
use uuid::Uuid;

use crate::s3::S3Client;
use crate::{
    config::CONFIG,
    postgres::{self, Pool},
};
use aws_sdk_s3::{
    error::SdkError,
    types::{CompletedMultipartUpload, CompletedPart},
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

type HandlerResult<T> = Result<T, ApiError>;

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

struct Blob {
    s3_key: String,
    hash: String,
    size: u64,
}

#[derive(Serialize, serde::Deserialize, Debug)]
struct PartData {
    workspace: Uuid,
    key: String,
    part: u32,
    size: u64,
    blob: String,
    hash: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    headers: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    meta: Option<HashMap<String, String>>,
}

// upload and deduplicate blob
#[instrument(level = "debug", skip_all, fields(s3_bucket, s3_key, upload))]
async fn upload(s3: &S3Client, pool: &Pool, mut payload: Payload) -> Result<Blob, ApiError> {
    let span = Span::current();

    let s3_bucket = &CONFIG.s3_bucket;
    let s3_key = ksuid::Ksuid::generate().to_base62();

    span.record("s3_bucket", &s3_bucket);
    span.record("s3_key", &s3_key);

    let create_multipart = s3
        .create_multipart_upload()
        .bucket(s3_bucket)
        .key(&s3_key)
        .send()
        .await?;

    let upload_id = create_multipart.upload_id().unwrap();

    span.record("upload", &upload_id[upload_id.len().saturating_sub(16)..]);

    debug!("upload start");

    let upload_part = async |number, buffer: BytesMut| -> HandlerResult<CompletedPart> {
        let upload = s3
            .upload_part()
            .bucket(s3_bucket)
            .key(&s3_key)
            .upload_id(upload_id)
            .body(buffer.freeze().into())
            .part_number(number)
            .send()
            .await?;

        let part = CompletedPart::builder()
            .e_tag(upload.e_tag.unwrap())
            .part_number(number)
            .build();

        Ok(part)
    };

    let mut buffer = BytesMut::with_capacity(1024 * 1024 * 6);
    let mut complete = CompletedMultipartUpload::builder();
    let mut part_number = 1;
    let mut hash = Hasher::new();
    let mut total_in = 0;
    let mut total_uploaded = 0;

    while let Some(part) = payload.next().await {
        if let Ok(part) = part {
            hash.update(&part);

            total_in += part.len();

            buffer.extend_from_slice(&part);

            // each part must be at least 5MB
            if buffer.len() > 1024 * 1024 * 5 {
                trace!(length = buffer.len(), part_number, "upload part");

                total_uploaded += buffer.len();

                let uploaded = upload_part(part_number, buffer).await?;

                complete = complete.parts(uploaded);

                buffer = BytesMut::new();
                part_number += 1;
            }
        } else {
            // TODO: cleanup incomplete upload
            panic!("read error")
        }
    }

    // the last part
    if buffer.len() > 0 {
        total_uploaded += buffer.len();

        trace!(length = buffer.len(), part_number, "upload part");
        let uploaded = upload_part(part_number, buffer).await?;
        complete = complete.parts(uploaded);
    }

    assert_eq!(total_in, total_uploaded);

    let _ = s3
        .complete_multipart_upload()
        .bucket(s3_bucket)
        .key(&s3_key)
        .multipart_upload(complete.build())
        .upload_id(upload_id)
        .send()
        .await?;

    let hash = hash.finalize().to_hex().to_string();

    debug!(hash, "upload complete");

    let s3_key = if let Some(s3_key_found) = postgres::find_blob_by_hash(&pool, &hash).await? {
        debug!(s3_key_found, "blob deduplicated");

        // delete uploaded
        s3.delete_object()
            .bucket(s3_bucket)
            .key(s3_key)
            .send()
            .await?;

        s3_key_found
    } else {
        debug!("blob created");
        postgres::insert_blob(&pool, &s3_key, &hash).await?;
        s3_key
    };

    Ok(Blob {
        s3_key,
        hash,
        size: total_uploaded as u64,
    })
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
pub async fn put(request: HttpRequest, payload: Payload) -> HandlerResult<HttpResponse> {
    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();

    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    let span = Span::current();

    span.record("workspace", path.workspace.to_string());
    span.record("huly_key", &path.key);

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
        key: path.key.clone(),
        part: 0,
        blob: uploaded.s3_key.clone(),
        size: uploaded.size,
        hash: uploaded.hash.clone(),
        headers: Some(headers.clone().into_iter().collect()),
        meta: Some(meta.into_iter().collect()),
    };

    postgres::set_part(&pool, path.workspace, &path.key, None, part_data).await?;

    let mut response = HttpResponse::Created();
    response.insert_header((header::CONTENT_LOCATION, uploaded.s3_key));
    response.insert_header((header::ETAG, uploaded.hash));

    for (key, value) in headers {
        response.insert_header((key.as_str(), value));
    }

    Ok(response.finish())
}

pub async fn post(request: HttpRequest, payload: Payload) -> HandlerResult<HttpResponse> {
    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();
    let pool = request.app_data::<Data<Pool>>().unwrap().to_owned();
    let s3 = request.app_data::<Data<S3Client>>().unwrap().to_owned();

    let uploaded = upload(&s3, &pool, payload).await?;

    let parts = postgres::find_parts::<PartData>(&pool, path.workspace, &path.key).await?;

    let part_data = PartData {
        workspace: path.workspace,
        key: path.key.clone(),
        part: parts.len() as u32,
        blob: uploaded.s3_key,
        size: uploaded.size,
        hash: uploaded.hash.clone(),
        headers: None,
        meta: None,
    };

    if parts.is_empty() {
        postgres::set_part(&pool, path.workspace, &path.key, None, part_data).await?;
    } else {
        // append
        postgres::append_part(
            &pool,
            path.workspace,
            &path.key,
            part_data.part,
            None,
            part_data,
        )
        .await?;
    }

    let mut response = HttpResponse::Created();
    response.insert_header((header::ETAG, uploaded.hash));

    Ok(response.finish())
}

pub async fn get(request: HttpRequest) -> HandlerResult<HttpResponse> {
    let mut request = ServiceRequest::from_request(request);

    let path = request.extract::<Path<ObjectPath>>().await?.into_inner();
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
        let mut etag = Hasher::new();

        for part in parts.iter() {
            content_length += part.data.size;
            etag.update(part.data.hash.as_bytes());
        }

        let mut response = HttpResponse::Ok();

        response.insert_header((header::CONTENT_LENGTH, content_length));
        response.insert_header((header::ETAG, etag.finalize().to_hex().to_string()));

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
