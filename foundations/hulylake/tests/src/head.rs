use serde_json::{self as json, json};
use tanu::{
    check, check_eq, eyre,
    http::{self, Client},
};

use crate::util::*;

#[tanu::test]
pub async fn head_unknown() -> eyre::Result<()> {
    let http = Client::new();

    let res = http.key_head(&random_key()).send().await?;
    check!(!res.status().is_success());
    check_eq!(http::StatusCode::NOT_FOUND, res.status());

    Ok(())
}

#[tanu::test]
pub async fn head_known() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024);

    let http = Client::new();

    let res = http.key_put(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    let res = http.key_head(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(
        Some(text.len().to_string().as_str()),
        res.header("content-length"),
    );
    check!(res.header("etag").is_some());
    check_eq!("", res.text().await?);

    Ok(())
}

#[tanu::test]
pub async fn head_known_with_jsonpatch() -> eyre::Result<()> {
    let key = random_key();
    let payload = json!({ "foo": "bar" });

    let http = Client::new();

    // create new blob
    let res = http
        .key_put(&key)
        .body(json::to_string(&payload)?)
        .header("huly-merge-strategy", "jsonpatch")
        .header("content-type", "application/json")
        .send()
        .await?;
    check!(res.status().is_success());

    let res = http.key_head(&key).send().await?;
    check!(res.status().is_success());
    // despite the fact we are not setting content-length
    // actix forces it to be returned as 0
    check_eq!(Some("0"), res.header("content-length"));

    Ok(())
}

#[tanu::test]
pub async fn head_conditional() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024);

    let http = Client::new();

    let res = http.key_put(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    let res = http.key_head(&key).send().await?;
    check!(res.status().is_success());
    let etag = res.header("etag").expect("ETag not found");

    // Test without If-None-Match (normal GET)
    let res = http.key_head(&key).send().await?;
    check!(res.status().is_success());

    // Test with If-None-Match: *
    let res = http
        .key_head(&key)
        .header("If-None-Match", "*")
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::NOT_MODIFIED);

    // Test with correct ETag
    let res = http
        .key_head(&key)
        .header("If-None-Match", etag)
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::NOT_MODIFIED);

    // Test with incorrect ETag
    let res = http
        .key_head(&key)
        .header("If-None-Match", "\"invalid-etag\"")
        .send()
        .await?;
    check!(res.status().is_success());

    Ok(())
}
