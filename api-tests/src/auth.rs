use tanu::{check, eyre, get_config, http::Client};

#[tanu::test]
async fn get_auth_without_token_returns_401() -> eyre::Result<()> {
    let config = get_config();
    let base_url = config.get_str("base_url").unwrap();

    let http = Client::new();
    let res = http
        .get(format!("{}/api/huly/example", base_url))
        .send()
        .await?;
    check!(!res.status().is_success());
    check!(res.status().as_u16() == 401);
    Ok(())
}
