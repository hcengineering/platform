use tanu::{check, eyre, http::Client};

use crate::util::*;

#[tanu::test]
pub async fn post_small() -> eyre::Result<()> {
    let http = Client::new();
    let res = http
        .key_post(&random_key())
        .body(random_body(1024 * 1024 * 10))
        .send()
        .await?;
    check!(res.status().is_success());
    Ok(())
}

#[tanu::test]
pub async fn post_large() -> eyre::Result<()> {
    let http = Client::new();
    let res = http
        .key_post(&random_key())
        .body(random_body(1024 * 1024 * 10)) // above multipart threshold
        .send()
        .await?;
    check!(res.status().is_success());
    Ok(())
}

#[tanu::test]
pub async fn post_new_and_append() -> eyre::Result<()> {
    let http = Client::new();
    let key = random_key();

    let res = http.key_post(&key).body(random_body(1024)).send().await?;

    check!(res.status().is_success(), "{:#?}", res);

    let res = http.key_post(&key).body(random_body(1024)).send().await?;

    check!(res.status().is_success(), "{:#?}", res);

    Ok(())
}
