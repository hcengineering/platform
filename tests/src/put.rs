use tanu::{check, check_eq, eyre, http::Client};

use crate::util::*;

#[tanu::test]
pub async fn put_new() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http.key_put(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(text, res.text().await?);

    Ok(())
}

#[tanu::test]
pub async fn put_existing() -> eyre::Result<()> {
    let key = random_key();
    let text1 = random_text(1024);
    let text2 = random_text(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http.key_put(&key).body(text1.clone()).send().await?;
    check!(res.status().is_success());

    // update content
    let res = http.key_put(&key).body(text2.clone()).send().await?;
    check!(res.status().is_success());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(text2, res.text().await?);

    Ok(())
}
