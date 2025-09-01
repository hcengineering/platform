use tanu::{check, check_eq, eyre, http::Client};

use crate::util::*;

#[tanu::test((10, 10))]
pub async fn put_and_patch((initial, patch): (usize, usize)) -> eyre::Result<()> {
    let key = random_key();
    let initial = random_text(1024 * initial);
    let patch = random_text(1024 * patch);

    let http = Client::new();

    // create new blob
    let res = http.key_put(&key).body(initial.clone()).send().await?;
    check!(res.status().is_success(), "{:#?}", res);

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);
    check_eq!(initial, res.text().await?);

    // patch
    let res = http.key_patch(&key).body(patch.clone()).send().await?;
    check!(res.status().is_success(), "{:#?}", res);

    // check content
    let res = http.key_get(&key).send().await?;
    check!(res.status().is_success(), "{:#?}", res);
    check_eq!(res.text().await?, format!("{}{}", initial, patch));

    Ok(())
}
