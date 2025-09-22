use hulyrs::StatusCode;
use tanu::{
    check, check_eq, eyre,
    http::{self, Client},
};

use crate::util::*;

#[tanu::test]
pub async fn put_new_deduplicated_no_multipart() -> eyre::Result<()> {
    let text = random_text(1024);

    let http = Client::new();

    let res = http
        .key_put(&random_key())
        .body(text.clone())
        .send()
        .await?;
    check!(res.status().is_success());
    check_eq!(None, res.header("huly-deduplicated"));

    let res = http
        .key_put(&random_key())
        .body(text.clone())
        .send()
        .await?;
    check!(res.status().is_success());
    check_eq!(Some("true"), res.header("huly-deduplicated"));

    Ok(())
}

#[tanu::test(1)]
#[tanu::test(2)]
#[tanu::test(10)]
#[tanu::test(100)]
#[tanu::test(1024)]
#[tanu::test(1024 * 10)]
pub async fn put_new_sized_no_multipart(size: usize) -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(size);

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
    check_eq!(None, res.header("huly-parts-count"));

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(
        "text/plain",
        res.headers().get(http::header::CONTENT_TYPE).unwrap()
    );
    check_eq!(
        Some(size.to_string().as_str()),
        res.header("content-length")
    );
    check_eq!(text, res.text().await?);

    Ok(())
}

#[tanu::test]
pub async fn put_new_sized_multipart() -> eyre::Result<()> {
    let text = random_text(1024 * 1024 * 5); // above multipart threshold
    let http = Client::new();

    let key1 = random_key();

    let res = http.key_put(&key1).body(text.clone()).send().await?;
    check!(res.status().is_success());

    check!(res.status().is_success());
    check_eq!(Some("1"), res.header("huly-s3-parts-count"));

    let res = http.key_get(&key1).send().await?;
    check!(res.status().is_success());
    check_eq!(
        Some(text.len().to_string().as_str()),
        res.header("content-length")
    );
    check_eq!(text, res.text().await?);

    let key2 = random_key();

    let res = http.key_put(&key2).body(text.clone()).send().await?;
    check!(res.status().is_success());
    check_eq!(None, res.header("huly-s3-parts-count"));
    check_eq!(Some("true"), res.header("huly-deduplicated"));

    let res = http.key_get(&key2).send().await?;
    check!(res.status().is_success());
    check_eq!(
        Some(text.len().to_string().as_str()),
        res.header("content-length")
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
    check_eq!(Some(value), res.header(res_header));

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
        .header("huly-meta-meta1", "baz")
        .header("content-type", "application/json")
        .send()
        .await?;
    check!(res.status().is_success());

    // check headers are returned
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(Some("foo"), res.header("header1"));
    check_eq!(Some("bar"), res.header("header2"));
    check_eq!(Some("application/json"), res.header("content-type"));
    check_eq!(None, res.header("meta1"));

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

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Body {
    Random(usize),
    Text(&'static str),
}

#[tanu::test(1, None, None, Body::Text("{}"), StatusCode::CREATED)]
#[tanu::test(2, Some("invalid"), None, Body::Text("{}"), StatusCode::BAD_REQUEST)]
#[tanu::test(3, Some("jsonpatch"), None, Body::Text("{}"), StatusCode::BAD_REQUEST)]
#[tanu::test(
    4,
    Some("jsonpatch"),
    Some("application/xml"),
    Body::Text("{}"),
    StatusCode::BAD_REQUEST
)]
#[tanu::test(
    5,
    Some("jsonpatch"),
    Some("application/json"),
    Body::Text("{"),
    StatusCode::BAD_REQUEST
)]
#[tanu::test(
    6,
    Some("jsonpatch"),
    Some("application/json"),
    Body::Random(1024 * 101),
    StatusCode::BAD_REQUEST
)]
#[tanu::test(
    7,
    Some("jsonpatch"),
    Some("application/json"),
    Body::Text("{}"),
    StatusCode::CREATED
)]

pub async fn put_merge_patch(
    _: usize,
    strategy: Option<&str>,
    content_type: Option<&str>,
    body: Body,
    status: StatusCode,
) -> eyre::Result<()> {
    let http = Client::new();
    let key = random_key();

    let mut req = http.key_put(&key);

    match body {
        Body::Random(size) => {
            req = req.body(random_body(size));
        }
        Body::Text(text) => {
            req = req.body(text.to_string());
        }
    }

    if let Some(strategy) = strategy {
        req = req.header("huly-merge-strategy", strategy);
    }

    if let Some(content_type) = content_type {
        req = req.header("content-type", content_type);
    }

    let res = req.send().await?;

    check!(res.status() == status);

    Ok(())
}

#[derive(PartialEq, Eq)]
pub enum Condition {
    ETag,
    IfMatch(&'static str),
    IfNoneMatch(&'static str),
}

#[tanu::test(1, Condition::ETag, StatusCode::CREATED)]
#[tanu::test(2, Condition::IfMatch("*"), StatusCode::PRECONDITION_FAILED)]
#[tanu::test(3, Condition::IfNoneMatch("*"), StatusCode::CREATED)]
#[tanu::test(4, Condition::IfNoneMatch("\"unknown\""), StatusCode::CREATED)]
pub async fn put_conditional_create(
    _: usize,
    condition: Condition,
    status: StatusCode,
) -> eyre::Result<()> {
    let key = random_key();
    let body = random_text(1024);

    let http = Client::new();

    let mut req = http.key_put(&key).body(body.clone());

    req = match condition {
        Condition::ETag => req,
        Condition::IfMatch(etag) => req.header("If-Match", etag),
        Condition::IfNoneMatch(etag) => req.header("If-None-Match", etag),
    };

    let res = req.send().await?;
    check_eq!(res.status(), status);

    Ok(())
}

#[tanu::test(1, Condition::ETag, StatusCode::CREATED)]
#[tanu::test(2, Condition::IfMatch("*"), StatusCode::CREATED)]
#[tanu::test(3, Condition::IfNoneMatch("*"), StatusCode::PRECONDITION_FAILED)]
#[tanu::test(
    4,
    Condition::IfNoneMatch("\"unknown\""),
    StatusCode::INTERNAL_SERVER_ERROR
)]
pub async fn put_conditional_update(
    _: usize,
    condition: Condition,
    status: StatusCode,
) -> eyre::Result<()> {
    let key = random_key();
    let body = random_text(1024);

    let http = Client::new();

    let res = http.key_put(&key).body(body.clone()).send().await?;
    check!(res.status().is_success());
    let etag = res.header("etag").expect("ETag not found");

    let mut req = http.key_put(&key).body(body.clone());

    req = match condition {
        Condition::ETag => req.header("If-Match", etag),
        Condition::IfMatch(etag) => req.header("If-Match", etag),
        Condition::IfNoneMatch(etag) => req.header("If-None-Match", etag),
    };

    let res = req.send().await?;
    check_eq!(res.status(), status);

    Ok(())
}
