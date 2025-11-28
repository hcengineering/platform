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
    db::{DbArray, DbResult, SaveMode, Ttl, deprecated_symbol_error, error},
    hub_service::{HubState, RedisEvent, RedisEventAction},
};

use redis::{
    Client, ConnectionInfo, ProtocolVersion, RedisConnectionInfo, RedisResult, ToRedisArgs,
    aio::MultiplexedConnection,
};
// use serde::Serialize;

use crate::hub_service::broadcast_event;

static MAX_LOOP_COUNT: usize = 1000; // to avoid infinite loops

pub async fn push_event(
    hub_state: &Arc<RwLock<HubState>>,
    redis: &mut MultiplexedConnection,
    ev: RedisEvent,
) {
    // Value only for Set
    let mut value: Option<String> = None;
    if matches!(ev.message, RedisEventAction::Set) {
        match ::redis::cmd("GET")
            .arg(&ev.key)
            .query_async::<Option<String>>(redis)
            .await
        {
            Ok(v) => value = v,
            Err(e) => tracing::warn!("redis GET {} failed: {}", &ev.key, e),
        }
    }

    broadcast_event(hub_state, ev, value).await;
}

/// redis_info(&connection)
pub async fn redis_info(conn: &mut MultiplexedConnection) -> redis::RedisResult<String> {
    let info: String = redis::cmd("INFO").query_async(conn).await?;

    let mut redis_keys: Option<usize> = None;
    let mut redis_bytes: Option<usize> = None;

    for line in info.lines() {
        if line.starts_with("db0:") {
            // parsing: db0:keys=152,expires=10,avg_ttl=456789
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
) -> redis::RedisResult<Vec<DbArray>> {
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
                results.push(DbArray {
                    key: k,
                    data: value.clone(),
                    ttl: ttl as u64,
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
) -> redis::RedisResult<Option<DbArray>> {
    deprecated_symbol_error(key)?;

    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    let data: Option<String> = redis::cmd("GET").arg(key).query_async(conn).await?;

    let Some(data) = data else {
        return Ok(None);
    };

    let ttl: i64 = redis::cmd("TTL").arg(key).query_async(conn).await?;
    match ttl {
        -1 => return error(500, "TTL not set"),
        -2 => return error(500, "Key not found"),
        x if x < 0 => return error(500, "Unknown TTL error"),
        _ => {} // ttl >= 0, ок
    }

    Ok(Some(DbArray {
        key: key.to_string(),
        data: data.clone(),
        ttl: ttl as u64,
        etag: hex::encode(md5::compute(&data).0),
    }))
}

/// redis_save(&connection,key,value,[ttl?],[mode?])
pub async fn redis_save<T: ToRedisArgs>(
    conn: &mut MultiplexedConnection,
    key: &str,
    value: T,
    ttl: Option<Ttl>,
    mode: Option<SaveMode>,
) -> DbResult<()> {
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

    let mode = mode.unwrap_or(SaveMode::Upsert);

    match mode {
        SaveMode::Upsert | SaveMode::Insert | SaveMode::Update => {
            let mut cmd = redis::cmd("SET");
            cmd.arg(key).arg(value).arg("EX").arg(sec);
            match mode {
                SaveMode::Insert => {
                    cmd.arg("NX");
                } // if NOT Exist
                SaveMode::Update => {
                    cmd.arg("XX");
                } // if Exist
                _ => {}
            };
            let result: Option<String> = cmd.query_async(conn).await?;
            if result.is_none() {
                return match mode {
                    SaveMode::Insert => error(412, "Insert: key already exists"),
                    SaveMode::Update => error(404, "Update: key does not exist"),
                    _ => error(500, "Unexpected Redis SET failure"),
                };
            }
            Ok(())
        }

        SaveMode::Equal(ref expected_md5) => {
            let mut loop_count = 0;
            loop {
                let _: () = redis::cmd("WATCH").arg(key).query_async(conn).await?;

                let current: Option<String> = redis::cmd("GET").arg(key).query_async(conn).await?;
                let existing = match current {
                    None => {
                        let _: () = redis::cmd("UNWATCH").query_async(conn).await?;
                        return error(404, "Equal: key does not exist");
                    }
                    Some(v) => v,
                };
                // check md5
                let actual_md5 = hex::encode(md5::compute(&existing).0);
                if &actual_md5 != expected_md5 {
                    let _: () = redis::cmd("UNWATCH").query_async(conn).await?;
                    return error(
                        412,
                        format!(
                            "md5 mismatch, current: {}, expected: {}",
                            actual_md5, expected_md5
                        ),
                    );
                }

                // MULTI/EXEC
                let mut pipe = redis::pipe();
                pipe.atomic()
                    .cmd("SET")
                    .arg(key)
                    .arg(value.to_redis_args())
                    .arg("EX")
                    .arg(sec);

                let result: Option<String> = pipe.query_async(conn).await?;
                if result.is_some() {
                    break;
                }
                // None -> key was changed -> repeat loop
                loop_count += 1;
                if loop_count > MAX_LOOP_COUNT {
                    let _: () = redis::cmd("UNWATCH").query_async(conn).await?;
                    return error(500, "Something wrong: too many retries on Equal mode");
                }
            }

            Ok(())
        }
    }
}

/// redis_delete(&connection,key)
pub async fn redis_delete(
    conn: &mut MultiplexedConnection,
    key: &str,
    mode: Option<SaveMode>,
) -> RedisResult<bool> {
    deprecated_symbol_error(key)?;

    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    let mode = mode.unwrap_or(SaveMode::Upsert);

    match mode {
        SaveMode::Update | SaveMode::Upsert => {
            let deleted: i32 = redis::cmd("DEL").arg(key).query_async(conn).await?;
            return Ok(deleted > 0);
        }

        SaveMode::Equal(ref expected_md5) => {
            let mut loop_count = 0;
            loop {
                let _: () = redis::cmd("WATCH").arg(key).query_async(conn).await?;

                let current: Option<String> = redis::cmd("GET").arg(key).query_async(conn).await?;
                let existing = match current {
                    None => {
                        let _: () = redis::cmd("UNWATCH").query_async(conn).await?;
                        return error(404, "Equal: key does not exist");
                    }
                    Some(val) => val,
                };

                // check md5
                let actual_md5 = hex::encode(md5::compute(&existing).0);
                if &actual_md5 != expected_md5 {
                    let _: () = redis::cmd("UNWATCH").query_async(conn).await?;
                    return error(
                        412,
                        format!(
                            "md5 mismatch, current: {}, expected: {}",
                            actual_md5, expected_md5
                        ),
                    );
                }

                let mut pipe = redis::pipe();
                pipe.atomic().cmd("DEL").arg(key);

                let deleted: Option<i32> = pipe.query_async(conn).await?;
                if let Some(n) = deleted {
                    return Ok(n > 0);
                }
                // None -> key was changed -> repeat loop
                loop_count += 1;
                if loop_count > MAX_LOOP_COUNT {
                    let _: () = redis::cmd("UNWATCH").query_async(conn).await?;
                    return error(500, "Something wrong: too many retries on Equal mode");
                }
            }
        }

        SaveMode::Insert => {
            return error(412, "Insert mode is not supported for delete");
        }
    }
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

        // parsing: "__keyevent@0__:set" → event="set", db=0; payload = key
        let event = channel.rsplit(':').next().unwrap_or("");
        let message = match event {
            "set" => RedisEventAction::Set,
            "del" => RedisEventAction::Del,
            "unlink" => RedisEventAction::Unlink,
            "expired" => RedisEventAction::Expired,
            other => RedisEventAction::Other(other.to_string()),
        };

        Ok(RedisEvent {
            // db,
            key: payload.clone(),
            message,
        })
    }
}

pub async fn receiver(
    redis_client: Client,
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
                push_event(&hub_state, &mut redis, ev); // .await;
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

        debug!(urls=?urls, service=CONFIG.redis_service, "sentinel configuration");

        let mut sentinel = SentinelClientBuilder::new(
            urls,
            CONFIG.redis_service.to_owned(),
            SentinelServerType::Master,
        )
        .unwrap()
        .set_client_to_redis_protocol(ProtocolVersion::RESP3)
        .set_client_to_redis_db(11)
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
