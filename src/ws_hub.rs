use actix::prelude::*;
use std::collections::HashMap;




#[derive(Message)]
#[rtype(result = "SessionId")]
pub struct Connect {
    pub addr: Recipient<ServerMessage>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub session_id: SessionId,
}














/// Message from Hub to Session (JSON-string)
#[derive(Message)]
#[rtype(result = "()")]
pub struct ServerMessage(pub String);


/*
/// Присоединить сессию. Возвращает присвоенный id.
#[derive(Message)]
#[rtype(result = "usize")]
pub struct Join {
    pub addr: Recipient<ServerMessage>,
}


/// Отключить сессию по id
#[derive(Message)]
#[rtype(result = "()")]
pub struct Leave {
    pub id: usize,
}
*/

/// Отправить всем
#[derive(Message)]
#[rtype(result = "()")]
pub struct Broadcast {
    pub text: String,
}

/// Количество активных сессий
#[derive(Message)]
#[rtype(result = "usize")]
pub struct Count;

pub type SessionId = u64;
pub struct WsHub {
    sessions: HashMap<SessionId, Recipient<ServerMessage>>,
    next_id: SessionId,
}

impl Default for WsHub {
    fn default() -> Self {
        Self { sessions: HashMap::new(), next_id: 1u64 }
    }
}

impl Actor for WsHub {
    type Context = Context<Self>;
}


impl Handler<Connect> for WsHub {
    type Result = SessionId;

    fn handle(&mut self, msg: Connect, _ctx: &mut Context<Self>) -> Self::Result {
        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        self.sessions.insert(id, msg.addr);
        println!("[ws_hub] session connected: id={id} (total={})", self.sessions.len());
        id
    }
}

impl Handler<Disconnect> for WsHub {
    type Result = ();

    fn handle(&mut self, msg: Disconnect, _ctx: &mut Context<Self>) {
        let existed = self.sessions.remove(&msg.session_id).is_some();
        if existed {
            println!("[ws_hub] session disconnected: id={} (total={})", msg.session_id, self.sessions.len());
        } else {
            println!("[ws_hub] disconnect for unknown id={}", msg.session_id);
        }
    }
}



















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

impl Handler<Count> for WsHub {
    type Result = usize;

    fn handle(&mut self, _: Count, _: &mut Context<Self>) -> Self::Result {
        self.sessions.len()
    }
}


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