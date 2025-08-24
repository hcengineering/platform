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

use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use actix::prelude::*;

use redis::aio::MultiplexedConnection;
use serde::Serialize;
use tokio::sync::{RwLock};

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

#[derive(Clone, Serialize, Debug, Message)]
#[rtype(result = "()")]
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

#[derive(Debug, Default)]
pub struct HubState {
    sessions: HashMap<SessionId, Recipient<ServerMessage>>,
    subs: HashMap<String, HashSet<SessionId>>,
}

impl HubState {
    pub fn connect(&mut self, session_id: SessionId, addr: Recipient<ServerMessage>) {
        self.sessions.insert(session_id, addr);
    }
    pub fn disconnect(&mut self, session_id: SessionId) {
        self.sessions.remove(&session_id);
        self.subs.retain(|_, ids| { ids.remove(&session_id); !ids.is_empty() });
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
    pub fn recipients_for_key(&self, key: &str) -> Vec<Recipient<ServerMessage>> {
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
    let recipients: Vec<Recipient<ServerMessage>> = {
        hub_state.read().await.recipients_for_key(&ev.key)
    };
    if recipients.is_empty() {
        return;
    }

    // Send
    let payload = ServerMessage { event: ev, value };
    for rcpt in recipients {
        let _ = rcpt.do_send(payload.clone());
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