mod auth;
mod compact;
mod config;
mod get;
mod head;
mod jwt;
mod patch;
mod put;
mod sanity;
mod util;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
    #[error("{0}")]
    HttpError(reqwest::StatusCode, String),
    #[error(transparent)]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("{0}")]
    Other(&'static str),
}

use tanu::eyre;

#[tanu::main]
#[tokio::main]
async fn main() -> eyre::Result<()> {
    let runner = run();
    let app = tanu::App::new();
    app.run(runner).await?;
    Ok(())
}
