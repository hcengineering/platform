use actix_web::{
    HttpResponse, error,
    web::{self, Data, Json, Path, Payload, Query},
};
use futures_util::{StreamExt, TryStreamExt};
use serde::de;
use tokio_stream::wrappers::ReceiverStream;
use tracing::*;

use crate::s3::S3Client;
use crate::{postgres::Pool, s3};
use aws_sdk_s3::{presigning::PresigningConfig, primitives::ByteStream};

pub type ObjectPath = Path<(String, String)>;

pub async fn get(
    path: ObjectPath,
    _pool: Data<Pool>,
    _body: web::Bytes,
) -> Result<HttpResponse, actix_web::error::Error> {
    debug!(?path, "GET request");

    unimplemented!() //
}

use aws_sdk_s3::presigning::PresignedRequest;

pub async fn put(
    path: ObjectPath,
    pool: Data<Pool>,
    s3: Data<S3Client>,
    req: actix_web::HttpRequest,
    mut payload: Payload,
) -> Result<HttpResponse, actix_web::error::Error> {
    debug!(?path, "PUT request");

    let client = reqwest::Client::new();

    let (sender, receiver) = tokio::sync::mpsc::channel::<std::io::Result<Vec<u8>>>(1);

    let length = req
        .headers()
        .get("Content-Length")
        .unwrap()
        .to_str()
        .unwrap()
        .to_owned();

    tokio::spawn(async move {
        let expires_in: std::time::Duration = std::time::Duration::from_secs(600);
        let expires_in: aws_sdk_s3::presigning::PresigningConfig =
            PresigningConfig::expires_in(expires_in).unwrap();

        let presigned_request = s3
            .put_object()
            .bucket("hulylake")
            .key("test")
            .presigned(expires_in)
            .await
            .unwrap();

        let url = presigned_request.uri();

        debug!(?url, "presigned request");

        let res = client
            .put(url)
            .body(reqwest::Body::wrap_stream(ReceiverStream::new(receiver)))
            //     .header("Content-Length", length)
            .send()
            .await
            .unwrap();

        debug!(?res, "response");
        debug!("body: {:?}", res.text().await.unwrap());
    });

    while let Some(item) = payload.next().await {
        if let Ok(item) = item {
            sender.send(Ok(item.to_vec())).await.unwrap();
        }
    }

    //s3.put_object().body()

    unimplemented!() //
}

pub async fn post(
    path: ObjectPath,
    _pool: Data<Pool>,
    _body: web::Bytes,
) -> Result<HttpResponse, actix_web::error::Error> {
    debug!(?path, "POST request");
    unimplemented!() //
}

pub async fn delete(
    path: ObjectPath,
    _pool: Data<Pool>,
    _body: web::Bytes,
) -> Result<HttpResponse, actix_web::error::Error> {
    debug!(?path, "DELETE request");
    unimplemented!() //
}
