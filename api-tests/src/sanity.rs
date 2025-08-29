use tanu::{check, get_config, eyre, http::Client};

#[tanu::test]
async fn status_is_ok() -> eyre::Result<()> {
    let config = get_config();
    let base_url = config.get_str("base_url").unwrap();

    let http = Client::new();
    let res = http
        .get(format!("{}/status", base_url))
        .send()
        .await?;
    check!(res.status().is_success());
    check!(res.text().await? == "ok");
    Ok(())
}
