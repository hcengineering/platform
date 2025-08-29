use tanu::{check, check_eq, eyre, http::Client};
use crate::{config::CONFIG};

#[tanu::test]
async fn status_is_ok() -> eyre::Result<()> {
    let http = Client::new();
    let res = http
        .get(format!("{}/status", CONFIG.base_url))
        .send()
        .await?;
    check!(res.status().is_success());
    check_eq!("ok", res.text().await?);
    Ok(())
}
