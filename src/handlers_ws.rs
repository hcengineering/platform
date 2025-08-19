use uuid::Uuid;
use actix::{prelude::*};

use crate::ws_hub::{
	WsHub, ServerMessage, SessionId,
	Connect, Disconnect,
        Subscribe, Unsubscribe, UnsubscribeAll,
	SubscribeList,
};

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
    Handler, WrapFuture
};
use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_web_actors::ws;
use serde::Deserialize;
use std::collections::HashSet;

use crate::redis_lib::{
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

use hulyrs::services::jwt::Claims;

/// Session condition
#[allow(dead_code)]
pub struct WsSession {
    pub redis: Arc<Mutex<MultiplexedConnection>>,
    pub id: SessionId,
    pub hub: Addr<WsHub>,
    pub claims: Option<Claims>,
}


/// Actor External trait: must be in separate impl block
impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        // ask ID from Hub
        let addr = ctx.address();

        let recipient = addr.recipient::<ServerMessage>();
        // println!("WebSocket connected");
        self.hub
            .send(Connect { addr: recipient })
            .into_actor(self)
            .map(|res, act, _ctx| {
                match res {
                    Ok(id) => {
                        act.id = id;
			tracing::info!("WebSocket connected: {id}");
                    }
                    Err(e) => {
			tracing::error!("WebSocket failed connect to hub: {e}");
                        _ctx.stop();
                    }
                }
            })
            .wait(ctx); // waiting for ID
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
	if self.id != 0 { self.hub.do_send(Disconnect { session_id: self.id });	}
	tracing::info!("WebSocket disconnected: {:?}",&self.id);
    }

}

impl actix::Handler<ServerMessage> for WsSession {
    type Result = ();

    fn handle(&mut self, msg: ServerMessage, ctx: &mut Self::Context) {
        let json = serde_json::to_string(&msg).unwrap_or_else(|_| "{\"error\":\"serialization\"}".into());
        ctx.text(json);
    }
}

/// StreamHandler External trait: must be in separate impl block
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                // println!("Message: {}", text);
                match serde_json::from_str::<WsCommand>(&text) {
                    Ok(cmd) => self.handle_command(cmd, ctx),
                    Err(err) => ctx.text(format!("Invalid JSON: {}", err)),
                }
            }
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Close(reason)) => {
                // println!("Closing WS: {:?}", reason);
                ctx.close(reason);
                ctx.stop();
            }
            _ => (),
        }
    }
}

/// All logic in one impl
impl WsSession {

    fn ws_error(&self, ctx: &mut ws::WebsocketContext<Self>, msg: &str) {
        ctx.text(format!(r#"{{"error":"{}"}}"#, msg));
    }

    fn workspace_check_ws(&self, key: &str) -> Result<(), &'static str> {
        let claims = self.claims.as_ref().ok_or("Missing auth claims")?;
        if claims.is_system() { return Ok(()); }
        let jwt_workspace = claims.workspace.as_ref().ok_or("Missing workspace in token")?;
        let path_ws = key.split('/').next().ok_or("Invalid key: missing workspace")?;
        if path_ws.is_empty() { return Err("Invalid key: missing workspace"); }
        let path_ws_uuid = Uuid::parse_str(path_ws).map_err(|_| "Invalid workspace UUID in key")?;
        if jwt_workspace != &path_ws_uuid { return Err("Workspace mismatch"); }
        Ok(())
    }

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

                tracing::info!("PUT {} = {} (expires_at: {:?}) (ttl: {:?}) correlation: {:?}", &key, &data, &expires_at, &ttl, &correlation);

		// Check workspace
                if let Err(e) = self.workspace_check_ws(&key) { self.ws_error(ctx, e); return; }

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
                tracing::info!("DELETE {} correlation:{:?}", &key, &correlation);

		// Check workspace
                if let Err(e) = self.workspace_check_ws(&key) { self.ws_error(ctx, e); return; }

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
                tracing::info!("GET {} correlation:{:?}", &key, &correlation);

		// Check workspace
                if let Err(e) = self.workspace_check_ws(&key) { self.ws_error(ctx, e); return; }

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
                tracing::info!("LIST {:?} correlation: {:?}", &key, &correlation);

		// Check workspace
                if let Err(e) = self.workspace_check_ws(&key) { self.ws_error(ctx, e); return; }

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


	    WsCommand::Sub { key, correlation } => {
		// LEVENT 3
	        tracing::info!("SUB {} correlation: {:?}", &key, &correlation);

		// Check workspace
                if let Err(e) = self.workspace_check_ws(&key) { self.ws_error(ctx, e); return; }

		let mut obj = JsonMap::new();
		obj.insert("action".into(), json!("sub"));
		obj.insert("key".into(), json!(key));
		if let Some(c) = correlation { obj.insert("correlation".into(), json!(c)); }

		if deprecated_symbol(&key) {
		    obj.insert("error".into(), json!("Deprecated symbol in key"));
		} else {
		    self.hub.do_send(Subscribe { session_id: self.id, key: key.clone() });
		}

		ctx.text(Value::Object(obj).to_string());
	    }

	    WsCommand::Unsub { key, correlation } => {
		// LEVENT 4
	        tracing::info!("UNSUB {} correlation: {:?}", &key, &correlation);

		// Check workspace
                if let Err(e) = self.workspace_check_ws(&key) { self.ws_error(ctx, e); return; }

		let mut obj = JsonMap::new();
	        obj.insert("action".into(), json!("unsub"));
	        obj.insert("key".into(), json!(key));
	        if let Some(c) = correlation { obj.insert("correlation".into(), json!(c)); }

		if key == "*" {
		    self.hub.do_send(UnsubscribeAll { session_id: self.id });
		} else {
		    if deprecated_symbol(&key) {
			obj.insert("error".into(), json!("Deprecated symbol in key"));
		    } else {
			self.hub.do_send(Unsubscribe { session_id: self.id, key: key.clone() });
		    }
		};

		ctx.text(Value::Object(obj).to_string());
	    }

	    WsCommand::Sublist { correlation } => {
	        tracing::info!("SUBLIST correlation: {:?}", &correlation);

		// w/o Check workspace!

	        let mut base = JsonMap::new();
	        base.insert("action".into(), json!("sublist"));
	        if let Some(x) = &correlation { base.insert("correlation".into(), json!(x)); }

		let hub = self.hub.clone();
		let id = self.id;

		let fut = async move {
		    let keys = hub.send(SubscribeList { session_id: id }).await.unwrap_or_default();
		    let mut extra = JsonMap::new();
		    extra.insert("response".into(), serde_json::to_value(&keys).map_err(|e| e.to_string())? );
		    Ok::<JsonMap, String>(extra)
		};

		self.wait_and_send(ctx, fut, base);
            }

	    // End of commands
        }
    }

}

// ---- auth

use actix_web::{HttpMessage,error};
use url::form_urlencoded;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use crate::CONFIG;

pub async fn handler(
    req: HttpRequest,
    stream: web::Payload,
    redis: web::Data<Arc<Mutex<MultiplexedConnection>>>,
    hub: web::Data<Addr<WsHub>>,
) -> Result<HttpResponse, Error> {

    let token_opt = req.uri().query().and_then(|q| {
            form_urlencoded::parse(q.as_bytes())
                .find(|(k, _)| k == "token")
                .map(|(_, v)| v.into_owned())
        });

    let claims = match token_opt {
        Some(t) if !t.is_empty() => {

	    let mut validation = Validation::new(Algorithm::HS256);
	    validation.required_spec_claims = HashSet::new(); // no: exp/iat/nbf

	    let c = decode::<Claims>(&t, &DecodingKey::from_secret(CONFIG.token_secret.as_bytes()), &validation )
	        .map(|td| td.claims)
	        .map_err(|_e| error::ErrorUnauthorized("Invalid token"))?;


            Some(c)
        }
        _ => None,
    };

    let session = WsSession {
        redis: redis.get_ref().clone(),
        hub: hub.get_ref().clone(),
        id: 0,
        claims,
    };

    ws::start(session, &req, stream)
}
