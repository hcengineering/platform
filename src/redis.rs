//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use ::redis::Msg;
use tokio::sync::RwLock;
use tokio_stream::StreamExt;
use tracing::*;

use crate::{
    config::{CONFIG, RedisMode},
    hub_service::{HubState, RedisEvent, RedisEventAction, push_event},
};

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

use redis::{
    Client, ConnectionInfo, ProtocolVersion, RedisConnectionInfo, RedisResult, ToRedisArgs,
    aio::MultiplexedConnection,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct RedisArray {
    pub key: String,
    pub data: String,
    pub expires_at: u64, // sec to expire TTL
    pub etag: String,    // md5 hash (data)
}

/// return Error
pub fn error<T>(code: u16, msg: impl Into<String>) -> redis::RedisResult<T> {
    let msg = msg.into();
    let full = format!("{}: {}", code, msg);
    Err(redis::RedisError::from((
        redis::ErrorKind::ExtensionError,
        "",
        full,
    )))
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

pub fn deprecated_symbol_error(s: &str) -> redis::RedisResult<()> {
    if deprecated_symbol(s) {
        error(412, "Deprecated symbol in key")
    } else {
        Ok(())
    }
}

// if CONFIG.memory_mode == Some(true) {

//     // memory_status
//     let map = hub_state.read().await;
//     let memory_keys = format!("{} keys in memory", map.len());
//     let memory_bytes = format!("{} bytes used", map.values().map(|v| v.data.len()).sum::<usize>());
//     format!("{} keys, {} bytes", memory_keys, memory_bytes)
// } else {
//     let mut conn = db_backend.redis_connection.lock().await;
// };

/// redis_info(&connection)
pub async fn redis_info(conn: &mut MultiplexedConnection) -> redis::RedisResult<String> {
    let info: String = redis::cmd("INFO").query_async(conn).await?;

    // Разбираем её построчно
    let mut redis_keys: Option<usize> = None;
    let mut redis_bytes: Option<usize> = None;

    for line in info.lines() {
        if line.starts_with("db0:") {
            // db0:keys=152,expires=10,avg_ttl=456789
            if let Some(keys_part) = line.split(',').find(|s| s.starts_with("keys=")) {
                if let Some(val) = keys_part.strip_prefix("keys=") {
                    redis_keys = val.parse::<usize>().ok();
                }
            }
        }
        if line.starts_with("used_memory:") {
            if let Some(val) = line.strip_prefix("used_memory:") {
                redis_bytes = val.parse::<usize>().ok();
            }
        }
    }

    Ok(format!(
        "{} keys, {} bytes",
        redis_keys.unwrap_or(0),
        redis_bytes.unwrap_or(0)
    ))
}

/// redis_list(&connection,prefix)
pub async fn redis_list(
    conn: &mut MultiplexedConnection,
    key: &str,
) -> redis::RedisResult<Vec<RedisArray>> {
    deprecated_symbol_error(key)?;
    if !key.ends_with('/') {
        return error(412, "Key must end with slash");
    }
    let pattern = format!("{key}*");

    let mut cursor = 0u64;
    let mut results = Vec::new();

    loop {
        let mut cmd = redis::cmd("SCAN");
        cmd.arg(cursor);
        cmd.arg("MATCH").arg(&pattern);
        // cmd.arg("COUNT").arg(100); // Optionally adjust batch size

        let (next_cursor, keys): (u64, Vec<String>) = cmd.query_async(conn).await?;

        for k in keys {
            // Check for $-security path
            if k.strip_prefix(key).map_or(false, |s| s.contains('$')) {
                continue;
            }

            // Get value
            let value: Option<String> = redis::cmd("GET").arg(&k).query_async(conn).await?;
            let Some(value) = value else {
                continue;
            }; // Old and deleted

            // Get TTL
            let ttl: i64 = redis::cmd("TTL").arg(&k).query_async(conn).await?;
            if ttl >= 0 {
                results.push(RedisArray {
                    key: k,
                    data: value.clone(),
                    expires_at: ttl as u64,
                    etag: hex::encode(md5::compute(&value).0),
                });
            }
        }

        if next_cursor == 0 {
            break;
        }
        cursor = next_cursor;
    }

    Ok(results)
}

/// redis_read(&connection,key)
pub async fn redis_read(
    conn: &mut MultiplexedConnection,
    key: &str,
) -> redis::RedisResult<Option<RedisArray>> {
    deprecated_symbol_error(key)?;

    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    let data: Option<String> = redis::cmd("GET").arg(key).query_async(conn).await?;

    let Some(data) = data else {
        return Ok(None);
    };

    let ttl: i64 = redis::cmd("TTL").arg(key).query_async(conn).await?;
    if ttl == -1 {
        return error(500, "TTL not set");
    }
    if ttl == -2 {
        return error(500, "Key not found");
    }
    if ttl < 0 {
        return error(500, "Unknown TTL error");
    }

    Ok(Some(RedisArray {
        key: key.to_string(),
        data: data.clone(),
        expires_at: ttl as u64,
        etag: hex::encode(md5::compute(&data).0),
    }))
}

/// TTL sec
/// redis_save(&mut conn, "key", "val", Some(Ttl::Sec(300)), Some(SaveMode::Insert)).await?;
///
/// TTL at
/// let at_unixtime: u64 = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() + 600;
/// redis_save(&mut conn, "key", "val", Some(Ttl::At(at_unixtime)), Some(SaveMode::Update)).await?;
///
/// w/o TTL (CONFIG.max_ttl)
/// redis_save(&mut conn, "key", "val", None, None).await?;

pub async fn redis_save<T: ToRedisArgs>(
    conn: &mut MultiplexedConnection,
    key: &str,
    value: T,
    ttl: Option<Ttl>,
    mode: Option<SaveMode>,
) -> RedisResult<()> {
    deprecated_symbol_error(&key)?;

    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    // If max_size != 0 and value size > max_size, return error
    let max_size = CONFIG.max_size.unwrap_or(0);
    if max_size != 0 && value.to_redis_args().iter().map(|a| a.len()).sum::<usize>() > max_size {
        return error(
            400,
            format!("Value in memory mode must be less than {} bytes", max_size),
        );
    }

    // TTL logic
    let sec = match ttl {
        Some(Ttl::Sec(secs)) => secs,
        Some(Ttl::At(timestamp)) => {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            if timestamp <= now {
                return error(400, "TTL timestamp exceeds MAX_TTL limit");
            }
            (timestamp - now) as usize
        }
        None => CONFIG.max_ttl,
    };
    if sec == 0 {
        return error(400, "TTL must be > 0");
    }
    if sec > CONFIG.max_ttl {
        return error(412, "TTL exceeds MAX_TTL");
    }

    let mut cmd = redis::cmd("SET");
    cmd.arg(key).arg(value).arg("EX").arg(sec);

    // Mode variants
    let mode = mode.unwrap_or(SaveMode::Upsert);

    match mode {
        SaveMode::Upsert => {} // none

        SaveMode::Insert => {
            cmd.arg("NX");
        } // if NOT Exist

        SaveMode::Update => {
            cmd.arg("XX");
        } // if Exist

        SaveMode::Equal(ref expected_md5) => {
            // if md5 === actual_md5
            let current_value: Option<String> =
                redis::cmd("GET").arg(key).query_async(conn).await?;
            if let Some(existing) = current_value {
                let actual_md5 = hex::encode(md5::compute(&existing).0);
                if &actual_md5 != expected_md5 {
                    return error(
                        412,
                        format!(
                            "md5 mismatch, current: {}, expected: {}",
                            actual_md5, expected_md5
                        ),
                    );
                }
            } else {
                return error(404, "Equal: key does not exist");
            }
        }
    }

    // execute
    let result: Option<String> = cmd.query_async(conn).await?;

    if result.is_none() {
        match mode {
            SaveMode::Insert => return error(412, "Insert: key already exists"),
            SaveMode::Update => return error(404, "Update: key does not exist"),
            _ => return error(500, "Unexpected Redis SET failure"),
        }
    }

    Ok(())
}

/// redis_delete(&connection,key)
pub async fn redis_delete(
    conn: &mut MultiplexedConnection,
    key: &str,
    mode: Option<SaveMode>, // <— добавили
) -> RedisResult<bool> {
    deprecated_symbol_error(key)?;

    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    let mode = mode.unwrap_or(SaveMode::Upsert);

    match mode {
        SaveMode::Equal(ref expected_md5) => {
            let current: Option<String> = redis::cmd("GET").arg(key).query_async(conn).await?;
            match current {
                None => return error(404, "Equal: key does not exist"),
                Some(val) => {
                    let actual_md5 = hex::encode(md5::compute(&val).0);
                    if &actual_md5 != expected_md5 {
                        return error(
                            412,
                            format!(
                                "md5 mismatch, current: {}, expected: {}",
                                actual_md5, expected_md5
                            ),
                        );
                    }
                }
            }
        }
        SaveMode::Insert => {
            return error(412, "Insert mode is not supported for delete");
        }
        SaveMode::Update | SaveMode::Upsert => {}
    }

    let deleted: i32 = redis::cmd("DEL").arg(key).query_async(conn).await?;

    if deleted == 0 && matches!(mode, SaveMode::Equal(_)) {
        return error(404, "Delete: key does not exist");
    }

    Ok(deleted > 0)
}

impl TryFrom<Msg> for RedisEvent {
    type Error = anyhow::Error;

    fn try_from(msg: Msg) -> Result<Self, Self::Error> {
        let channel = match msg.get_channel::<String>() {
            Ok(c) => c,
            Err(e) => {
                anyhow::bail!("[redis_events] bad channel: {e}");
            }
        };
        let payload = match msg.get_payload::<String>() {
            Ok(p) => p,
            Err(e) => {
                anyhow::bail!("[redis_events] bad payload: {e}");
            }
        };

        // "__keyevent@0__:set" → event="set", db=0; payload = key
        let event = channel.rsplit(':').next().unwrap_or("");
        let message = match event {
            "set" => RedisEventAction::Set,
            "del" => RedisEventAction::Del,
            "unlink" => RedisEventAction::Unlink,
            "expired" => RedisEventAction::Expired,
            other => RedisEventAction::Other(other.to_string()),
        };

        // let db = channel
        //     .find('@')
        //     .and_then(|at| channel.get(at + 1..))
        //     .and_then(|rest| rest.find("__:").map(|end| &rest[..end]))
        //     .and_then(|s| s.parse::<u32>().ok())
        //     .unwrap_or(0);

        Ok(RedisEvent {
            // db,
            key: payload.clone(),
            message,
        })
    }
}

pub async fn receiver(
    redis_client: Client,
    // hub: HubServiceHandle
    hub_state: Arc<RwLock<HubState>>,
) -> anyhow::Result<()> {
    let mut redis = redis_client.get_multiplexed_async_connection().await?;
    let mut pubsub = redis_client.get_async_pubsub().await?;

    let _: String = ::redis::cmd("CONFIG")
        .arg("SET")
        .arg("notify-keyspace-events")
        .arg("E$gx")
        .query_async(&mut redis)
        .await?;

    for pattern in [
        "__keyevent@*__:set",
        "__keyevent@*__:del",
        "__keyevent@*__:unlink",
        "__keyevent@*__:expired",
    ] {
        pubsub.psubscribe(pattern).await?;
    }

    let mut messages = pubsub.on_message();

    while let Some(message) = messages.next().await {
        match RedisEvent::try_from(message) {
            Ok(ev) => {
                // debug!("redis event: {ev:#?}");

                push_event(&hub_state, &mut redis, ev).await;
            }
            Err(e) => {
                warn!("invalid redis message: {e}");
            }
        }
    }

    Ok(())
}

/// redis_connect()
pub async fn client() -> anyhow::Result<Client> {
    let default_port = match CONFIG.redis_mode {
        RedisMode::Sentinel => 6379,
        RedisMode::Direct => 6380,
    };

    let urls = CONFIG
        .redis_urls
        .iter()
        .map(|url| {
            redis::ConnectionAddr::Tcp(
                url.host().unwrap().to_string(),
                url.port().unwrap_or(default_port),
            )
        })
        .collect::<Vec<_>>();

    if CONFIG.redis_mode == RedisMode::Sentinel {
        use redis::sentinel::{SentinelClientBuilder, SentinelServerType};

        let mut sentinel = SentinelClientBuilder::new(
            urls,
            CONFIG.redis_service.to_owned(),
            SentinelServerType::Master,
        )
        .unwrap()
        .set_client_to_redis_protocol(ProtocolVersion::RESP3)
        .set_client_to_redis_db(0)
        .set_client_to_redis_password(CONFIG.redis_password.clone())
        .set_client_to_sentinel_password(CONFIG.redis_password.clone())
        .build()?;

        let client = sentinel.async_get_client().await?;

        Ok(client)
    } else {
        let single = urls
            .first()
            .ok_or_else(|| anyhow::anyhow!("No redis URL provided"))?;

        let redis_connection_info = RedisConnectionInfo {
            db: 0,
            username: None,
            password: Some(CONFIG.redis_password.clone()),
            protocol: ProtocolVersion::RESP3,
        };

        let connection_info = ConnectionInfo {
            addr: single.clone(),
            redis: redis_connection_info,
        };

        let client = Client::open(connection_info)?;

        Ok(client)
    }
}
