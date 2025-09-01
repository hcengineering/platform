use secrecy::ExposeSecret;
use tanu::{
    check, check_eq, check_ne, eyre,
    http::{Client, Method, StatusCode},
};

use crate::config::CONFIG;
use crate::util::*;

// #[tanu::test("HEAD", Method::HEAD)]
#[tanu::test("GET", Method::GET)]
#[tanu::test("PUT", Method::PUT)]
#[tanu::test("POST", Method::POST)]
#[tanu::test("DELETE", Method::DELETE)]
async fn auth_without_token_unauthorized(_: &str, method: Method) -> eyre::Result<()> {
    let http = Client::new();

    let res = http.request(&method, &path(&random_key())).send().await?;
    check!(!res.status().is_success(), "method: {method}");
    check_eq!(StatusCode::UNAUTHORIZED, res.status(), "method: {method}");

    Ok(())
}

// #[tanu::test("HEAD", Method::HEAD)]
#[tanu::test("GET", Method::GET)]
#[tanu::test("PUT", Method::PUT)]
#[tanu::test("POST", Method::POST)]
// #[tanu::test("DELETE", Method::DELETE)]
async fn auth_with_token(_: &str, method: Method) -> eyre::Result<()> {
    let http = Client::new();

    let res = http
        .request(&method, &path(&random_key()))
        .bearer_auth(CONFIG.token_valid.expose_secret())
        .send()
        .await?;
    check_ne!(StatusCode::UNAUTHORIZED, res.status(), "method: {method}");

    Ok(())
}
