use tanu::{check, check_eq, eyre, http::Client};

use crate::util::*;

#[tanu::test]
pub async fn post_small() -> eyre::Result<()> {
    let key = random_key();
    let text = random_text(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http.key_post(&key).body(text.clone()).send().await?;
    check!(res.status().is_success());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(text, res.text().await?);

    Ok(())
}

#[tanu::test]
pub async fn post_large() -> eyre::Result<()> {
    let key = random_key();
    let body = random_body(1024 * 1024 * 10); // above multipart threshold

    let http = Client::new();

    let res = http.key_post(&key).body(body).send().await?;
    check!(res.status().is_success());

    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());

    Ok(())
}

#[tanu::test]
pub async fn post_new_and_append() -> eyre::Result<()> {
    let key = random_key();
    let part1 = random_text(1024 * 10);
    let part2 = random_text(1024 * 10);

    let http = Client::new();

    // create new blob
    let res = http.key_post(&key).body(part1.clone()).send().await?;
    check!(res.status().is_success());

    // append to the existing blob
    let res = http.key_post(&key).body(part2.clone()).send().await?;
    check!(res.status().is_success());

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success());
    check_eq!(format!("{}{}", part1, part2), res.text().await?);

    Ok(())
}
