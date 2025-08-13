use redis::aio::MultiplexedConnection;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::{Value, Map, json};
use actix::{Actor, StreamHandler, AsyncContext, ActorContext, fut, ActorFutureExt };
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
    error
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
        key: Option<String>,
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
}

/// Session condition
#[allow(dead_code)]
pub struct WsSession {
    pub workspace: String,
    pub subscriptions: HashSet<String>, // новые поля
    pub redis: Arc<Mutex<MultiplexedConnection>>, // вот он, тот же тип что и в HTTP API
}



// ======= ping ========
use crate::ws_ping::test_message;
// ======= /ping ========





/// Actor External trait: must be in separate impl block
impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("WebSocket connected to workspace [{}]", self.workspace);
        ctx.text(format!("Connected to workspace: {}", self.workspace));

// ======= ping ========

        // Для наглядности во время отладки:
//        install_ws_ping_with(ctx, std::time::Duration::from_secs(5), PingMode::ControlAndText("__!ping!__"));

        test_message(ctx);
        // Если захочешь нестандартный интервал:
        // use std::time::Duration;
        // use crate::ws_ping::install_ws_ping_with_period;
        // install_ws_ping_with_period(ctx, Duration::from_secs(5));
// ======= /ping ========

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
                    Ok(extra) => {
			base.extend(extra);
                    }
                    Err(err) => {
                        base.insert("type".into(), json!("error"));
                        base.insert("message".into(), json!(err));
                    }
                }
                ctx.text(Value::Object(base).to_string());
            })
        );
    }


    /// When valid JSON recieved for WsSession
    fn handle_command(&mut self, cmd: WsCommand, ctx: &mut ws::WebsocketContext<Self>) {
        match cmd {

            WsCommand::Put { key, data, expires_at, ttl, if_match, if_none_match, correlation } => {

                println!("PUT {} = {} (expires_at: {:?}) (ttl: {:?}) ws={:?}", key, data, expires_at, ttl, self.workspace);

	        let redis = self.redis.clone();
	        let workspace = self.workspace.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("put"));
	        base.insert("workspace".into(), json!(&self.workspace));
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

		    redis_save(&mut *conn, &workspace, &key, &data, real_ttl, mode)
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
	        let workspace = self.workspace.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("delete"));
	        base.insert("workspace".into(), json!(&self.workspace));
	        base.insert("key".into(), json!(&key));
	        if let Some(x) = &correlation { base.insert("correlation".into(), json!(x)); }
	        if let Some(x) = &if_match    { base.insert("ifMatch".into(),    json!(x)); }

		let fut = async move {

		    let mut conn = redis.lock().await;

	            let deleted = redis_delete(&mut *conn, &workspace, &key)
			.await
			.map_err(|e| e.to_string())?;

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
	        let workspace = self.workspace.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("get"));
	        base.insert("workspace".into(), json!(&self.workspace));
	        base.insert("key".into(), json!(&key));
	        if let Some(x) = &correlation { base.insert("correlation".into(), json!(x)); }

		let fut = async move {

		    let mut conn = redis.lock().await;

		    let data_opt = redis_read(&mut *conn, &workspace, &key)
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
	        let workspace = self.workspace.clone();

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("get"));
	        base.insert("workspace".into(), json!(&self.workspace));
	        if let Some(x) = &key { base.insert("key".into(), json!(x)); }
	        if let Some(x) = &correlation { base.insert("correlation".into(), json!(x)); }

		let fut = async move {

		    let mut conn = redis.lock().await;

		    let data = redis_list(&mut *conn, &workspace, key.as_deref())
		        .await
	        	.map_err(|e| e.to_string())?;

		    let mut extra = JsonMap::new();
		    let data_value = serde_json::to_value(&data).map_err(|e| e.to_string())?;
		    extra.insert("response".into(), data_value);
		    Ok::<JsonMap, String>(extra)
		};

		self.wait_and_send(ctx, fut, base);
            }

            WsCommand::Sub { key, correlation } => {
                println!("SUB {}{:?}", key, correlation);
                ctx.text(format!("OK SUB {}", key));
                // TODO
            }


            WsCommand::Unsub { key, correlation } => {
                println!("UNSUB {}{:?}", key, correlation);
                ctx.text(format!("OK UNSUB {}", key));
                // TODO
            }

        }
    }

}


pub async fn handler(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<String>,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
) -> Result<HttpResponse, Error> {
    let workspace = path.into_inner();
    let session = WsSession {
        workspace,
        subscriptions: HashSet::new(),
        redis: redis.get_ref().clone(),
    };
    ws::start(session, &req, stream)
}
