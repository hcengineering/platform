use serde_json::{self as json, Value, json};
use tanu::{check, eyre, http::Client};

use crate::util::*;

#[tanu::test(50)]
#[tanu::test(100)]
#[tanu::test(200)]
#[tanu::test(500)]
pub async fn compact_json(count: usize) -> eyre::Result<()> {
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

    for i in 0..count {
        let patch = json!([
            { "op": "replace", "path": "/a", "value": i + 1},
        ]);

        let body: String = json::to_string(&patch)?;
        let res = http
            .key_patch(&key)
            .body(body)
            .header("content-type", "application/json-patch+json")
            .send()
            .await?;

        check!(res.status().is_success(), "{:#?}", res);
    }

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);
    let json = res.json::<Value>().await?;
    assert_eq!(json, json!({ "a": count }));

    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);
    let json = res.json::<Value>().await?;
    assert_eq!(json, json!({ "a": count }));

    Ok(())
}
