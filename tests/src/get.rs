use tanu::{
    check, check_eq, eyre,
    http::{self, Client},
};

use crate::util::*;

#[tanu::test]
pub async fn get_unknown() -> eyre::Result<()> {
    let http = Client::new();

    let res = http.key_get(&random_key()).send().await?;
    check!(!res.status().is_success());
    check_eq!(http::StatusCode::NOT_FOUND, res.status());

    Ok(())
}

#[tanu::test]
pub async fn get_known() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024);

    let http = Client::new();

    let res = http.key_put(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(
        Some(text.len().to_string().as_str()),
        res.header("content-length"),
    );
    check!(res.header("etag").is_some());
    check_eq!(text, res.text().await?);

    Ok(())
}

#[tanu::test]
pub async fn get_conditional() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024);

    let http = Client::new();

    let res = http.key_put(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    let etag = res.header("etag").expect("ETag not found");

    // Test without If-None-Match (normal GET)
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(text, res.text().await?);

    // Test with If-None-Match: *
    let res = http
        .key_get(&key)
        .header("If-None-Match", "*")
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::NOT_MODIFIED);

    // Test with correct ETag
    let res = http
        .key_get(&key)
        .header("If-None-Match", etag)
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::NOT_MODIFIED);

    // Test with incorrect ETag
    let res = http
        .key_get(&key)
        .header("If-None-Match", "\"invalid-etag\"")
        .send()
        .await?;
    check!(res.status().is_success());
    check_eq!(text, res.text().await?);

    Ok(())
}
