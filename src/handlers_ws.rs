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

// https://github.com/hcengineering/hulypulse/

use actix::{
    Actor, ActorContext, ActorFutureExt, AsyncContext, StreamHandler, fut,
};
use actix_web::{Error, HttpMessage, HttpRequest, HttpResponse, web};
use actix_web_actors::ws;
use redis::aio::MultiplexedConnection;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::redis::{
    SaveMode, Ttl, deprecated_symbol, redis_delete, redis_list, redis_read, redis_save,
};

use crate::hub_service::{HubServiceHandle, ServerMessage, SessionId, new_session_id};
use crate::workspace_owner::check_workspace_core;


#[derive(Serialize, Default)]
struct ReturnBase<'a> {
    action: &'a str,

    #[serde(skip_serializing_if = "Option::is_none")]
    key: Option<&'a str>,

    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<&'a str>,

    #[serde(skip_serializing_if = "Option::is_none")]
    correlation: Option<&'a str>,

    #[serde(rename = "TTL", skip_serializing_if = "Option::is_none")]
    ttl: Option<u64>,

    #[serde(rename = "expiresAt", skip_serializing_if = "Option::is_none")]
    expires_at: Option<u64>,

    #[serde(rename = "ifMatch", skip_serializing_if = "Option::is_none")]
    if_match: Option<&'a str>,

    #[serde(rename = "ifNoneMatch", skip_serializing_if = "Option::is_none")]
    if_none_match: Option<&'a str>,
}

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

    Delete {
        #[serde(default)]
        correlation: Option<String>,
        key: String,

        #[serde(rename = "ifMatch")]
        #[serde(default)]
        if_match: Option<String>,
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
    pub redis: MultiplexedConnection,
    pub id: SessionId,
    pub hub: HubServiceHandle,
    pub claims: Claims,
}

/// Actor External trait: must be in separate impl block
impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        let addr = ctx.address();
        let recipient = addr.recipient::<ServerMessage>();

        self.hub.connect(self.id, recipient);
        tracing::info!("WebSocket connected: {}", self.id);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        if self.id != 0 {
            self.hub.disconnect(self.id);
        }
        tracing::info!("WebSocket disconnected: {:?}", &self.id);
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
            Ok(ws::Message::Text(text)) => match serde_json::from_str::<WsCommand>(&text) {
                Ok(cmd) => self.handle_command(cmd, ctx),
                Err(err) => ctx.text(format!("Invalid JSON: {}", err)),
            },
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Close(reason)) => {
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
        check_workspace_core(&self.claims, key)
    }

    fn fut_send(
        &mut self,
        ctx: &mut ws::WebsocketContext<Self>,
        fut: impl Future<Output = Result<Value, String>> + 'static,
        mut base: Value,
    ) {
        ctx.wait(
            fut::wrap_future(fut).map(move |res, _actor: &mut Self, ctx| {
                let obj = base.as_object_mut().unwrap();
                match res {
                    Ok(Value::Object(extra)) => {
                        obj.extend(extra);
                    }
                    Ok(v) => {
                        obj.insert("extra".into(), v);
                    }
                    Err(err) => {
                        obj.insert("error".into(), json!(err));
                    }
                }
                ctx.text(base.to_string());
            }),
        );
    }

    /// When valid JSON recieved for WsSession
    fn handle_command(&mut self, cmd: WsCommand, ctx: &mut ws::WebsocketContext<Self>) {
        match cmd {
            WsCommand::Put {
                key,
                data,
                expires_at,
                ttl,
                if_match,
                if_none_match,
                correlation,
            } => {
                tracing::info!("PUT {} = {}", &key, &data); //  (expires_at: {:?}) (ttl: {:?}) correlation: {:?} &expires_at, &ttl, &correlation

                // Check workspace
                if let Err(e) = self.workspace_check_ws(&key) {
                    self.ws_error(ctx, e);
                    return;
                }

                let mut redis = self.redis.clone();

                let base = serde_json::json!(ReturnBase {
                    action: "put",
                    key: Some(key.as_str()),
                    data: Some(data.as_str()),
                    correlation: correlation.as_deref(),
                    ttl,
                    expires_at,
                    if_match: if_match.as_deref(),
                    if_none_match: if_none_match.as_deref(),
                });

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
                    if let Some(s) = if_match {
                        // `If-Match: *` - update only if the key exists
                        if s == "*" {
                            // `If-Match: *` — update only if exist
                            mode = Some(SaveMode::Update);
                        } else {
                            // `If-Match: <md5>` — update only if current
                            mode = Some(SaveMode::Equal(s.to_string()));
                        }
                    } else if let Some(s) = if_none_match {
                        // `If-None-Match: *` — insert only if does not exist
                        if s == "*" {
                            mode = Some(SaveMode::Insert);
                        } else {
                            return Err("ifNoneMatch must contain only '*'".into());
                        }
                    }

                    redis_save(&mut redis, &key, &data, real_ttl, mode)
                        .await
                        .map_err(|e| e.to_string())?;

                    Ok(json!({"result": "OK"}))
                };

                self.fut_send(ctx, fut, base);
            }

            WsCommand::Delete {
                key,
                correlation,
                if_match,
            } => {
                tracing::info!("DELETE {}", &key); //  correlation:{:?} , &correlation

                // Check workspace
                if let Err(e) = self.workspace_check_ws(&key) {
                    self.ws_error(ctx, e);
                    return;
                }

                tracing::info!("DELETE!!! {}", &key);

                let mut redis = self.redis.clone();

                let base = serde_json::json!(ReturnBase {
                    action: "delete",
                    key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    if_match: if_match.as_deref(),
                    ..Default::default()
                });

                let fut = async move {
                    // MODE logic
                    let mut mode = Some(SaveMode::Upsert);
                    if let Some(s) = if_match {
                        // `If-Match: *` - delete only if the key exists
                        if s == "*" {
                            // `If-Match: *` — return error if not exist
                            mode = Some(SaveMode::Update);
                        } else {
                            // `If-Match: <md5>` — update only if current
                            mode = Some(SaveMode::Equal(s.to_string()));
                        }
                    }

                    let deleted = redis_delete(&mut redis, &key, mode)
                        .await
                        .map_err(|e| e.to_string())?;

                    if deleted {
                        Ok(json!({"result": "OK"}))
                    } else {
                        Err("not found".into())
                    }
                };

                self.fut_send(ctx, fut, base);
            }

            WsCommand::Get { key, correlation } => {
                tracing::info!("GET {}", &key); //  correlation:{:?} , &correlation

                // Check workspace
                if let Err(e) = self.workspace_check_ws(&key) {
                    self.ws_error(ctx, e);
                    return;
                }

                let mut redis = self.redis.clone();

                let base = serde_json::json!(ReturnBase {
                    action: "get",
                    key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let fut = async move {
                    let data_opt = redis_read(&mut redis, &key)
                        .await
                        .map_err(|e| e.to_string())?;

                    match data_opt {
                        Some(data) => {
                            let data_value =
                                serde_json::to_value(&data).map_err(|e| e.to_string())?;
                            Ok(json!({"result": data_value}))
                        }
                        None => Err("not found".into()),
                    }
                };

                self.fut_send(ctx, fut, base);
            }

            WsCommand::List { key, correlation } => {
                tracing::info!("LIST {:?}", &key); //  correlation: {:?} , &correlation

                // Check workspace
                if let Err(e) = self.workspace_check_ws(&key) {
                    self.ws_error(ctx, e);
                    return;
                }

                let mut redis = self.redis.clone();

                let base = serde_json::json!(ReturnBase {
                    action: "list",
                    key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let fut = async move {
                    let data = redis_list(&mut redis, &key)
                        .await
                        .map_err(|e| e.to_string())?;
                    Ok(json!({ "result": data }))
                };

                self.fut_send(ctx, fut, base);
            }


            WsCommand::Sub { key, correlation } => {
                // LEVENT 3
                tracing::info!("SUB {}", &key); //  correlation: {:?} , &correlation

                // Check workspace
                if let Err(e) = self.workspace_check_ws(&key) {
                    self.ws_error(ctx, e);
                    return;
                }

                let mut obj = serde_json::json!(ReturnBase {
                    action: "sub",
                    key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let map = obj.as_object_mut().unwrap();

                if deprecated_symbol(&key) {
                    map.insert("error".into(), json!("Deprecated symbol in key"));
                } else {
                    self.hub.subscribe(self.id, key.clone());
                    map.insert("result".into(), json!("OK"));
                }
                ctx.text(obj.to_string());
            }


            WsCommand::Unsub { key, correlation } => {
                // LEVENT 4
                tracing::info!("UNSUB {}", &key); //  correlation: {:?} , &correlation

                let mut obj = serde_json::json!(ReturnBase {
                    action: "unsub",
                    key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let map = obj.as_object_mut().unwrap();

                if key == "*" {
                    self.hub.unsubscribe_all(self.id);
                    map.insert("result".into(), json!("OK"));
                } else {
                    // Check workspace
                    if let Err(e) = self.workspace_check_ws(&key) {
                        self.ws_error(ctx, e);
                        return;
                    }
                    if deprecated_symbol(&key) {
                        map.insert("error".into(), json!("Deprecated symbol in key"));
                    } else {
                        self.hub.unsubscribe(self.id, key.clone());
                        map.insert("result".into(), json!("OK"));
                    }
                }
                ctx.text(obj.to_string());
            }


            WsCommand::Sublist { correlation } => {
                tracing::info!("SUBLIST"); //  correlation: {:?} , &correlation
                // w/o Check workspace!
                let base = serde_json::json!(ReturnBase {
                    action: "list",
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let hub = self.hub.clone();
                let id = self.id;

                self.fut_send(
                    ctx,
                    async move {
                        let keys = hub.subscribe_list(id).await;
                        Ok(json!({ "result": keys }))
                    },
                    base,
                );
            }

        // End of commands
        }
    }
}


pub async fn handler(
    req: HttpRequest,
    payload: web::Payload,
    redis: web::Data<MultiplexedConnection>,
    hub: web::Data<HubServiceHandle>, // <-- было Addr<WsHub>
) -> Result<HttpResponse, Error> {
    let claims = req
        .extensions()
        .get::<Claims>()
        .expect("Missing claims")
        .to_owned();

    let session = WsSession {
        redis: redis.get_ref().clone(),
        hub: hub.get_ref().clone(),
        id: new_session_id(),
        claims,
    };

    ws::start(session, &req, payload)
}
