use core::panic;
use reqwest::StatusCode;
use serde_json::Value;
use std::env;

#[derive(Debug)]
struct ApiResponse {
    code: u16,
    #[allow(dead_code)]
    headers: reqwest::header::HeaderMap,
    etag: String,
    text: String,
    json: Value,
}

fn server_url() -> String {
    env::var("TEST_SERVER_URL").unwrap_or_else(|_| "http://127.0.0.1/api".to_string())
}

#[allow(dead_code)]
fn etag(data: &str) -> String {
    format!("{:x}", md5::compute(data))
}

#[allow(dead_code)]
async fn status(base: &str, client: &reqwest::Client) -> () {
    let status_url = format!("{}/status", &base);
    let resp = client.get(&status_url).send().await.unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let text = resp.text().await.unwrap();
    let json: Value = serde_json::from_str(&text).unwrap();

    let backend = json["backend"].as_str().unwrap_or_default();
    if let Ok(expected_backend) = env::var("TEST_BACKEND") {
        assert_eq!(backend, expected_backend);
    } else {
        assert!(backend == "memory" || backend == "redis");
    }
    assert_eq!(json["status"], "OK");
    assert!(json.get("memory_info").is_some());
    assert!(json.get("websockets").is_some());
    // println!("Status: {}", text);
}

#[allow(dead_code)]
async fn get_not(base: &str, client: &reqwest::Client, workspace: &str, key: &str) -> () {
    let r = engine("get", base, client, workspace, key, "", &[]).await;
    assert!(r.code == 404);
}
#[allow(dead_code)]
async fn get(base: &str, client: &reqwest::Client, workspace: &str, key: &str) -> () {
    let r = engine("get", base, client, workspace, key, "", &[]).await;
    assert!(r.code == 200);
}
#[allow(dead_code)]
async fn get_data(base: &str, client: &reqwest::Client, workspace: &str, key: &str) -> String {
    let r = engine("get", base, client, workspace, key, "", &[]).await;
    assert!(r.code == 200);
    r.json["data"].as_str().unwrap_or("").to_string()
}
#[allow(dead_code)]
async fn get_ttl(base: &str, client: &reqwest::Client, workspace: &str, key: &str) -> u64 {
    let r = engine("get", base, client, workspace, key, "", &[]).await;
    assert!(r.code == 200);
    r.json["expires_at"].as_u64().unwrap_or(0)
}
#[allow(dead_code)]
async fn get_etag(base: &str, client: &reqwest::Client, workspace: &str, key: &str) -> String {
    let r = engine("get", base, client, workspace, key, "", &[]).await;
    assert!(r.code == 200);
    r.etag
}
#[allow(dead_code)]
async fn put(
    base: &str,
    client: &reqwest::Client,
    workspace: &str,
    key: &str,
    data: &str,
    headers: &[&str],
) -> () {
    let r = engine("put", base, client, workspace, key, data, headers).await;
    // assert!(r.code == 412);
    assert!(r.code == 200);
    assert!(r.text == "DONE");
}

async fn engine(
    method: &str,
    base: &str,
    client: &reqwest::Client,
    workspace: &str,
    key: &str,
    data: &str,
    headers: &[&str],
) -> ApiResponse {
    let url = format!("{}/api/{}/{}", base, workspace, key);
    let req = client;
    let mut req = match method {
        "get" => req.get(&url),
        "put" => req.put(&url).body(data.to_string()),
        "delete" => req.delete(&url),
        "list" => req.get(&url),
        _ => panic!("Unknown method: {}", method),
    };

    if method == "put" {
        req = req.body(data.to_string());
    }

    for h in headers {
        if let Some((mut k, v)) = h.split_once(':') {
            k = k.trim();
            if k != "IF-MATCH" && k != "IF-NON-MATCH" && k != "HULY-TTL" {
                panic!("Only `IF-MATCH`, `IF-NON-MATCH`, `HULY-TTL` headers allowed");
            }
            req = req.header(k, v.trim());
        } else {
            panic!("Unknown format for header: {}", h);
        }
    }

    let resp = req.send().await.unwrap();

    let code = resp.status();
    let headers = resp.headers().clone();
    let text = resp.text().await.unwrap();
    ApiResponse {
        code: code.as_u16(),
        etag: headers
            .get("ETag")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("")
            .to_string(),
        text: text.clone(),
        json: serde_json::from_str(&text).unwrap_or_default(),
        headers: headers.clone(),
    }
}

#[allow(dead_code)]
async fn delete_any(base: &str, client: &reqwest::Client, workspace: &str, key: &str) -> () {
    engine("delete", base, client, workspace, key, "", &[]).await;
}
#[allow(dead_code)]
async fn delete(
    base: &str,
    client: &reqwest::Client,
    workspace: &str,
    key: &str,
    headers: &[&str],
) -> () {
    let r = engine("delete", base, client, workspace, key, "", headers).await;
    assert_eq!(r.code, StatusCode::NO_CONTENT); // 204
    assert!(r.text.is_empty());
}
#[allow(dead_code)]
async fn delete_not(
    base: &str,
    client: &reqwest::Client,
    workspace: &str,
    key: &str,
    headers: &[&str],
) -> () {
    let r = engine("delete", base, client, workspace, key, "", headers).await;
    assert!(
        (r.code == StatusCode::NOT_FOUND && r.text == "not found")
            || (!headers.is_empty()
                && r.code == StatusCode::PRECONDITION_FAILED
                && (r.text.contains("412 md5 mismatch")
                    || r.text.contains("404 Equal: key does not exist")))
    );
    // println!("CODE: {}", r.code);
    // println!("TEXT: {}", r.text);
}

#[tokio::test]
async fn put_and_get() {
    let base = server_url();
    // println!("Use url: {}", &base);

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true) // только на билдере!
        .build()
        .unwrap();

    // Check status
    status(&base, &client).await;

    let workspace = "00000000-0000-0000-0000-000000000001";
    let key = "TESTS/key1";
    let data = "Value_1";

    // test put/get/delete
    delete_any(&base, &client, workspace, key).await;
    get_not(&base, &client, workspace, key).await;
    put(&base, &client, workspace, key, data, &[]).await;
    get(&base, &client, workspace, key).await;
    delete(&base, &client, workspace, key, &[]).await;
    delete_not(&base, &client, workspace, key, &[]).await;

    // test If-Match
    delete_any(&base, &client, workspace, key).await;
    // delete only tag
    put(&base, &client, workspace, key, data, &["HULY-TTL: 2"]).await;
    delete_not(
        &base,
        &client,
        workspace,
        key,
        &["IF-MATCH: 11111111111111111111111111111111"],
    )
    .await;
    get(&base, &client, workspace, key).await;
    delete(
        &base,
        &client,
        workspace,
        key,
        &["IF-MATCH: c7bcabf6b98a220f2f4888a18d01568d"],
    )
    .await;
    get_not(&base, &client, workspace, key).await;

    // update with tag
    put(&base, &client, workspace, key, data, &["HULY-TTL: 2"]).await;
    // replace with match
    put(
        &base,
        &client,
        workspace,
        key,
        "Another Data",
        &["IF-MATCH: c7bcabf6b98a220f2f4888a18d01568d"],
    )
    .await;
    assert!(get_data(&base, &client, workspace, key).await == "Another Data".to_string());
    // replace with wrong mismatch
    let r = engine(
        "put",
        &base,
        &client,
        &workspace,
        &key,
        "Next Another Data",
        &["IF-MATCH: c7bcabf6b98a220f2f4888a18d01568d"],
    )
    .await;
    assert!(r.code == StatusCode::PRECONDITION_FAILED && r.text.contains("412 md5 mismatch"));
    // match: *
    assert!(get_data(&base, &client, workspace, key).await == "Another Data".to_string());
    put(
        &base,
        &client,
        workspace,
        key,
        "Another Data 2",
        &["IF-MATCH: *"],
    )
    .await;
    assert!(get_data(&base, &client, workspace, key).await == "Another Data 2".to_string());
    // unknown key matched
    let fake_key = format!("{}{}", &key, "xxx");
    let r = engine(
        "put",
        &base,
        &client,
        &workspace,
        &fake_key,
        "Next Another Data",
        &["IF-MATCH: c7bcabf6b98a220f2f4888a18d01568d"],
    )
    .await;
    assert!(r.code == StatusCode::NOT_FOUND && r.text.contains("404 Equal: key does not exist"));
    // if not match
    let data3 = "Another Data 3";
    put(
        &base,
        &client,
        &workspace,
        &key,
        &data3,
        &["IF-NON-MATCH: c7bcabf6b98a220f2f4888a18d01568d"],
    )
    .await;
    assert!(get_data(&base, &client, &workspace, &key).await == data3.to_string());

    // DELETE if match
    put(&base, &client, &workspace, &key, &data, &[]).await;
    delete(
        &base,
        &client,
        &workspace,
        &key,
        &["IF-MATCH: c7bcabf6b98a220f2f4888a18d01568d"],
    )
    .await;

    put(&base, &client, &workspace, &key, &data, &[]).await;
    delete(&base, &client, &workspace, &key, &["IF-MATCH: *"]).await;
    get_not(&base, &client, &workspace, &key).await;

    put(&base, &client, &workspace, &key, &data, &[]).await;
    delete(&base, &client, &workspace, &key, &["IF-NON-MATCH: *"]).await; // TODO !!!
    get_not(&base, &client, &workspace, &key).await;

    put(&base, &client, &workspace, &key, &data, &[]).await;
    let tag = get_etag(&base, &client, &workspace, &key).await;
    assert!(tag == "c7bcabf6b98a220f2f4888a18d01568d".to_string());
    delete(
        &base,
        &client,
        &workspace,
        &key,
        &["IF-NON-MATCH: c7bcabf6b98a220f2f4888a18d01568d"],
    )
    .await;
    get_not(&base, &client, &workspace, &key).await;

    // let r = engine("put", &base, &client, &workspace, &key, "Next Another Data", &["HULY-TTL: 2","IF-NON-MATCH: c7bcabf6b98a220f2f4888a18d01568d"]).await;
    // println!("ALL: {:?}", r);

    // test TTL
    delete_any(&base, &client, workspace, key).await;
    put(&base, &client, workspace, key, data, &["HULY-TTL: 7"]).await;
    let ttl = get_ttl(&base, &client, workspace, key).await;
    assert!(ttl == 7 || ttl == 6, "TTL should be 7 (ok, may by 6)");
    put(&base, &client, workspace, key, data, &["HULY-TTL: 1"]).await;
    let ttl = get_ttl(&base, &client, workspace, key).await;
    assert!(ttl == 1 || ttl == 0, "TTL should be 1 (ok, may by 0)");
    // wait for 1.05 seconds
    tokio::time::sleep(tokio::time::Duration::from_millis(1050)).await;
    get_not(&base, &client, workspace, key).await;
}
