use tanu::{
    check, check_eq, eyre,
    http::{self, Client},
};

use crate::util::*;

#[tanu::test]
pub async fn put_new() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http
        .key_put(&key)
        .body(text.clone())
        .header(http::header::CONTENT_TYPE, "text/plain")
        .send()
        .await?;

    check!(res.status().is_success());
    check!(res.headers().get(http::header::ETAG).is_some());
    check!(res.headers().get(http::header::CONTENT_LOCATION).is_some());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(
        "text/plain",
        res.headers().get(http::header::CONTENT_TYPE).unwrap()
    );
    check_eq!(text, res.text().await?);

    Ok(())
}

#[tanu::test]
pub async fn put_existing() -> eyre::Result<()> {
    let key = random_key();
    let text1 = random_text(1024);
    let text2 = random_text(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http.key_put(&key).body(text1.clone()).send().await?;
    check!(res.status().is_success());

    // update content
    let res = http.key_put(&key).body(text2.clone()).send().await?;
    check!(res.status().is_success());
    check!(res.headers().get(http::header::ETAG).is_some());
    check!(res.headers().get(http::header::CONTENT_LOCATION).is_some());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(text2, res.text().await?);

    Ok(())
}

#[tanu::test(1)]
#[tanu::test(1024)]
#[tanu::test(10 * 1024)]
#[tanu::test(1 * 1024 * 1024)]
#[tanu::test(10 * 1024 * 1024)]
pub async fn put_with_length(length: usize) -> eyre::Result<()> {
    let key = random_key();
    let body = random_body(length);

    let http = Client::new();

    // create new blob
    let res = http.key_put(&key).body(body).send().await?;
    check!(res.status().is_success());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(
        length,
        res.headers()
            .get(http::header::CONTENT_LENGTH)
            .unwrap()
            .to_str()?
            .parse::<usize>()?,
        "Invalid content length"
    );

    Ok(())
}

#[tanu::test]
pub async fn put_with_zero_length() -> eyre::Result<()> {
    let key = random_key();
    let body = random_body(0);

    let http = Client::new();

    // create new blob
    let res = http.key_put(&key).body(body).send().await?;
    check!(!res.status().is_success());
    check_eq!(http::StatusCode::BAD_REQUEST, res.status());

    Ok(())
}

#[tanu::test("huly-header-header", "header", "value1")]
#[tanu::test("huly-header-HeAdEr", "header", "value2")]
#[tanu::test("HULY-HEADER-HEADER", "header", "value3")]
#[tanu::test("HULY-HEADER-HEADER", "HEADER", "value4")]
pub async fn put_with_header_case(
    req_header: &str,
    res_header: &str,
    value: &str,
) -> eyre::Result<()> {
    let key = random_key();
    let body = random_body(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http
        .key_put(&key)
        .body(body)
        .header(req_header, value)
        .send()
        .await?;
    check!(res.status().is_success());

    // check header is returned
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(value, res.headers().get(res_header).unwrap());

    Ok(())
}

#[tanu::test]
pub async fn put_with_headers() -> eyre::Result<()> {
    let key = random_key();
    let body = random_body(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http
        .key_put(&key)
        .body(body)
        .header("huly-header-header1", "foo")
        .header("huly-header-header2", "bar")
        .send()
        .await?;
    check!(res.status().is_success());

    // check headers are returned
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!("foo", res.headers().get("header1").unwrap());
    check_eq!("bar", res.headers().get("header2").unwrap());

    Ok(())
}

#[tanu::test]
pub async fn put_with_meta() -> eyre::Result<()> {
    let key = random_key();
    let body = random_body(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http
        .key_put(&key)
        .body(body)
        .header("huly-meta-meta1", "foo")
        .header("huly-meta-meta2", "bar")
        .send()
        .await?;
    check!(res.status().is_success());

    // check meta is private
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check!(res.headers().get("meta1").is_none());
    check!(res.headers().get("meta2").is_none());

    Ok(())
}
