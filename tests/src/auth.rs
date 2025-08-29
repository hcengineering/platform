use tanu::{
    check, check_eq, eyre,
    http::{Client, Method, StatusCode},
};

use crate::config::CONFIG;
use crate::util::*;

#[tanu::test]
async fn auth_without_token_unauthorized() -> eyre::Result<()> {
    let http = Client::new();

    for method in [
        //Method::HEAD,
        Method::GET,
        Method::PUT,
        Method::POST,
        Method::DELETE,
    ] {
        let res = http
            .request(&method, &format!("{}/api/huly/example", CONFIG.base_url))
            .send()
            .await?;
        check!(!res.status().is_success(), "method: {method}");
        check_eq!(StatusCode::UNAUTHORIZED, res.status(), "method: {method}");
    }

    Ok(())
}
