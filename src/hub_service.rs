use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicU64, Ordering};

use actix::prelude::*;

use redis::aio::MultiplexedConnection;
use serde::Serialize;
use tokio::sync::{mpsc, oneshot};

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

// ==== ID ====

pub type SessionId = u64;
static NEXT_ID: AtomicU64 = AtomicU64::new(1);
pub fn new_session_id() -> SessionId {
    NEXT_ID.fetch_add(1, Ordering::SeqCst)
}

// ==== Redis events ====

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
    pub key: String,
    pub action: RedisEventAction,
}

// ==== Commands for worker ====

enum Command {
    Connect {
        session_id: SessionId,
        addr: Recipient<ServerMessage>,
    },
    Disconnect {
        session_id: SessionId,
    },
    Subscribe {
        session_id: SessionId,
        key: String,
    },
    Unsubscribe {
        session_id: SessionId,
        key: String,
    },
    UnsubscribeAll {
        session_id: SessionId,
    },
    SubscribeList {
        session_id: SessionId,
        reply: oneshot::Sender<Vec<String>>,
    },
    Count {
        reply: oneshot::Sender<usize>,
    },
    // DumpSubs {
    //     reply: oneshot::Sender<std::collections::HashMap<String, Vec<SessionId>>>,
    // },
    RedisEvent(RedisEvent),
}

// ==== Handle  ====

#[derive(Clone)]
pub struct HubServiceHandle {
    tx: mpsc::Sender<Command>,
}

impl HubServiceHandle {
    pub fn start(redis: MultiplexedConnection) -> Self {
        let (tx, mut rx) = mpsc::channel::<Command>(1024);

        // Владелец состояния живёт внутри задачи
        tokio::spawn(async move {
            let mut sessions: HashMap<SessionId, Recipient<ServerMessage>> = HashMap::new();
            let mut subs: HashMap<String, HashSet<SessionId>> = HashMap::new();
            let mut redis_conn = redis;

            fn subscribers_for(
                subs: &HashMap<String, HashSet<SessionId>>,
                key: &str,
            ) -> HashSet<SessionId> {
                let mut out = HashSet::<SessionId>::new();
                for (sub_key, set) in subs.iter() {
                    if subscription_matches(sub_key, key) {
                        out.extend(set.iter().copied());
                    }
                }
                out
            }

            while let Some(cmd) = rx.recv().await {
                match cmd {
                    Command::Connect { session_id, addr } => {
                        sessions.insert(session_id, addr);
                    }

                    Command::Disconnect { session_id } => {
                        subs.retain(|_, ids| {
                            ids.remove(&session_id);
                            !ids.is_empty()
                        });
                        sessions.remove(&session_id);
                    }

                    Command::Subscribe { session_id, key } => {
                        subs.entry(key).or_default().insert(session_id);
                    }

                    Command::Unsubscribe { session_id, key } => {
                        if let Some(set) = subs.get_mut(&key) {
                            set.remove(&session_id);
                            if set.is_empty() {
                                subs.remove(&key);
                            }
                        }
                    }

                    Command::UnsubscribeAll { session_id } => {
                        subs.retain(|_, ids| {
                            ids.remove(&session_id);
                            !ids.is_empty()
                        });
                    }

                    Command::SubscribeList { session_id, reply } => {
                        let list = subs
                            .iter()
                            .filter_map(|(key, ids)| {
                                if ids.contains(&session_id) {
                                    Some(key.clone())
                                } else {
                                    None
                                }
                            })
                            .collect::<Vec<_>>();
                        let _ = reply.send(list);
                    }

                    Command::Count { reply } => {
                        let _ = reply.send(sessions.len());
                    }

                    // Command::DumpSubs { reply } => {
                    //     let snapshot = subs
                    //         .iter()
                    //         .map(|(k, set)| (k.clone(), set.iter().copied().collect::<Vec<_>>()))
                    //         .collect::<std::collections::HashMap<_, _>>();
                    //     let _ = reply.send(snapshot);
                    // }
                    Command::RedisEvent(event) => {
                        let targets = subscribers_for(&subs, &event.key);
                        if targets.is_empty() {
                            continue;
                        }
                        let recipients: Vec<Recipient<ServerMessage>> = targets
                            .into_iter()
                            .filter_map(|sid| sessions.get(&sid).cloned())
                            .collect();

                        // Inside: waiting GET
                        let need_get = matches!(event.action, RedisEventAction::Set);
                        let mut value: Option<String> = None;
                        if need_get {
                            match redis::cmd("GET")
                                .arg(&event.key)
                                .query_async::<Option<String>>(&mut redis_conn)
                                .await
                            {
                                Ok(v) => value = v,
                                Err(e) => {
                                    tracing::warn!("redis GET {} failed: {}", &event.key, e);
                                }
                            }
                        }

                        let payload = ServerMessage { event, value };

                        for rcpt in recipients {
                            let _ = rcpt.do_send(payload.clone());
                        }
                    }
                }
            }
        });

        Self { tx }
    }

    // ---- API, ничего не выполняет параллельно внутри worker'а ----

    pub fn connect(&self, session_id: SessionId, addr: Recipient<ServerMessage>) {
        let _ = self.tx.try_send(Command::Connect { session_id, addr });
    }

    pub fn disconnect(&self, session_id: SessionId) {
        let _ = self.tx.try_send(Command::Disconnect { session_id });
    }

    pub fn subscribe(&self, session_id: SessionId, key: String) {
        let _ = self.tx.try_send(Command::Subscribe { session_id, key });
    }

    pub fn unsubscribe(&self, session_id: SessionId, key: String) {
        let _ = self.tx.try_send(Command::Unsubscribe { session_id, key });
    }

    pub fn unsubscribe_all(&self, session_id: SessionId) {
        let _ = self.tx.try_send(Command::UnsubscribeAll { session_id });
    }

    pub async fn subscribe_list(&self, session_id: SessionId) -> Vec<String> {
        let (tx, rx) = oneshot::channel();
        let _ = self
            .tx
            .send(Command::SubscribeList {
                session_id,
                reply: tx,
            })
            .await;
        rx.await.unwrap_or_default()
    }

    pub async fn count(&self) -> usize {
        let (tx, rx) = oneshot::channel();
        let _ = self.tx.send(Command::Count { reply: tx }).await;
        rx.await.unwrap_or_default()
    }

    // pub async fn dump_subs(&self) -> std::collections::HashMap<String, Vec<SessionId>> {
    //     let (tx, rx) = oneshot::channel();
    //     let _ = self.tx.send(Command::DumpSubs { reply: tx }).await;
    //     rx.await.unwrap_or_default()
    // }

    pub fn push_event(&self, ev: RedisEvent) {
        let _ = self.tx.try_send(Command::RedisEvent(ev));
    }
}
