use std::sync::Arc;

use crate::hub_service::{HubState, RedisEvent, RedisEventAction, broadcast_event};
use crate::memory::{
    MemoryBackend, memory_delete, memory_info, memory_list, memory_read, memory_save,
};
use crate::redis::{redis_delete, redis_info, redis_list, redis_read, redis_save};
use redis::aio::MultiplexedConnection;
use serde::Serialize;
use tokio::sync::RwLock;

#[derive(Debug)]
pub enum DbError {
    Redis(redis::RedisError),
    Message(String),
}

pub type DbResult<T> = Result<T, DbError>;

impl std::fmt::Display for DbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Redis(err) => write!(f, "{err}"),
            Self::Message(msg) => write!(f, "{msg}"),
        }
    }
}

impl std::error::Error for DbError {}

impl From<redis::RedisError> for DbError {
    fn from(value: redis::RedisError) -> Self {
        Self::Redis(value)
    }
}

#[derive(Debug, Serialize)]
pub struct DbArray {
    pub key: String,
    pub data: String,
    pub ttl: u64,     // sec to expire TTL
    pub etag: String, // md5 hash (data)
}

#[derive(serde::Serialize)]
pub enum Ttl {
    Sec(usize), // EX
    At(u64),    // EXAT (timestamp in seconds)
}

#[derive(Debug)]
pub enum SaveMode {
    Upsert,        // default: set or overwrite
    Insert,        // only if not exists (NX)
    Update,        // only if exists (XX)
    Equal(String), // only if md5 matches provided
}

pub fn error<T>(code: u16, msg: impl Into<String>) -> DbResult<T> {
    Err(DbError::Message(format!("{}: {}", code, msg.into())))
}

/// Check for redis-deprecated symbols
pub fn deprecated_symbol(s: &str) -> bool {
    s.chars().any(|c| {
        matches!(
            c,
            '*' | '?' | '[' | ']' | '\\' | '\0'..='\x1F' | '\x7F' | '"' | '\''
        )
    })
}

pub fn deprecated_symbol_error(s: &str) -> DbResult<()> {
    if deprecated_symbol(s) {
        error(412, "Deprecated symbol in key")
    } else {
        Ok(())
    }
}

#[derive(Clone)]
enum DbBackend {
    Redis(MultiplexedConnection),
    Memory {
        db: MemoryBackend,
        hub: Arc<RwLock<HubState>>,
    },
}

#[derive(Clone)]
pub struct Db {
    backend: DbBackend,
}

impl Db {
    pub fn new_redis(db: MultiplexedConnection) -> Self {
        Self {
            backend: DbBackend::Redis(db),
        }
    }

    pub fn new_memory(db: MemoryBackend, hub: Arc<RwLock<HubState>>) -> Self {
        Self {
            backend: DbBackend::Memory { db, hub },
        }
    }

    pub fn mode(&self) -> &'static str {
        match &self.backend {
            DbBackend::Redis(_) => "redis",
            DbBackend::Memory { .. } => "memory",
        }
    }

    pub async fn info(&self) -> DbResult<String> {
        match &self.backend {
            DbBackend::Memory { db, .. } => memory_info(db).await,
            DbBackend::Redis(conn) => {
                let mut c = conn.clone();
                redis_info(&mut c).await
            }
        }
    }

    pub async fn list(&self, key: &str) -> DbResult<Vec<DbArray>> {
        match &self.backend {
            DbBackend::Memory { db, .. } => memory_list(db, key).await,
            DbBackend::Redis(conn) => {
                let mut c = conn.clone();
                redis_list(&mut c, key).await
            }
        }
    }

    pub async fn read(&self, key: &str) -> DbResult<Option<DbArray>> {
        match &self.backend {
            DbBackend::Memory { db, .. } => memory_read(db, key).await,
            DbBackend::Redis(conn) => {
                let mut c = conn.clone();
                redis_read(&mut c, key).await
            }
        }
    }

    pub async fn save<V: AsRef<[u8]>>(
        &self,
        key: &str,
        value: V,
        ttl: Option<Ttl>,
        mode: Option<SaveMode>,
    ) -> DbResult<()> {
        match &self.backend {
            DbBackend::Memory { db, hub } => {
                memory_save(db, key, value.as_ref(), ttl, mode).await?;
                let value_str = std::str::from_utf8(value.as_ref())
                    .ok()
                    .map(|s| s.to_string());
                broadcast_event(
                    hub,
                    RedisEvent {
                        message: RedisEventAction::Set,
                        key: key.to_string(),
                    },
                    value_str,
                )
                .await;
                Ok(())
            }
            DbBackend::Redis(conn) => {
                let mut c = conn.clone();
                redis_save(&mut c, key, value.as_ref(), ttl, mode).await
            }
        }
    }

    pub async fn delete(&self, key: &str, mode: Option<SaveMode>) -> DbResult<bool> {
        match &self.backend {
            DbBackend::Memory { db, hub } => {
                let deleted = memory_delete(db, key, mode).await?;
                if deleted {
                    broadcast_event(
                        hub,
                        RedisEvent {
                            message: RedisEventAction::Del,
                            key: key.to_string(),
                        },
                        None,
                    )
                    .await;
                }
                Ok(deleted)
            }
            DbBackend::Redis(conn) => {
                let mut c = conn.clone();
                redis_delete(&mut c, key, mode).await
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hub_service::HubState;
    use crate::memory::MemoryBackend;
    use std::sync::Arc;
    use tokio::sync::RwLock;

    fn memory_db() -> Db {
        let hub = Arc::new(RwLock::new(HubState::default()));
        let backend = MemoryBackend::new();
        Db::new_memory(backend, hub)
    }

    #[tokio::test]
    async fn memory_db_mode_and_crud_work() {
        let db = memory_db();
        assert_eq!(db.mode(), "memory");

        db.save("workspace/tests/key1", b"hello", Some(Ttl::Sec(60)), None)
            .await
            .expect("save should succeed");

        let item = db
            .read("workspace/tests/key1")
            .await
            .expect("read should succeed")
            .expect("key should exist");
        assert_eq!(item.data, "hello");

        let list = db
            .list("workspace/tests/")
            .await
            .expect("list should succeed");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].key, "workspace/tests/key1");

        let deleted = db
            .delete("workspace/tests/key1", None)
            .await
            .expect("delete should succeed");
        assert!(deleted);
        assert!(
            db.read("workspace/tests/key1")
                .await
                .expect("read should succeed")
                .is_none()
        );
    }

    #[tokio::test]
    async fn memory_db_status_reports_memory_backend() {
        let hub = Arc::new(RwLock::new(HubState::default()));
        let db = Db::new_memory(MemoryBackend::new(), hub.clone());

        let info = hub.read().await.info_json(&db).await;
        assert_eq!(info["backend"], "memory");
        assert_eq!(info["status"], "OK");
    }
}
