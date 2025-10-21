mod auth;
mod compact;
mod config;
mod get;
mod head;
mod patch;
mod put;
mod sanity;
mod util;

use tanu::eyre;

#[tanu::main]
#[tokio::main]
async fn main() -> eyre::Result<()> {
    let runner = run();
    let app = tanu::App::new();
    app.run(runner).await?;
    Ok(())
}
