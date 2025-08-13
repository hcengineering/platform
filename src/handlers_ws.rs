use crate::ws_hub::{WsHub, ServerMessage, Join, Leave}; // NEW

// =============
use redis::aio::MultiplexedConnection;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::{Value, Map, json};
use actix::{
    Actor,
    StreamHandler,
    AsyncContext,
    ActorContext,
    fut,
    ActorFutureExt,

    Handler, WrapFuture // добавили Handler, WrapFuture

};
use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_web_actors::ws;
use serde::Deserialize;
use std::collections::HashSet;

use crate::redis::{
    Ttl, SaveMode,
    RedisArray,
    redis_save,
    redis_read,
    redis_delete,
    redis_list,
    error,
    deprecated_symbol,
};

type JsonMap = Map<String, Value>;

/// WsCommand - commands enum (put, delete, sub, unsub)
#[derive(Deserialize, Debug)]
#[serde(rename_all = "lowercase", tag = "type")]
pub enum WsCommand {
    Put {
        #[serde(default)]
        correlation: Option<String>,
        key: String,
        data: String,

        #[serde(rename = "expiresAt")]
        #[serde(default)]
        expires_at: Option<u64>,

        #[serde(rename = "TTL")]
        #[serde(default)]
        ttl: Option<u64>,

        #[serde(rename = "ifMatch")]
        #[serde(default)]
        if_match: Option<String>,

        #[serde(rename = "ifNoneMatch")]
        #[serde(default)]
        if_none_match: Option<String>,
    },

    Get {
        #[serde(default)]
        correlation: Option<String>,
        key: String,
    },

    List {
        #[serde(default)]
        correlation: Option<String>,
        key: String,
    },

    Delete {
        #[serde(default)]
        correlation: Option<String>,
        key: String,

        #[serde(rename = "ifMatch")]
        #[serde(default)]
        if_match: Option<String>,
    },

    Sub {
        #[serde(default)]
        correlation: Option<String>,
        key: String,
    },

    Unsub {
        #[serde(default)]
        correlation: Option<String>,
        key: String,
    },

    Sublist {
        #[serde(default)]
        correlation: Option<String>,
    },
}

/// Session condition
#[allow(dead_code)]
pub struct WsSession {
    pub subscriptions: HashSet<String>, // новые поля
    pub redis: Arc<Mutex<MultiplexedConnection>>, // вот он, тот же тип что и в HTTP API

    pub hub: actix::Addr<WsHub>,   // NEW
    pub id: Option<usize>,         // NEW
}



// ======= ping ========
// use crate::ws_ping::test_message;
// ======= /ping ========





/// Actor External trait: must be in separate impl block
impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("WebSocket connected");
        ctx.text("Connected");

// ======= ping ========
        // test_message(ctx);
        // регистрируемся в хабе и получаем id
        let addr = ctx.address().recipient::<ServerMessage>();
        let hub = self.hub.clone();
        ctx.wait(
            hub.send(Join { addr })
                .into_actor(self)
                .map(|res, actor, _ctx| {
                    if let Ok(id) = res {
                        actor.id = Some(id);
                    }
                })
        );
// ======= /ping ========
    }

// ======= ping ========
    fn stopped(&mut self, _ctx: &mut Self::Context) {
        if let Some(id) = self.id.take() {
            self.hub.do_send(Leave { id });
        }
        println!("WebSocket disconnected");
    }
// ======= /ping ========
}





// ======= ping ========
impl actix::Handler<ServerMessage> for WsSession {
    type Result = ();

    fn handle(&mut self, msg: ServerMessage, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}
// ======= /ping ========



















/// StreamHandler External trait: must be in separate impl block
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                println!("Message: {}", text);
                match serde_json::from_str::<WsCommand>(&text) {
                    Ok(cmd) => self.handle_command(cmd, ctx),
                    Err(err) => ctx.text(format!("Invalid JSON: {}", err)),
                }
            }
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Close(reason)) => {
                println!("Closing WS: {:?}", reason);
                ctx.close(reason);
                ctx.stop();
            }
            _ => (),
        }
    }
}

/// All logic in one impl
impl WsSession {

    fn wait_and_send<F>(
        &mut self,
        ctx: &mut ws::WebsocketContext<Self>,
        fut: F,
        mut base: JsonMap,
    )
    where
        F: std::future::Future<Output = Result<JsonMap, String>> + 'static,
    {
        ctx.wait(
            fut::wrap_future(fut).map(move |res, _actor: &mut Self, ctx| {
                match res {
                    Ok(extra) => { base.extend(extra); }
                    Err(err) => { base.insert("error".into(), json!(err)); }
                }
                ctx.text(Value::Object(base).to_string());
            })
        );
    }


    /// When valid JSON recieved for WsSession
    fn handle_command(&mut self, cmd: WsCommand, ctx: &mut ws::WebsocketContext<Self>) {
        match cmd {

            WsCommand::Put { key, data, expires_at, ttl, if_match, if_none_match, correlation } => {

                println!("PUT {} = {} (expires_at: {:?}) (ttl: {:?})", key, data, expires_at, ttl);

	        let redis = self.redis.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("put"));
	        base.insert("key".into(), json!(&key));
	        base.insert("data".into(), json!(&data));
	        if let Some(x) = &correlation   { base.insert("correlation".into(), json!(x)); }
	        if let Some(x) = &expires_at    { base.insert("expiresAt".into(),  json!(x)); }
	        if let Some(x) = &ttl           { base.insert("TTL".into(),        json!(x)); }
	        if let Some(x) = &if_match      { base.insert("ifMatch".into(),    json!(x)); }
	        if let Some(x) = &if_none_match { base.insert("ifNoneMatch".into(),json!(x)); }

		let fut = async move {

            	    // TTL logic
                    let real_ttl = if let Some(secs) = ttl {
                	Some(Ttl::Sec(secs as usize))
            	    } else if let Some(timestamp) = expires_at {
                	Some(Ttl::At(timestamp))
            	    } else {
                	None
            	    };

            	    // MODE logic
            	    let mut mode = Some(SaveMode::Upsert);
            	    if let Some(s) = if_match { // `If-Match: *` - update only if the key exists
                	if s == "*" { // `If-Match: *` — update only if exist
                    	    mode = Some(SaveMode::Update);
                	} else { // `If-Match: <md5>` — update only if current
                    	    mode = Some(SaveMode::Equal(s.to_string()));
                	}
            	    } else if let Some(s) = if_none_match { // `If-None-Match: *` — insert only if does not exist
                	if s == "*" {
                    	    mode = Some(SaveMode::Insert);
                	} else {
			    return Err::<JsonMap, String>("ifNoneMatch must contain only '*'".into());
                	}
            	    }

		    let mut conn = redis.lock().await;

		    redis_save(&mut *conn, &key, &data, real_ttl, mode)
			    .await
			    .map_err(|e| e.to_string())?;

	            let mut extra = JsonMap::new();
	            extra.insert("response".into(), json!("OK"));
	            Ok::<JsonMap, String>(extra)

		};

		self.wait_and_send(ctx, fut, base);
	    }


            WsCommand::Delete { key, correlation, if_match } => {
                println!("DELETE {}", key);

	        let redis = self.redis.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("delete"));
	        base.insert("key".into(), json!(&key));
	        if let Some(x) = &correlation { base.insert("correlation".into(), json!(x)); }
	        if let Some(x) = &if_match    { base.insert("ifMatch".into(),    json!(x)); }

		let fut = async move {

		    let mut conn = redis.lock().await;

	            let deleted = redis_delete(&mut *conn, &key).await.map_err(|e| e.to_string())?;

		    if deleted {
	        	let mut extra = JsonMap::new();
			extra.insert("response".into(), json!("OK"));
	        	Ok::<JsonMap, String>(extra)
		    } else {
			Err::<JsonMap, String>("not found".into())
		    }

		};

		self.wait_and_send(ctx, fut, base);
            }

            WsCommand::Get { key, correlation } => {
                println!("GET {}{:?}", key, correlation);

	        let redis = self.redis.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("get"));
	        base.insert("key".into(), json!(&key));
	        if let Some(x) = &correlation { base.insert("correlation".into(), json!(x)); }

		let fut = async move {

		    let mut conn = redis.lock().await;

		    let data_opt = redis_read(&mut *conn, &key)
		        .await
	        	.map_err(|e| e.to_string())?;

		    match data_opt {
		        Some(data) => {
		            let mut extra = JsonMap::new();
		            let data_value = serde_json::to_value(&data).map_err(|e| e.to_string())?;
		            extra.insert("response".into(), data_value);
		            Ok::<JsonMap, String>(extra)
    			}
		        None => Err::<JsonMap, String>("not found".into())
		    }
		};

		self.wait_and_send(ctx, fut, base);
            }

            WsCommand::List { key, correlation } => {
                println!("LIST {:?}{:?}", key, correlation);

	        let redis = self.redis.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("get"));
		base.insert("key".into(), json!(&key));
	        if let Some(x) = &correlation { base.insert("correlation".into(), json!(x)); }

		let fut = async move {

		    let mut conn = redis.lock().await;

		    let data = redis_list(&mut *conn, &key).await.map_err(|e| e.to_string())?;

		    let mut extra = JsonMap::new();
		    let data_value = serde_json::to_value(&data).map_err(|e| e.to_string())?;
		    extra.insert("response".into(), data_value);
		    Ok::<JsonMap, String>(extra)
		};

		self.wait_and_send(ctx, fut, base);
            }

            // TODO

	    WsCommand::Sub { key, correlation } => {
	        println!("SUB {}{:?}", key, correlation);

		let mut obj = JsonMap::new();
		obj.insert("action".into(), json!("sub"));
		obj.insert("key".into(), json!(key));
		if let Some(c) = correlation { obj.insert("correlation".into(), json!(c)); }

		if deprecated_symbol(&key) {
		    obj.insert("error".into(), json!("Deprecated symbol in key"));
		} else {
	    	    let added = self.subscriptions.insert(key.clone());
		    obj.insert("sub_count".into(), json!( self.subscriptions.len() ));
		    if !added { obj.insert("warning".into(), json!("Subscribe already exist")); }
		}
		ctx.text(Value::Object(obj).to_string());
	    }

	    WsCommand::Unsub { key, correlation } => {
	        println!("UNSUB {}{:?}", key, correlation);
		let mut obj = JsonMap::new();
	        obj.insert("action".into(), json!("unsub"));
	        obj.insert("key".into(), json!(key));
	        if let Some(c) = correlation { obj.insert("correlation".into(), json!(c)); }


		let removed = if key == "*" {
			if !self.subscriptions.is_empty() {
		    	    self.subscriptions.clear();
			    true
			} else {
			    false
			}
		} else {
		    if deprecated_symbol(&key) {
			obj.insert("error".into(), json!("Deprecated symbol in key"));
			true
		    } else {
			self.subscriptions.remove(&key)
		    }
		};

		obj.insert("sub_count".into(), json!( self.subscriptions.len() ));
		if !removed { obj.insert("warning".into(), json!("Subscribe already deleted")); }

		ctx.text(Value::Object(obj).to_string());
	    }

	    WsCommand::Sublist { correlation } => {
	        println!("SUBLIST {:?}", correlation);
		let mut obj = JsonMap::new();
	        obj.insert("action".into(), json!("sublist"));
	        if let Some(c) = correlation { obj.insert("correlation".into(), json!(c)); }

		obj.insert("response".into(), json!(self.subscriptions.iter().cloned().collect::<Vec<_>>()));
		obj.insert("sub_count".into(), json!( self.subscriptions.len() ));

		ctx.text(Value::Object(obj).to_string());
	    }

	    // End of commands
        }
    }

}


pub async fn handler(
    req: HttpRequest,
    stream: web::Payload,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
    hub: web::Data<actix::Addr<WsHub>>, // NEW
) -> Result<HttpResponse, Error> {
    let session = WsSession {
        subscriptions: HashSet::new(),
        redis: redis.get_ref().clone(),
        hub: hub.get_ref().clone(),   // NEW
        id: None,                     // NEW
    };
    ws::start(session, &req, stream)
}

