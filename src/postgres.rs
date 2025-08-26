use std::pin::Pin;

use bb8_postgres::PostgresConnectionManager;
use serde::de::DeserializeOwned;
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

#[derive(Debug)]
pub struct Object<T: DeserializeOwned + std::fmt::Debug> {
    pub inline: Option<Vec<u8>>,
    pub data: T,
}

pub async fn find_parts<T: DeserializeOwned + std::fmt::Debug>(
    pool: &Pool,
    workspace: uuid::Uuid,
    key: &str,
) -> anyhow::Result<Vec<Object<T>>> {
    let connection = pool.get().await?;

    let rows = connection
        .query(
            "select part, data, inline from object where workspace = $1 and key = $2 order by part",
            &[&workspace, &key],
        )
        .await?;

    let mut parts = Vec::with_capacity(rows.len());

    for row in rows {
        let data = row.get::<_, serde_json::Value>("data");
        let inline = row.get::<_, Option<Vec<u8>>>("inline");

        let data = serde_json::from_value(data)?;
        parts.push(Object { inline, data })
    }

    Ok(parts)
}

pub async fn append_part<D: serde::Serialize>(
    pool: &Pool,
    workspace: uuid::Uuid,
    key: &str,
    part: u32,
    inline: Option<Vec<u8>>,
    data: &D,
) -> anyhow::Result<()> {
    let connection = pool.get().await?;

    let data = serde_json::to_value(data)?;

    connection
        .execute(
            "insert into object (workspace, key, part, inline, data) values ($1, $2, $3, $4, $5)",
            &[&workspace, &key, &part, &inline, &data],
        )
        .await?;

    Ok(())
}

pub async fn set_part<D: serde::Serialize>(
    pool: &Pool,
    workspace: uuid::Uuid,
    key: &str,
    inline: Option<Vec<u8>>,
    data: &D,
) -> anyhow::Result<()> {
    let mut connection = pool.get().await?;

    let transaction = connection.transaction().await?;

    transaction
        .execute(
            "delete from object where workspace = $1 and key = $2",
            &[&workspace, &key],
        )
        .await?;

    let data = serde_json::to_value(data)?;

    transaction
        .execute(
            r#"
            insert into object (workspace, key, part, inline, data) values ($1, $2, 0, $3, $4)
            on conflict (workspace, key, part) do update set
                inline = $3,
                data = $4
            "#,
            &[&workspace, &key, &inline, &data],
        )
        .await?;

    transaction.commit().await?;

    Ok(())
}
