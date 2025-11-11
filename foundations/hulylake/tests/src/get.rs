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

#[tanu::test]
pub async fn get_partial() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024 * 1024 * 5);

    let http = Client::new();

    let res = http.key_put(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(res.header("accept-ranges"), Some("bytes"));

    let res = http
        .key_get(&key)
        .header("range", "bytes=0-127")
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::PARTIAL_CONTENT);
    check_eq!(res.header("content-length"), Some("128"));
    check_eq!(res.header("content-range"), Some("bytes 0-127/5242880"));

    let res = http
        .key_get(&key)
        .header("range", "bytes=0-5242879")
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::OK);
    check_eq!(res.header("content-length"), Some("5242880"));
    check_eq!(res.header("content-range"), Some("bytes 0-5242879/5242880"));

    Ok(())
}

#[tanu::test]
pub async fn get_partial_inline() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024);

    let http = Client::new();

    let res = http.key_put(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(res.header("accept-ranges"), Some("bytes"));

    let res = http
        .key_get(&key)
        .header("range", "bytes=0-31")
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::PARTIAL_CONTENT);
    check_eq!(res.header("content-length"), Some("32"));
    check_eq!(res.header("content-range"), Some("bytes 0-31/1024"));

    let res = http
        .key_get(&key)
        .header("range", "bytes=0-1023")
        .send()
        .await?;
    check_eq!(res.status(), http::StatusCode::OK);
    check_eq!(res.header("content-length"), Some("1024"));
    check_eq!(res.header("content-range"), Some("bytes 0-1023/1024"));

    Ok(())
}
