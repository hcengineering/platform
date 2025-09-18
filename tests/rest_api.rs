use reqwest::StatusCode;
use std::env;

fn server_url() -> String {
    env::var("TEST_SERVER_URL").unwrap_or_else(|_| "http://127.0.0.1/api".to_string())
}

#[tokio::test]
async fn put_and_get() {
    let base = server_url();
    println!("Use url: {}", &base);

    let client = reqwest::Client::new();

    // PUT значение
    let put_resp = client
        .put(&format!(
            "{}/00000000-0000-0000-0000-000000000001/TESTS/key1",
            base
        ))
        .header("HULY-TTL", "2")
        .body("Value_1")
        .send()
        .await
        .unwrap();

    assert_eq!(put_resp.status(), StatusCode::OK);

    // GET значение
    let get_resp = client
        .get(&format!(
            "{}/00000000-0000-0000-0000-000000000001/TESTS/key1",
            base
        ))
        .send()
        .await
        .unwrap();

    assert_eq!(get_resp.status(), StatusCode::OK);

    let text = get_resp.text().await.unwrap();
    assert!(text.contains("Value_1"));
}
