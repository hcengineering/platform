use std::sync::Arc;

use crate::{
    hub_service::{HubState, RedisEvent, RedisEventAction, broadcast_event},
    memory::{MemoryBackend, memory_delete, memory_info, memory_list, memory_read, memory_save},
    redis::{
        RedisArray, SaveMode, Ttl, redis_delete, redis_info, redis_list, redis_read, redis_save,
    },
};
use ::redis::aio::MultiplexedConnection;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct Db {
    inner: DbInner,
    hub: Arc<RwLock<HubState>>,
}

#[derive(Clone)]
enum DbInner {
    Memory(MemoryBackend),
    Redis(MultiplexedConnection),
}

impl Db {
    pub fn new_memory(m: MemoryBackend, hub: Arc<RwLock<HubState>>) -> Self {
        Self {
            inner: DbInner::Memory(m),
            hub,
        }
    }
    pub fn new_redis(c: MultiplexedConnection, hub: Arc<RwLock<HubState>>) -> Self {
        Self {
            inner: DbInner::Redis(c),
            hub,
        }
    }

    pub async fn info(&self) -> redis::RedisResult<String> {
        // String {
        // let res =
        match &self.inner {
            DbInner::Memory(m) => memory_info(m).await,
            DbInner::Redis(conn) => {
                let mut c = conn.clone();
                redis_info(&mut c).await
            }
        }
        // };
        // res.unwrap_or_else(|_| "error".to_string())
    }

    pub async fn list(&self, key: &str) -> redis::RedisResult<Vec<RedisArray>> {
        match &self.inner {
            DbInner::Memory(m) => memory_list(m, key).await,
            DbInner::Redis(conn) => {
                let mut c = conn.clone();
                redis_list(&mut c, key).await
            }
        }
    }

    pub async fn read(&self, key: &str) -> redis::RedisResult<Option<RedisArray>> {
        match &self.inner {
            DbInner::Memory(m) => memory_read(m, key).await,
            DbInner::Redis(conn) => {
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
    ) -> redis::RedisResult<()> {
        println!(
            "Db::save key=[{}] value=[{:?}] mode=[{:?}]",
            key,
            value.as_ref(),
            mode
        );

        match &self.inner {
            DbInner::Memory(m) => {
                memory_save(m, key, value.as_ref(), ttl, mode).await?;
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
                Ok(())
            }
            DbInner::Redis(conn) => {
                let mut c = conn.clone();
                redis_save(&mut c, key, value.as_ref(), ttl, mode).await
            }
        }
    }

    pub async fn delete(&self, key: &str, mode: Option<SaveMode>) -> redis::RedisResult<bool> {
        match &self.inner {
            DbInner::Memory(m) => {
                let deleted = memory_delete(m, key, mode).await?;
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
                Ok(deleted)
            }
            DbInner::Redis(conn) => {
                let mut c = conn.clone();
                redis_delete(&mut c, key, mode).await
            }
        }
    }
}
