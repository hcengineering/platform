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

use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::RwLock;

use serde_json::{Value, json};

use crate::db::Db;

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
    serverping: HashMap<SessionId, std::time::Instant>,
    abort_handles: HashMap<SessionId, AbortHandle>,
    // client_ids: HashMap<SessionId, String>,
    #[cfg(feature = "lopt")]
    name_by_session: HashMap<SessionId, String>,
    #[cfg(feature = "lopt")]
    session_by_name: HashMap<String, SessionId>,
}

use futures::future::AbortHandle;

impl HubState {
    pub fn renew_heartbeat(&mut self, session_id: SessionId) {
        if self.sessions.contains_key(&session_id) {
            let now = std::time::Instant::now();
            self.heartbeats.insert(session_id, now);
            self.serverping.insert(session_id, now);
        }
    }

    pub fn connect(
        &mut self,
        session_id: SessionId,
        session: actix_ws::Session,
        abort_handle: AbortHandle,
        #[cfg(feature = "lopt")] client_name: String,
    ) {
        self.sessions.insert(session_id, session);
        self.heartbeats
            .insert(session_id, std::time::Instant::now());
        self.serverping
            .insert(session_id, std::time::Instant::now());
        self.abort_handles.insert(session_id, abort_handle);

        #[cfg(feature = "lopt")]
        self.name_by_session.insert(session_id, client_name.clone());
        #[cfg(feature = "lopt")]
        self.session_by_name.insert(client_name, session_id);
    }

    pub fn disconnect(&mut self, session_id: SessionId) {
        self.sessions.remove(&session_id);
        self.heartbeats.remove(&session_id);
        self.serverping.remove(&session_id);
        self.abort_handles.remove(&session_id);
        self.subs.retain(|_, ids| {
            ids.remove(&session_id);
            !ids.is_empty()
        });

        #[cfg(feature = "lopt")]
        if let Some(client_id) = self.name_by_session.remove(&session_id) {
            self.session_by_name.remove(&client_id);
        }

        tracing::debug!(
            "hub.disconnected {}, all: {}",
            session_id,
            self.sessions.len()
        );
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

    pub async fn info_json(&self, db: &Db) -> Value {
        let info = db.info().await.unwrap_or_else(|_| "error".to_string());
        json!({
            "memory_info": info,
            "backend": db.mode(),
            "websockets": self.sessions.len(),
            "subscriptions": self.subs.len(),
            "heartbeats": self.heartbeats.len(),
            "serverping": self.serverping.len(),
            "loops": self.abort_handles.len(),
            "loglevel": &CONFIG.loglevel,
            "status": "OK",
            "version": env!("CARGO_PKG_VERSION"),
        })
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
        let json = serde_json::to_string(&payload).unwrap();
        let _ = rcpt.text(json).await;
    }
}

#[cfg(feature = "lopt")]
pub async fn send_to_name(hub_state: &Arc<RwLock<HubState>>, to: &str, payload: Value) -> bool {
    let hub = hub_state.read().await;

    let to_sid = if let Some(&sid) = hub.session_by_name.get(to) {
        sid
    } else {
        return false;
    };

    let Some(mut session) = hub.sessions.get(&to_sid).cloned() else {
        return false;
    };

    session.text(payload.to_string()).await.is_ok()
}

pub fn check_heartbeat(hub_state: Arc<RwLock<HubState>>) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(std::time::Duration::from_secs(2));
        loop {
            ticker.tick().await;

            let now = std::time::Instant::now();
            let timelimit = now - std::time::Duration::from_secs(CONFIG.heartbeat_timeout);
            let pinglimit = now - std::time::Duration::from_secs(CONFIG.ping_timeout);

            let hub = hub_state.read().await;

            let ids_expired: Vec<SessionId> = hub
                .heartbeats
                .iter()
                .filter_map(
                    |(&sid, &last)| {
                        if last < timelimit { Some(sid) } else { None }
                    },
                )
                .collect();

            let expired_sessions: Vec<actix_ws::Session> = ids_expired
                .iter()
                .filter_map(|sid| hub.sessions.get(sid).cloned())
                .collect();

            let ids_to_ping: Vec<SessionId> = hub
                .serverping
                .iter()
                .filter_map(|(&sid, &last_ping)| {
                    if last_ping < pinglimit {
                        Some(sid)
                    } else {
                        None
                    }
                })
                .collect();

            drop(hub);

            for session in &expired_sessions {
                let _ = session.clone().close(None).await;
            }

            if !ids_to_ping.is_empty() || !ids_expired.is_empty() {
                let mut hub = hub_state.write().await;

                for sid in &ids_expired {
                    if let Some(abort_handle) = hub.abort_handles.get(sid) {
                        abort_handle.abort();
                    }
                    tracing::debug!("WebSocket disconnected by timeout: {}", sid);
                    hub.disconnect(*sid);
                }

                for sid in &ids_to_ping {
                    if ids_expired.contains(sid) {
                        continue;
                    }

                    if let Some(session) = hub.sessions.get_mut(sid) {
                        let _ = session.ping(&[]).await;
                    }
                    hub.serverping.insert(*sid, now);
                }

                drop(hub);
            }
        }
    });
}
