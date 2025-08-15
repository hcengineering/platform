/*


У нас имеется 6 событий:

1) WS сессия подключилась
2) WS сессия отключилась
3) Подписку добавили
4) Подписку отменили
И информация от Redis:
5) Ключ появился/изменился
6) Ключ удалился

Итак, у нас есть таблица A, где хранятся имена подписок и номера подписчиков, которые ее оформили:
foo/      1,2,5,88
foo/dir/  3,50
xz/value   2,3,4,88

Соответственно она меняется так:

[DONE] В случае 2 - обходим таблицу и удаляем подписчика номер 5; если не осталось подписчиков, то удаляем и саму строку подписки.

[DONE] В случае 3 - если подписка не существовала, то создать; добавить подписчика.

[DONE] В случае 4 - убрать подписчика, если подписка опустела, то удалить и ее.

В случаях 5 и 6 мы обходим каждый раз ВСЮ таблицу A, сравниваем с каждой
подпиской, и выясняем список подписчиков.
-- Если ключ таблицы  === ключу - разослать по всем ID
-- Если ключ таблицы заканчивается на "/" и является началом ключа и его остальные символы не содержат "$" - разослать по всем ID


Соответственно есть второй вариант - оптимизация этого процесса. Хранить
таблицу Б, где перечисляются все существующие ключи, а к каждому
привязаны соответствующие им строки таблицы А. Так что обход таблицы А
происходит только для каждого новопоявившегося ключа. Но поскольку
появление и исчезновение ключа это, я так понимаю, самое частое событие
(пользователь набирает текст - пользователь перестал набирать текст), то
смысла делать таблицу Б я не вижу, она все равно будет точно так же
требовать вычислений и обхода таблицы А каждый раз.

*/

use std::collections::HashSet;

// ------

use actix::prelude::*;
use std::collections::HashMap;




fn subscription_matches(sub_key: &str, key: &str) -> bool {
    if sub_key == key { return true; }
    if sub_key.ends_with('/') && key.starts_with(sub_key) {
        let rest = &key[sub_key.len()..];
        return !rest.contains('$');
    }
    false
}




/// Message from Hub to Session (JSON-string)

/*
#[derive(Message)]
#[rtype(result = "()")]
pub struct ServerMessage(pub String);
*/

#[derive(Message, Clone, Debug)]
#[rtype(result = "()")]
pub struct ServerMessage {
    pub event: RedisEvent,
}



use crate::redis_events::RedisEvent;
//    Redis(RedisEvent), // 👈 новый вариант

/*
#[derive(Message, Clone)]
#[rtype(result = "()")]
pub enum ServerMessage {
    Text(String),
    KeyEvent { db: u32, key: String, kind: RedisEvent },
}
*/

/*
/// Отправить всем
#[derive(Message)]
#[rtype(result = "()")]
pub struct Broadcast {
    pub text: String,
}
*/

/// Количество активных сессий
#[derive(Message)]
#[rtype(result = "usize")]
pub struct Count;

pub type SessionId = u64;

pub struct WsHub {
    sessions: HashMap<SessionId, Recipient<ServerMessage>>,
    subs: HashMap<String, HashSet<SessionId>>, // Массив моих подписок: key -> {id, id, id ...}
    next_id: SessionId,
}

impl Default for WsHub {
    fn default() -> Self {
        Self {
	    sessions: HashMap::new(),
            subs: HashMap::new(),
	    next_id: 1u64,
	 }
    }
}

impl Actor for WsHub {
    type Context = Context<Self>;
}




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
        println!("[ws_hub] session connected: id={id} (total={})", self.sessions.len());
        id
    }
}


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
            println!("[ws_hub] session disconnected: id={} (total={})", msg.session_id, self.sessions.len());
        } else {
            println!("[ws_hub] disconnect for unknown id={}", msg.session_id);
        }
    }
}

/*
impl Handler<Broadcast> for WsHub {
    type Result = ();

    fn handle(&mut self, msg: Broadcast, _: &mut Context<Self>) {
        let Broadcast { text } = msg;
        // рассылаем всем; если какая-то сессия отвалилась — игнорируем ошибку
        for (_, recp) in self.sessions.iter() {
            let _ = recp.do_send(ServerMessage(text.clone()));
        }
    }
}
*/



#[derive(Message)]
#[rtype(result = "Vec<String>")]
pub struct SubscribeList {
    pub session_id: SessionId,
}

impl Handler<SubscribeList> for WsHub {
    type Result = MessageResult<SubscribeList>;

    fn handle(&mut self, msg: SubscribeList, _ctx: &mut Context<Self>) -> Self::Result {
        // Собираем все ключи, где session_id присутствует
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





















impl Handler<Count> for WsHub {
    type Result = usize;

    fn handle(&mut self, _: Count, _: &mut Context<Self>) -> Self::Result {
        self.sessions.len()
    }
}



// Городим массив подписок


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

/*
#[derive(Message)]
#[rtype(result = "bool")]
pub struct Subscribe {
    pub session_id: SessionId,
    pub key: String,
}

impl Handler<Subscribe> for WsHub {
    type Result = MessageResult<Subscribe>;
    fn handle(&mut self, msg: Subscribe, _ctx: &mut Context<Self>) -> Self::Result {
        let subs = self.subs.entry(msg.key).or_default();
        let added = subs.insert(msg.session_id); // true
        MessageResult(added)
    }
}
*/

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

/*
#[derive(Message)]
#[rtype(result = "bool")]
pub struct Unsubscribe {
    pub session_id: SessionId,
    pub key: String,
}

impl Handler<Unsubscribe> for WsHub {
    type Result = MessageResult<Unsubscribe>;
    fn handle(&mut self, msg: Unsubscribe, _ctx: &mut Context<Self>) -> Self::Result {
        let mut removed = false;
        if let Some(set) = self.subs.get_mut(&msg.key) {
            removed = set.remove(&msg.session_id); // true
            if set.is_empty() { self.subs.remove(&msg.key); }
        }
        MessageResult(removed)
    }
}
*/

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

/*
#[derive(Message)]
#[rtype(result = "bool")]
pub struct UnsubscribeAll {
    pub session_id: SessionId,
}

impl Handler<UnsubscribeAll> for WsHub {
    type Result = MessageResult<UnsubscribeAll>;
    fn handle(&mut self, msg: UnsubscribeAll, _ctx: &mut Context<Self>) -> Self::Result {
        let mut x = false;
        self.subs.retain(|_key, session_ids| {
            if session_ids.remove(&msg.session_id) { x = true; }
            !session_ids.is_empty()
        });
        MessageResult(x)
    }
}
*/


#[derive(Message)]
#[rtype(result = "HashMap<String, Vec<SessionId>>")]
pub struct TestGetSubs;

impl Handler<TestGetSubs> for WsHub {
    type Result = MessageResult<TestGetSubs>;

    fn handle(&mut self, _msg: TestGetSubs, _ctx: &mut Context<Self>) -> Self::Result {
        // Преобразуем HashSet → Vec для сериализации
        let s: HashMap<String, Vec<SessionId>> = self.subs
            .iter()
            .map(|(key, ids)| (key.clone(), ids.iter().copied().collect()))
            .collect();

        MessageResult(s)
    }
}



// .. ==================================

/*
// Сообщение для WsHub, чтобы сделать рассылку по подписчикам
#[derive(Message, Clone)]
#[rtype(result = "()")]
pub struct FanoutKeyEvent {
    pub db: u32,
    pub key: String,
    pub kind: RedisEvent,
}
*/

// Собираем список подписчиков по правилу выше
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







// use actix::prelude::*;
// use crate::redis_events::RedisEvent;

impl Handler<RedisEvent> for WsHub {
    type Result = ();

    fn handle(&mut self, msg: RedisEvent, _ctx: &mut Context<Self>) {
        let targets = self.subscribers_for(&msg.key);
        if targets.is_empty() { return; }

        let payload = ServerMessage { event: msg.clone() };

        for sid in targets {
            if let Some(rcpt) = self.sessions.get(&sid) {
                let _ = rcpt.do_send(payload.clone());
            }
        }
    }
}

/*

impl Handler<FanoutKeyEvent> for WsHub {
    type Result = ();

    fn handle(&mut self, msg: FanoutKeyEvent, _ctx: &mut Context<Self>) {
        let targets = self.subscribers_for(&msg.event.key);
        if targets.is_empty() { return; }

        let payload = ServerMessage { event: msg.event.clone() };
        for sid in targets {
            if let Some(rcpt) = self.sessions.get(&sid) {
                let _ = rcpt.do_send(payload.clone());
            }
        }
    }
}


// Обработчик, который рассылает ServerMessage всем, кто подписан
impl Handler<FanoutKeyEvent> for WsHub {
    type Result = ();

    fn handle(&mut self, msg: FanoutKeyEvent, _ctx: &mut Context<Self>) {
        let targets = self.subscribers_for(&msg.key);
        if targets.is_empty() { return; }

        // Сформируй payload под свой тип ServerMessage
        // Пример: добавь вариант KeyEvent в твой ServerMessage
//        let payload = ServerMessage::KeyEvent {
//            db: msg.db,
//            key: msg.key.clone(),
//            kind: msg.kind.clone(),
//        };

//	let payload = ServerMessage { event: ev.clone() };
        let payload = ServerMessage { event: msg.event.clone() };

        for sid in targets {
            if let Some(rcpt) = self.sessions.get(&sid) { let _ = rcpt.do_send(payload.clone()); }
        }
    }
}

*/





/*
/// stat
use actix_web::{web, HttpResponse};
use actix::Addr;
use serde_json::json;

// use crate::ws_hub::{WsHub, Count};

pub async fn stat(hub: web::Data<Addr<WsHub>>) -> HttpResponse {
    let count = hub.send(Count).await.unwrap_or(0);
    HttpResponse::Ok().json(json!({ "connections": count }))
}
*/