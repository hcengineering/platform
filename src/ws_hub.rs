use std::collections::{ HashMap, HashSet };

fn subscription_matches(sub_key: &str, key: &str) -> bool {
    if sub_key == key { return true; }
    if sub_key.ends_with('/') && key.starts_with(sub_key) {
        let rest = &key[sub_key.len()..];
        return !rest.contains('$');
    }
    false
}

use crate::redis_events::{ RedisEvent, RedisEventAction };
use serde::Serialize;

#[derive(Message, Clone, Serialize, Debug)]
#[rtype(result = "()")]
pub struct ServerMessage {
    #[serde(flatten)]
    pub event: RedisEvent, // поля RedisEvent «вливаются» в корень JSON
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>, // будет только при Set
}

/// Count of active sessions
#[derive(Message)]
#[rtype(result = "usize")]
pub struct Count;

pub type SessionId = u64;

pub struct WsHub {
    sessions: HashMap<SessionId, Recipient<ServerMessage>>,
    subs: HashMap<String, HashSet<SessionId>>, // Subscriptions array: key -> {id, id, id ...}
    next_id: SessionId,
    redis: Arc<Mutex<MultiplexedConnection>>,
}

impl WsHub {
    pub fn new(redis: Arc<Mutex<MultiplexedConnection>>) -> Self {
        Self {
            sessions: HashMap::new(),
            subs: HashMap::new(),
            next_id: 1,
            redis,
        }
    }
}

impl Actor for WsHub {
    type Context = Context<Self>;
}

/// Connect
#[derive(Message)]
#[rtype(result = "SessionId")]
pub struct Connect {
    pub addr: Recipient<ServerMessage>,
}

impl Handler<Connect> for WsHub {
    type Result = SessionId;

    fn handle(&mut self, msg: Connect, _ctx: &mut Context<Self>) -> Self::Result {
	// LEVENT 1
        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        self.sessions.insert(id, msg.addr);
        // tracing::info!("session connected: id={id} (total={})", self.sessions.len());
        id
    }
}

/// Disconnect
#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub session_id: SessionId,
}

impl Handler<Disconnect> for WsHub {
    type Result = ();

    fn handle(&mut self, msg: Disconnect, _ctx: &mut Context<Self>) {
	// LEVENT 2

        // Delete all subscribes
        self.subs.retain(|_key, session_ids| {
            session_ids.remove(&msg.session_id);
            !session_ids.is_empty()
        });

        let existed = self.sessions.remove(&msg.session_id).is_some();
        if existed {
            // tracing::info!("session disconnected: id={} (total={})", msg.session_id, self.sessions.len());
        } else {
            tracing::warn!("disconnect for unknown id={}", msg.session_id);
        }
    }
}

/// SubscribeList
#[derive(Message)]
#[rtype(result = "Vec<String>")]
pub struct SubscribeList {
    pub session_id: SessionId,
}

impl Handler<SubscribeList> for WsHub {
    type Result = MessageResult<SubscribeList>;

    fn handle(&mut self, msg: SubscribeList, _ctx: &mut Context<Self>) -> Self::Result {
        // Collect all keys with my session_id
        let list = self.subs
            .iter()
            .filter_map(|(key, sessions)| {
                if sessions.contains(&msg.session_id) {
                    Some(key.clone())
                } else {
                    None
                }
            })
            .collect::<Vec<String>>();

        MessageResult(list)
    }
}

/// Count of IDs
impl Handler<Count> for WsHub {
    type Result = usize;

    fn handle(&mut self, _: Count, _: &mut Context<Self>) -> Self::Result {
        self.sessions.len()
    }
}

/// Subscribe
#[derive(Message)]
#[rtype(result = "()")]
pub struct Subscribe {
    pub session_id: SessionId,
    pub key: String,
}

impl Handler<Subscribe> for WsHub {
    type Result = ();
    fn handle(&mut self, msg: Subscribe, _ctx: &mut Context<Self>) {
        self.subs.entry(msg.key).or_default().insert(msg.session_id);
    }
}

/// Unsubscribe
#[derive(Message)]
#[rtype(result = "()")]
pub struct Unsubscribe {
    pub session_id: SessionId,
    pub key: String,
}

impl Handler<Unsubscribe> for WsHub {
    type Result = ();
    fn handle(&mut self, msg: Unsubscribe, _ctx: &mut Context<Self>) {
        if let Some(set) = self.subs.get_mut(&msg.key) {
            set.remove(&msg.session_id);
            if set.is_empty() { self.subs.remove(&msg.key); }
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct UnsubscribeAll {
    pub session_id: SessionId,
}

impl Handler<UnsubscribeAll> for WsHub {
    type Result = ();
    fn handle(&mut self, msg: UnsubscribeAll, _ctx: &mut Context<Self>) {
        self.subs.retain(|_key, session_ids| {
            session_ids.remove(&msg.session_id);
            !session_ids.is_empty()
        });
    }
}




#[derive(Message)]
#[rtype(result = "HashMap<String, Vec<SessionId>>")]
pub struct TestGetSubs;

impl Handler<TestGetSubs> for WsHub {
    type Result = MessageResult<TestGetSubs>;

    fn handle(&mut self, _msg: TestGetSubs, _ctx: &mut Context<Self>) -> Self::Result {
        let s: HashMap<String, Vec<SessionId>> = self.subs
            .iter()
            .map(|(key, ids)| (key.clone(), ids.iter().copied().collect()))
            .collect();
        MessageResult(s)
    }
}

// List of subscribers
impl WsHub {
    fn subscribers_for(&self, key: &str) -> HashSet<SessionId> {
        let mut out = HashSet::new();
        for (sub_key, set) in &self.subs {
            if subscription_matches(sub_key, key) {
                out.extend(set.iter().copied());
            }
        }
        out
    }
}

use actix::prelude::*;
use actix::ActorFutureExt;
use actix::fut::ready;
use std::sync::Arc;
use tokio::sync::Mutex;
use redis::aio::MultiplexedConnection;

impl Handler<RedisEvent> for WsHub {
    type Result = ResponseActFuture<Self, ()>;

    fn handle(&mut self, msg: RedisEvent, _ctx: &mut Context<Self>) -> Self::Result {
        let targets = self.subscribers_for(&msg.key);
        if targets.is_empty() {
            return Box::pin(actix::fut::ready(()).into_actor(self));
        }

        let recipients: Vec<Recipient<ServerMessage>> = targets.into_iter()
            .filter_map(|sid| self.sessions.get(&sid).cloned())
            .collect();

        let redis = self.redis.clone();
        let event = msg.clone();
        let need_get = matches!(msg.action, RedisEventAction::Set);

        Box::pin(
            async move {
                let value = if need_get {

                    let mut conn = redis.lock().await;
                    match redis::cmd("GET").arg(&event.key).query_async::<Option<String>>(&mut *conn).await
                    {
                        Ok(v) => v,
                        Err(e) => {
                            tracing::warn!("redis GET {} failed: {}", &event.key, e);
                            None
                        }
                    }
                } else {
                    None
                };

                let payload = ServerMessage { event, value };

                for rcpt in recipients {
                    let _ = rcpt.do_send(payload.clone());
                }
            }
            .into_actor(self)
        )
    }
}
