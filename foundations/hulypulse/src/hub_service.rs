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

use crate::config::CONFIG;
use redis::aio::MultiplexedConnection;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::RwLock;

fn subscription_matches(sub_key: &str, key: &str) -> bool {
    if sub_key == key {
        return true;
    }
    if sub_key.ends_with('/') && key.starts_with(sub_key) {
        let rest = &key[sub_key.len()..];
        return !rest.contains('$');
    }
    false
}

#[derive(Clone, Serialize, Debug)]
pub struct ServerMessage {
    #[serde(flatten)]
    pub event: RedisEvent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

pub type SessionId = u64;
static NEXT_ID: AtomicU64 = AtomicU64::new(1);
pub fn new_session_id() -> SessionId {
    NEXT_ID.fetch_add(1, Ordering::SeqCst)
}

#[derive(Debug, Clone, Serialize)]
pub enum RedisEventAction {
    Set,
    Del,
    Unlink,
    Expired,
    Other(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct RedisEvent {
    //    pub db: u32,
    pub message: RedisEventAction,
    pub key: String,
}

#[derive(Default)] // Debug, 
pub struct HubState {
    sessions: HashMap<SessionId, actix_ws::Session>,
    subs: HashMap<String, HashSet<SessionId>>,
    heartbeats: HashMap<SessionId, std::time::Instant>,
}

impl HubState {
    pub fn renew_heartbeat(&mut self, session_id: SessionId) {
        if self.sessions.contains_key(&session_id) {
            let now = std::time::Instant::now();
            self.heartbeats.insert(session_id, now);
        }
    }

    pub fn connect(&mut self, session_id: SessionId, session: actix_ws::Session) {
        self.sessions.insert(session_id, session);
        self.heartbeats
            .insert(session_id, std::time::Instant::now());
    }

    pub fn disconnect(&mut self, session_id: SessionId) {
        self.sessions.remove(&session_id);
        self.heartbeats.remove(&session_id);
        self.subs.retain(|_, ids| {
            ids.remove(&session_id);
            !ids.is_empty()
        });
    }

    pub fn subscribe(&mut self, session_id: SessionId, key: String) {
        self.subs.entry(key).or_default().insert(session_id);
    }

    pub fn unsubscribe(&mut self, session_id: SessionId, key: String) {
        if let Some(set) = self.subs.get_mut(&key) {
            set.remove(&session_id);
            if set.is_empty() {
                self.subs.remove(&key);
            }
        }
    }
    pub fn unsubscribe_all(&mut self, session_id: SessionId) {
        self.subs.retain(|_, ids| {
            ids.remove(&session_id);
            !ids.is_empty()
        });
    }

    pub fn subscribe_list(&self, session_id: SessionId) -> Vec<String> {
        self.subs
            .iter()
            .filter_map(|(key, ids)| {
                if ids.contains(&session_id) {
                    Some(key.clone())
                } else {
                    None
                }
            })
            .collect()
    }

    pub fn count(&self) -> usize {
        self.sessions.len()
    }

    pub fn recipients_for_key(&self, key: &str) -> Vec<actix_ws::Session> {
        let mut out = Vec::new();
        for (sub_key, set) in &self.subs {
            if subscription_matches(sub_key, key) {
                for sid in set {
                    if let Some(r) = self.sessions.get(sid) {
                        out.push(r.clone());
                    }
                }
            }
        }
        out
    }
}

// Send messages about new db events
pub async fn broadcast_event(
    hub_state: &Arc<RwLock<HubState>>,
    ev: RedisEvent,
    value: Option<String>,
) {
    // Collect
    let recipients: Vec<actix_ws::Session> = { hub_state.read().await.recipients_for_key(&ev.key) };
    if recipients.is_empty() {
        return;
    }

    // Send
    let payload = ServerMessage { event: ev, value };
    for mut rcpt in recipients {
        // let _ = rcpt.do_send(payload.clone());
        let json = serde_json::to_string(&payload).unwrap();
        let _ = rcpt.text(json).await;
    }
}

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

pub fn check_heartbeat(hub_state: Arc<RwLock<HubState>>) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(std::time::Duration::from_secs(2));
        loop {
            ticker.tick().await;

            let now = std::time::Instant::now();
            let timeout = std::time::Duration::from_secs(CONFIG.heartbeat_timeout);
            let timelimit = now - timeout;

            let hub = hub_state.read().await;
            let expired: Vec<actix_ws::Session> = hub
                .heartbeats
                .iter()
                .filter_map(|(&sid, &last_beat)| {
                    if last_beat < timelimit {
                        hub.sessions.get(&sid).cloned()
                    } else {
                        None
                    }
                })
                .collect();

            drop(hub);

            if !expired.is_empty() {
                for addr in &expired {
                    // addr.do_send(crate::handlers_ws::ForceDisconnect);
                    let _ = addr.clone().close(None).await;
                }
            }
        }
    });
}
