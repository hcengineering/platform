use futures::future::join_all;
use hulyrs::StatusCode;
use serde_json::{self as json, Value, json};
use tanu::{check, check_eq, check_ne, eyre, http::Client};

use crate::util::*;

#[tanu::test((10, 10))]
pub async fn put_and_patch_content((initial, patch): (usize, usize)) -> eyre::Result<()> {
    let key = random_key();
    let initial = random_text(1024 * initial);
    let patch = random_text(1024 * patch);

    let http = Client::new();

    // patch non-existing blob
    let res = http.key_patch(&key).body(patch.clone()).send().await?;
    check_eq!(res.status(), StatusCode::NOT_FOUND, "{:#?}", res);

    // create new blob
    let res = http.key_put(&key).body(initial.clone()).send().await?;
    check!(res.status().is_success(), "{:#?}", res);

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);
    check_eq!(initial, res.text().await?);

    // patch
    let res = http.key_patch(&key).body(patch.clone()).send().await?;
    check!(res.status().is_success(), "{:#?}", res);

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);
    check_eq!(res.text().await?, format!("{}{}", initial, patch));

    Ok(())
}

use super::put::Body;

#[tanu::test(1, None, Body::Text("{}"), StatusCode::BAD_REQUEST)]
#[tanu::test(2, Some("application/json"), Body::Text("{}"), StatusCode::BAD_REQUEST)]
#[tanu::test(
    3,
    Some("application/json-patch+json"),
    Body::Text("{"),
    StatusCode::BAD_REQUEST
)]
#[tanu::test(
    4,
    Some("application/json-patch+json"),
    Body::Text("{}"),
    StatusCode::CREATED
)]
pub async fn put_and_patch_json_patch(
    _: usize,
    content_type: Option<&str>,
    body: Body,
    status: StatusCode,
) -> eyre::Result<()> {
    let key = random_key();

    let http = Client::new();

    // create new blob
    let res = http
        .key_put(&key)
        .body("{}")
        .header("huly-merge-strategy", "jsonpatch")
        .header("content-type", "application/json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let mut req = http.key_patch(&key);

    match body {
        Body::Random(size) => {
            req = req.body(random_body(size));
        }
        Body::Text(text) => {
            req = req.body(text.to_string());
        }
    }

    if let Some(content_type) = content_type {
        req = req.header("content-type", content_type);
    }

    let res = req.send().await?;

    check!(res.status() == status);

    Ok(())
}

#[tanu::test]
async fn get_json_patch() -> eyre::Result<()> {
    let key = random_key();

    let http = Client::new();

    let initial = json!({
        "a": 1,
        "b": 2,
        "c": 3
    });

    // create new blob
    let res = http
        .key_put(&key)
        .body(json::to_string(&initial)?)
        .header("huly-merge-strategy", "jsonpatch")
        .header("content-type", "application/json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let patch = json!([
        { "op": "add", "path": "/a", "value": 4 },
        { "op": "replace", "path": "/b", "value": 5 },
        { "op": "remove", "path": "/c" }
    ]);

    let res = http
        .key_patch(&key)
        .body(json::to_string(&patch)?)
        .header("content-type", "application/json-patch+json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let res = http.key_get(&key).send().await?;

    let json = res.json::<Value>().await?;

    assert_eq!(json, json!({ "a": 4, "b": 5 }));

    Ok(())
}

#[tanu::test]
async fn get_json_patch_unsafe() -> eyre::Result<()> {
    let key = random_key();

    let http = Client::new();

    let initial = json!({
        "a": {
            "b": 1
        }
    });

    // create new blob
    let res = http
        .key_put(&key)
        .body(json::to_string(&initial)?)
        .header("huly-merge-strategy", "jsonpatch")
        .header("content-type", "application/json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let patch = json!([
        { "hop": "add", "path": "/a/b", "value": 0, "safe": false },
        { "hop": "inc", "path": "/a/c", "value": 1, "safe": false }
    ]);

    let res = http
        .key_patch(&key)
        .body(json::to_string(&patch)?)
        .header("content-type", "application/json-patch+json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let res = http.key_get(&key).send().await?;

    let json = res.json::<Value>().await?;

    assert_eq!(json, json!({ "a": { "b": 0, "c": 1 }}));

    Ok(())
}

#[tanu::test]
async fn get_json_patch_safe() -> eyre::Result<()> {
    let key = random_key();

    let http = Client::new();

    let initial = json!({
        "a": {
            "b": 1
        }
    });

    // create new blob
    let res = http
        .key_put(&key)
        .body(json::to_string(&initial)?)
        .header("huly-merge-strategy", "jsonpatch")
        .header("content-type", "application/json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let patch = json!([
        { "hop": "add", "path": "/a/b", "value": 0, "safe": true },
        { "hop": "inc", "path": "/a/c", "value": 1, "safe": true }
    ]);

    let res = http
        .key_patch(&key)
        .body(json::to_string(&patch)?)
        .header("content-type", "application/json-patch+json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let res = http.key_get(&key).send().await?;

    let json = res.json::<Value>().await?;

    assert_eq!(json, json!({ "a": { "b": 1 }}));

    Ok(())
}

#[derive(PartialEq, Eq)]
pub enum IfMatch {
    ETag,
    Some(&'static str),
    None,
}

#[tanu::test(1, IfMatch::None, StatusCode::CREATED)]
#[tanu::test(2, IfMatch::ETag, StatusCode::CREATED)]
#[tanu::test(3, IfMatch::Some("*"), StatusCode::CREATED)]
#[tanu::test(4, IfMatch::Some("\"unknown\""), StatusCode::PRECONDITION_FAILED)]
pub async fn put_and_patch_conditional(
    _: usize,
    if_match: IfMatch,
    status: StatusCode,
) -> eyre::Result<()> {
    let key = random_key();
    let initial = random_text(1024);
    let patch = random_text(1024);

    let http = Client::new();

    // create new blob
    let res = http.key_put(&key).body(initial.clone()).send().await?;
    check!(res.status().is_success());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    let etag = res.header("etag").expect("ETag not found");

    let mut req = http.key_patch(&key).body(patch.clone());

    req = match if_match {
        IfMatch::ETag => req.header("If-Match", etag),
        IfMatch::Some(etag) => req.header("If-Match", etag),
        IfMatch::None => req,
    };

    let res = req.send().await?;
    check_eq!(res.status(), status);

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());

    if status.is_success() {
        check_ne!(res.header("etag"), Some(etag));
    } else {
        check_eq!(res.header("etag"), Some(etag));
    }

    Ok(())
}

#[tanu::test]
pub async fn put_and_patch_json_err() -> eyre::Result<()> {
    let key = random_key();

    let http = Client::new();

    let initial = json!({
        "a": 1
    });

    // create new blob
    let res = http
        .key_put(&key)
        .body(json::to_string(&initial)?)
        .header("huly-merge-strategy", "jsonpatch")
        .header("content-type", "application/json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let patch = json!([
        { "hop": "add", "path": "/a/b/c", "value": 0, "safe": false },
    ]);

    let res = http
        .key_patch(&key)
        .body(json::to_string(&patch)?)
        .header("content-type", "application/json-patch+json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);

    let json = res.json::<Value>().await?;
    assert_eq!(json, json!({ "a": 1 }));

    Ok(())
}

#[tanu::test(1)]
#[tanu::test(2)]
#[tanu::test(5)]
#[tanu::test(10)]
#[tanu::test(50)]
pub async fn put_and_patch_concurrent(count: usize) -> eyre::Result<()> {
    let key = random_key();

    let http = Client::new();

    let initial = json!({
        "a": 0
    });

    // create new blob
    let res = http
        .key_put(&key)
        .body(json::to_string(&initial)?)
        .header("huly-merge-strategy", "jsonpatch")
        .header("content-type", "application/json")
        .send()
        .await?;

    check!(res.status().is_success(), "{:#?}", res);

    let patch = json!([
        { "hop": "inc", "path": "/a", "value": 1 },
    ]);

    let body: String = json::to_string(&patch)?;

    let futures: Vec<_> = (0..count)
        .map(|_| {
            let key = key.clone();
            let body = body.clone();
            let http = http.clone();

            async move {
                http.key_patch(&key)
                    .body(body)
                    .header("content-type", "application/json-patch+json")
                    .send()
                    .await
            }
        })
        .collect();

    let results = join_all(futures).await;
    for result in results.iter() {
        assert!(result.is_ok())
    }

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);
    let json = res.json::<Value>().await?;
    assert_eq!(json, json!({ "a": count }));

    Ok(())
}
