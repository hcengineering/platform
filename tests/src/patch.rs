use hulyrs::StatusCode;
use tanu::{check, check_eq, eyre, http::Client};

use crate::util::*;

#[tanu::test((10, 10))]
pub async fn put_and_patch_contact((initial, patch): (usize, usize)) -> eyre::Result<()> {
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
