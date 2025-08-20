use std::pin::Pin;

use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;
use tokio_postgres::{self as pg};
use tracing::*;

use crate::config::CONFIG;

pub type Pool = bb8::Pool<PostgresConnectionManager<NoTls>>;

pub async fn pool() -> anyhow::Result<Pool> {
    tracing::debug!(
        connection = CONFIG.db_connection,
        "database connection string"
    );

    let manager = bb8_postgres::PostgresConnectionManager::new_from_stringlike(
        &CONFIG.db_connection,
        tokio_postgres::NoTls,
    )?;

    #[derive(Debug)]
    struct ConnectionCustomizer;

    impl bb8::CustomizeConnection<pg::Client, pg::Error> for ConnectionCustomizer {
        fn on_acquire<'a>(
            &'a self,
            client: &'a mut pg::Client,
        ) -> Pin<Box<dyn Future<Output = Result<(), pg::Error>> + Send + 'a>> {
            Box::pin(async {
                client
                    .execute("set search_path to $1", &[&CONFIG.db_scheme])
                    .await
                    .unwrap();
                Ok(())
            })
        }
    }

    let pool = bb8::Pool::builder()
        .max_size(15)
        .connection_customizer(Box::new(ConnectionCustomizer))
        .build(manager)
        .await?;

    {
        let mut connection = pool.dedicated_connection().await?;

        // query params cannot be bound in ddl statements
        connection
            .execute(
                &format!("create schema if not exists {}", CONFIG.db_scheme),
                &[],
            )
            .await?;

        refinery::embed_migrations!("etc/migrations");

        let report = migrations::runner()
            .set_migration_table_name("migrations")
            .run_async(&mut connection)
            .await?;

        for m in report.applied_migrations().iter() {
            info!(migration = m.to_string(), "apply migration");
        }
    }

    Ok(pool)
}

#[instrument(level = "debug", skip_all)]
pub async fn find_blob_by_hash(pool: &Pool, hash: &str) -> anyhow::Result<Option<String>> {
    let connection = pool.get().await?;

    let blob = connection
        .query("select key from blob where hash = $1", &[&hash])
        .await?;

    Ok(match blob.as_slice() {
        [found] => Some(found.get::<_, String>("key")),
        [] => None,

        _ => panic!(),
    })
}

#[instrument(level = "debug", skip_all)]
pub async fn insert_blob(pool: &Pool, key: &str, hash: &str) -> anyhow::Result<()> {
    let connection = pool.get().await?;

    connection
        .execute(
            "insert into blob (key, hash) values ($1, $2)",
            &[&key, &hash],
        )
        .await?;

    Ok(())
}

pub struct Object {
    part: u32,
    data: serde_json::Value,
}

pub async fn find_parts(
    pool: &Pool,
    workspace: uuid::Uuid,
    key: &str,
) -> anyhow::Result<Vec<Object>> {
    let connection = pool.get().await?;

    let parts = connection
        .query(
            "select part, data from object where workspace = $1 and key = $1 order by part",
            &[&workspace, &key],
        )
        .await?;

    let parts = parts
        .into_iter()
        .map(|row| {
            let part = row.get::<_, u32>("part");
            let data = row.get::<_, serde_json::Value>("data");
            Object { part, data }
        })
        .collect();

    Ok(parts)
}

pub async fn insert_part<D: serde::Serialize>(
    pool: &Pool,
    workspace: uuid::Uuid,
    key: &str,
    part: u32,
    data: D,
) -> anyhow::Result<()> {
    let connection = pool.get().await?;

    let data = serde_json::to_value(data)?;

    connection
        .execute(
            "insert into object (workspace, key, part, data) values ($1, $2, $3, $4)",
            &[&workspace, &key, &part, &data],
        )
        .await?;

    Ok(())
}

pub async fn shrink<D: serde::Serialize>(
    pool: &Pool,
    workspace: uuid::Uuid,
    key: &str,
    data: D,
) -> anyhow::Result<()> {
    let mut connection = pool.get().await?;

    let transaction = connection.transaction().await?;

    transaction
        .execute(
            "delete from object where workspace = $1 and key = $2 and part > 0",
            &[&workspace, &key],
        )
        .await?;

    let data = serde_json::to_value(data)?;

    transaction
        .execute(
            "update object set data=$1 where workspace = $2 and key = $3 and part = 0",
            &[&data, &workspace, &key],
        )
        .await?;

    transaction.commit().await?;

    Ok(())
}
