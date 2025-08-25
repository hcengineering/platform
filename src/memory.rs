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

use crate::{
    config::CONFIG,
    hub_service::{HubState, RedisEvent, RedisEventAction, broadcast_event},
    redis::{RedisArray, SaveMode, Ttl, deprecated_symbol_error, error},
};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::{
    sync::RwLock,
    time::{self, Duration},
};

#[derive(Debug, Clone)]
struct Entry {
    data: String,
    ttl: u8,
}

#[derive(Clone, Default)]
pub struct MemoryBackend {
    inner: Arc<RwLock<HashMap<String, Entry>>>,
}

impl MemoryBackend {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn spawn_ticker(&self, hub_state: Arc<RwLock<HubState>>) {
        let inner = self.inner.clone();
        tokio::spawn(async move {
            let mut ticker = time::interval(Duration::from_secs(1));
            loop {
                ticker.tick().await;

                // lock
                let expired_keys: Vec<String> = {
                    let mut map = inner.write().await;

                    let mut expired: Vec<String> = Vec::new();
                    for (k, v) in map.iter_mut() {
                        if v.ttl > 0 {
                            v.ttl = v.ttl.saturating_sub(1);
                            if v.ttl == 0 {
                                expired.push(k.clone());
                            }
                        } else {
                            expired.push(k.clone());
                        }
                    }

                    for k in &expired {
                        map.remove(k);
                    }

                    expired
                }; // write-lock free

                for k in expired_keys {
                    broadcast_event(
                        &hub_state,
                        RedisEvent {
                            message: RedisEventAction::Expired,
                            key: k,
                        },
                        None,
                    )
                    .await;
                }
            }
        });
    }
}

/// memory_list(&backend, "prefix/") → Vec<RedisArray>
pub async fn memory_list(
    backend: &MemoryBackend,
    key_prefix: &str,
) -> redis::RedisResult<Vec<RedisArray>> {
    deprecated_symbol_error(key_prefix)?;
    if !key_prefix.ends_with('/') {
        return error(412, "Key must end with slash");
    }

    let map = backend.inner.read().await;

    let mut results = Vec::new();
    for (k, v) in map.iter() {
        if !k.starts_with(key_prefix) {
            continue;
        }

        if k.strip_prefix(key_prefix)
            .map_or(false, |s| s.contains('$'))
        {
            continue;
        }

        if v.ttl == 0 {
            continue;
        }

        results.push(RedisArray {
            key: k.clone(),
            data: v.data.clone(),
            expires_at: v.ttl as u64,
            etag: hex::encode(md5::compute(&v.data).0),
        });
    }

    Ok(results)
}

/// memory_info(&backend)
pub async fn memory_info(backend: &MemoryBackend) -> redis::RedisResult<String> {
    let map = backend.inner.read().await;
    let keys = map.len();
    let memory: usize = map.values().map(|v| v.data.len()).sum();
    Ok(format!("{} keys, {} bytes", keys, memory))
}

/// memory_read(&backend, "key")
pub async fn memory_read(
    backend: &MemoryBackend,
    key: &str,
) -> redis::RedisResult<Option<RedisArray>> {
    deprecated_symbol_error(key)?;
    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    let map = backend.inner.read().await;

    match map.get(key) {
        None => Ok(None),
        Some(entry) => {
            let data = entry.data.clone();
            let ttl = entry.ttl as u64;

            Ok(Some(RedisArray {
                key: key.to_string(),
                data: data.clone(),
                expires_at: ttl,
                etag: hex::encode(md5::compute(&data).0),
            }))
        }
    }
}

/// TTL in sec
fn compute_ttl_u8(ttl: Option<Ttl>) -> redis::RedisResult<u8> {
    let sec_usize = match ttl {
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

    if sec_usize == 0 {
        return error(400, "TTL must be > 0");
    }

    if sec_usize > CONFIG.max_ttl {
        return error(412, "TTL exceeds MAX_TTL");
    }

    let capped = sec_usize.min(u8::MAX as usize);
    Ok(capped as u8)
}

/// memory_save(&backend, "key", value, ttl, mode)
pub async fn memory_save<V: AsRef<[u8]>>(
    backend: &MemoryBackend,
    key: &str,
    bytes_value: V,
    ttl: Option<Ttl>,
    mode: Option<SaveMode>,
) -> redis::RedisResult<()> {
    // u8 - String
    let value = match std::str::from_utf8(bytes_value.as_ref()) {
        Ok(s) => s.to_string(),
        Err(_) => return error(400, "Value must be valid UTF-8"),
    };

    // If max_size != 0 and value size > max_size, return error
    let max_size = CONFIG.max_size.unwrap_or(0);
    if max_size != 0 && value.len() > max_size {
        return error(
            400,
            format!("Value in memory mode must be less than {} bytes", max_size),
        );
    }

    deprecated_symbol_error(key)?;
    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    let sec_u8 = compute_ttl_u8(ttl)?;
    let val = value.to_string();

    let mut map = backend.inner.write().await;

    let mode = mode.unwrap_or(SaveMode::Upsert);

    match mode {
        SaveMode::Upsert => {
            map.insert(
                key.to_string(),
                Entry {
                    data: val,
                    ttl: sec_u8,
                },
            );
        }
        SaveMode::Insert => {
            if map.contains_key(key) {
                return error(412, "Insert: key already exists");
            }
            map.insert(
                key.to_string(),
                Entry {
                    data: val,
                    ttl: sec_u8,
                },
            );
        }
        SaveMode::Update => {
            let Some(existing) = map.get_mut(key) else {
                return error(404, "Update: key does not exist");
            };
            *existing = Entry {
                data: val,
                ttl: sec_u8,
            };
        }
        SaveMode::Equal(ref expected_md5) => {
            let Some(existing) = map.get_mut(key) else {
                return error(404, "Equal: key does not exist");
            };
            let actual_md5 = hex::encode(md5::compute(&existing.data).0);
            if &actual_md5 != expected_md5 {
                return error(
                    412,
                    format!(
                        "md5 mismatch, current: {}, expected: {}",
                        actual_md5, expected_md5
                    ),
                );
            }
            *existing = Entry {
                data: val,
                ttl: sec_u8,
            };
        }
    }

    Ok(())
}

/// memory_delete(&backend, "key", mode)
pub async fn memory_delete(
    backend: &MemoryBackend,
    key: &str,
    mode: Option<SaveMode>,
) -> redis::RedisResult<bool> {
    deprecated_symbol_error(key)?;
    if key.ends_with('/') {
        return error(412, "Key must not end with a slash");
    }

    let mut map = backend.inner.write().await;
    let mode = mode.unwrap_or(SaveMode::Upsert);

    match mode {
        SaveMode::Insert => {
            return error(412, "Insert mode is not supported for delete");
        }
        SaveMode::Update | SaveMode::Upsert => {
            let existed = map.remove(key).is_some();
            Ok(existed)
        }
        SaveMode::Equal(ref expected_md5) => {
            match map.get(key) {
                None => return error(404, "Equal: key does not exist"),
                Some(existing) => {
                    let actual_md5 = hex::encode(md5::compute(&existing.data).0);
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
            let existed = map.remove(key).is_some();
            if !existed {
                // WHF?!
                return error(404, "Delete: key does not exist");
            }
            Ok(true)
        }
    }
}
