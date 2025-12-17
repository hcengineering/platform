#[cfg(not(feature = "db-redis"))]
use std::sync::Arc;

#[cfg(not(feature = "db-redis"))]
use crate::hub_service::{HubState, RedisEvent, RedisEventAction, broadcast_event};

#[cfg(not(feature = "db-redis"))]
use crate::memory::{
    MemoryBackend, memory_delete, memory_info, memory_list, memory_read, memory_save,
};

#[cfg(feature = "db-redis")]
use crate::redis::{redis_delete, redis_info, redis_list, redis_read, redis_save};

#[cfg(feature = "db-redis")]
use ::redis::aio::MultiplexedConnection;

#[cfg(feature = "db-redis")]
pub type DbError = redis::RedisError;

#[cfg(not(feature = "db-redis"))]
#[derive(Debug)]
pub struct DbError(pub String);

pub type DbResult<T> = Result<T, DbError>;

#[cfg(not(feature = "db-redis"))]
impl std::fmt::Display for DbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(not(feature = "db-redis"))]
impl std::error::Error for DbError {}

#[cfg(not(feature = "db-redis"))]
use tokio::sync::RwLock;

use serde::Serialize;

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

/// return Error
// pub fn error<T>(code: u16, msg: impl Into<String>) -> DbResult<T> {
//     let msg = msg.into();
//     let full = format!("{}: {}", code, msg);
//     Err(redis::RedisError::from((
//         redis::ErrorKind::ExtensionError,
//         "",
//         full,
//     )))
// }

pub fn error<T>(code: u16, msg: impl Into<String>) -> DbResult<T> {
    let msg = format!("{}: {}", code, msg.into());

    #[cfg(feature = "db-redis")]
    {
        return Err(redis::RedisError::from((
            redis::ErrorKind::ExtensionError,
            "",
            msg,
        )));
    }

    #[cfg(not(feature = "db-redis"))]
    {
        return Err(DbError(msg));
    }
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
pub struct Db {
    #[cfg(feature = "db-redis")]
    db: MultiplexedConnection,
    #[cfg(not(feature = "db-redis"))]
    db: MemoryBackend,
    #[cfg(not(feature = "db-redis"))]
    hub: Arc<RwLock<HubState>>,
}

impl Db {
    pub fn new_db(
        #[cfg(not(feature = "db-redis"))] db: MemoryBackend,
        #[cfg(feature = "db-redis")] db: MultiplexedConnection,
        #[cfg(not(feature = "db-redis"))] hub: Arc<RwLock<HubState>>,
    ) -> Self {
        Self {
            db,
            #[cfg(not(feature = "db-redis"))]
            hub,
        }
    }

    pub async fn info(&self) -> DbResult<String> {
        #[cfg(not(feature = "db-redis"))]
        return memory_info(&self.db).await;

        #[cfg(feature = "db-redis")]
        {
            let mut c = self.db.clone();
            redis_info(&mut c).await
        }
    }

    pub async fn list(&self, key: &str) -> DbResult<Vec<DbArray>> {
        #[cfg(not(feature = "db-redis"))]
        return memory_list(&self.db, key).await;

        #[cfg(feature = "db-redis")]
        {
            let mut c = self.db.clone();
            redis_list(&mut c, key).await
        }
    }

    pub async fn read(&self, key: &str) -> DbResult<Option<DbArray>> {
        #[cfg(not(feature = "db-redis"))]
        return memory_read(&self.db, key).await;

        #[cfg(feature = "db-redis")]
        {
            let mut c = self.db.clone();
            redis_read(&mut c, key).await
        }
    }

    pub async fn save<V: AsRef<[u8]>>(
        &self,
        key: &str,
        value: V,
        ttl: Option<Ttl>,
        mode: Option<SaveMode>,
    ) -> DbResult<()> {
        #[cfg(not(feature = "db-redis"))]
        {
            memory_save(&self.db, key, value.as_ref(), ttl, mode).await?;
            // Send events
            let value_str = std::str::from_utf8(value.as_ref())
                .ok()
                .map(|s| s.to_string());
            broadcast_event(
                &self.hub,
                RedisEvent {
                    message: RedisEventAction::Set,
                    key: key.to_string(),
                },
                value_str,
            )
            .await;
            return Ok(());
        }

        #[cfg(feature = "db-redis")]
        {
            let mut c = self.db.clone();
            redis_save(&mut c, key, value.as_ref(), ttl, mode).await
        }
    }

    pub async fn delete(&self, key: &str, mode: Option<SaveMode>) -> DbResult<bool> {
        #[cfg(not(feature = "db-redis"))]
        {
            let deleted = memory_delete(&self.db, key, mode).await?;
            if deleted {
                broadcast_event(
                    &self.hub,
                    RedisEvent {
                        message: RedisEventAction::Del,
                        key: key.to_string(),
                    },
                    None,
                )
                .await;
            }
            return Ok(deleted);
        }

        #[cfg(feature = "db-redis")]
        {
            let mut c = self.db.clone();
            redis_delete(&mut c, key, mode).await
        }
    }
}
