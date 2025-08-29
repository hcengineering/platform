use tanu::{check, check_eq, eyre, http::Client};
use crate::{config::CONFIG};

#[tanu::test]
async fn get_auth_without_token_returns_401() -> eyre::Result<()> {
    let http = Client::new();
    let res = http
        .get(format!("{}/api/huly/example", CONFIG.base_url))
        .send()
        .await?;
    check!(!res.status().is_success());
    check_eq!(401, res.status().as_u16());
    Ok(())
}

#[tanu::test]
async fn post_auth_without_token_returns_401() -> eyre::Result<()> {
    let http = Client::new();
    let res = http
        .post(format!("{}/api/huly/example", CONFIG.base_url))
        .send()
        .await?;
    check!(!res.status().is_success());
    check_eq!(401, res.status().as_u16());
    Ok(())
}

#[tanu::test]
async fn put_auth_without_token_returns_401() -> eyre::Result<()> {
    let http = Client::new();
    let res = http
        .put(format!("{}/api/huly/example", CONFIG.base_url))
        .send()
        .await?;
    check!(!res.status().is_success());
    check_eq!(401, res.status().as_u16());
    Ok(())
}

#[tanu::test]
async fn delete_auth_without_token_returns_401() -> eyre::Result<()> {
    let http = Client::new();
    let res = http
        .delete(format!("{}/api/huly/example", CONFIG.base_url))
        .send()
        .await?;
    check!(!res.status().is_success());
    check_eq!(401, res.status().as_u16());
    Ok(())
}
