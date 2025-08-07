use actix::{Actor, StreamHandler, AsyncContext, ActorContext};
use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_web_actors::ws;
use serde::Deserialize;
use serde_json::Result as JsonResult;
use std::collections::HashSet;

/// WsCommand - commands enum (put, delete, sub, unsub)
#[derive(Deserialize, Debug)]
#[serde(rename_all = "lowercase", tag = "type")]
pub enum WsCommand {
    Put {
        key: String,
        data: String,
        #[serde(default)]
        correlation: Option<String>,
        #[serde(rename = "expiresAt")]
        expires_at: Option<u64>,
    },
    Delete {
        key: String,
        #[serde(default)]
        correlation: Option<String>,
    },
    Sub {
        key: String,
    },
    Unsub {
        key: String,
    },
}

/// Session condition
#[allow(dead_code)]
pub struct WsSession {
    pub workspace: String,
    pub subscriptions: HashSet<String>, // новые поля
}

/// Actor External trait: must be in separate impl block
impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("WebSocket connected to workspace [{}]", self.workspace);
        ctx.text(format!("Connected to workspace: {}", self.workspace));
    }
}

/// StreamHandler External trait: must be in separate impl block
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                println!("Message from [{}]: {}", self.workspace, text);
                match serde_json::from_str::<WsCommand>(&text) {
                    Ok(cmd) => self.handle_command(cmd, ctx),
                    Err(err) => ctx.text(format!("Invalid JSON: {}", err)),
                }
            }
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Close(reason)) => {
                println!("Closing WS for workspace [{}]: {:?}", self.workspace, reason);
                ctx.close(reason);
                ctx.stop();
            }
            _ => (),
        }
    }
}

/// All logic in one impl
impl WsSession {

    /// When valid JSON recieved for WsSession
    fn handle_command(&mut self, cmd: WsCommand, ctx: &mut ws::WebsocketContext<Self>) {
        match cmd {
            WsCommand::Put { key, data, expires_at, correlation } => {
                println!("PUT {} = {} (expires_at: {:?})", key, data, expires_at);
                ctx.text(format!("OK PUT {}{}", key, Self::correlation_suffix(&correlation)));
                // Здесь — сохранить в Redis
            }
            WsCommand::Delete { key, correlation } => {
                println!("DELETE {}", key);
                ctx.text(format!("OK DELETE {}{}", key, Self::correlation_suffix(&correlation)));
                // Здесь — удалить из Redis
            }
            WsCommand::Sub { key } => {
                println!("SUB {}", key);
                ctx.text(format!("OK SUB {}", key));
                // Здесь — подписка (в будущем pub/sub)
            }
            WsCommand::Unsub { key } => {
                println!("UNSUB {}", key);
                ctx.text(format!("OK UNSUB {}", key));
                // Здесь — отписка
            }
        }
    }

    fn correlation_suffix(corr: &Option<String>) -> String {
	match corr {
    	    Some(c) => format!(" [correlation: {}]", c),
    	    None => "".to_string(),
	}
    //
    //        corr.as_ref()
    //            .map(|c| format!(" [correlation: {}]", c))
    //            .unwrap_or_default()
    //
    }

}

pub async fn handler(req: HttpRequest, stream: web::Payload, path: web::Path<String>) -> Result<HttpResponse, Error> {
    let workspace = path.into_inner();
    let session = WsSession { workspace, subscriptions: HashSet::new() };
    ws::start(session, &req, stream)
}
