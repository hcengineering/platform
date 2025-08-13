use actix::prelude::*;
use std::collections::HashMap;

/// Сообщение от хаба к сессии: просто текст (готовая JSON-строка)
#[derive(Message)]
#[rtype(result = "()")]
pub struct ServerMessage(pub String);

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

pub struct WsHub {
    sessions: HashMap<usize, Recipient<ServerMessage>>,
    next_id: usize,
}

impl Default for WsHub {
    fn default() -> Self {
        Self {
            sessions: HashMap::new(),
            next_id: 1,
        }
    }
}

impl Actor for WsHub {
    type Context = Context<Self>;
}

impl Handler<Join> for WsHub {
    type Result = usize;

    fn handle(&mut self, msg: Join, _: &mut Context<Self>) -> Self::Result {
        let id = self.next_id;
        self.next_id += 1;
        self.sessions.insert(id, msg.addr);
        id
    }
}

impl Handler<Leave> for WsHub {
    type Result = ();

    fn handle(&mut self, msg: Leave, _: &mut Context<Self>) {
        self.sessions.remove(&msg.id);
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
