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

use std::sync::Arc;

use actix::{Actor, ActorContext, ActorFutureExt, AsyncContext, StreamHandler, fut};
use actix_web::{Error, HttpMessage, HttpRequest, HttpResponse, web};
use actix_web_actors::ws;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::sync::RwLock;

use crate::{
    config::CONFIG,
    db::Db,
    hub_service::{HubState, ServerMessage, SessionId, new_session_id},
    redis::{SaveMode, Ttl},
    workspace_owner::check_workspace_core,
};

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
    // #[serde(rename = "expiresAt", skip_serializing_if = "Option::is_none")]
    // expires_at: Option<u64>,

    // #[serde(rename = "ifMatch", skip_serializing_if = "Option::is_none")]
    // if_match: Option<&'a str>,

    // #[serde(rename = "ifNoneMatch", skip_serializing_if = "Option::is_none")]
    // if_none_match: Option<&'a str>,
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

    Info {
        #[serde(default)]
        correlation: Option<String>,
    },
}

use hulyrs::services::jwt::Claims;

/// Session condition
pub struct WsSession {
    pub db: Db,
    pub id: SessionId,
    hub_state: Arc<RwLock<HubState>>,
    pub claims: Option<Claims>,
}

/// Actor External trait: must be in separate impl block
impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        let id = self.id;
        // let recipient = ctx.address().recipient::<ServerMessage>();
        let addr = ctx.address();

        let hub_state = self.hub_state.clone();
        ctx.spawn(
            actix::fut::wrap_future(async move {
                hub_state.write().await.connect(id, addr);
            })
            .map(|_, _, _| ()),
        );
        tracing::info!("WebSocket connected: {}", id);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        let id = self.id;
        let hub_state = self.hub_state.clone();
        actix::spawn(async move {
            hub_state.write().await.disconnect(id);
        });
        tracing::info!("WebSocket disconnected: {}", id);
    }
}

impl actix::Handler<ServerMessage> for WsSession {
    type Result = ();
    fn handle(&mut self, msg: ServerMessage, ctx: &mut Self::Context) {
        let json =
            serde_json::to_string(&msg).unwrap_or_else(|_| "{\"error\":\"serialization\"}".into());
        ctx.text(json);
    }
}

// Disconecting
#[derive(actix::Message)]
#[rtype(result = "()")]
pub struct ForceDisconnect;

impl actix::Handler<ForceDisconnect> for WsSession {
    type Result = ();

    fn handle(&mut self, _msg: ForceDisconnect, ctx: &mut Self::Context) {
        ctx.close(Some(ws::CloseReason {
            code: ws::CloseCode::Normal,
            description: Some("Disconnected by server".to_string()),
        }));
        ctx.stop();
    }
}

/// StreamHandler External trait: must be in separate impl block
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        tracing::debug!("WebSocket message: {:?}", msg);

        // renew heartbeat to unixtime (all messages is activity, including "ping")
        let hub_state = self.hub_state.clone();
        let id = self.id.clone();
        let fut = async move { hub_state.write().await.renew_heartbeat(id) };
        ctx.wait(fut::wrap_future(fut).map(|_, _, _| ()));

        match msg {
            // String "ping" - answer "pong"
            Ok(ws::Message::Text(text)) if text == "ping" => {
                ctx.text("pong");
            }
            Ok(ws::Message::Text(text)) => match serde_json::from_str::<WsCommand>(&text) {
                Ok(cmd) => self.handle_command(cmd, ctx),
                Err(err) => ctx.text(format!("Invalid JSON: {}", err)),
            },
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Close(reason)) => {
                ctx.close(reason);
                ctx.stop();
            }
            Err(err) => {
                tracing::warn!("WebSocket error: {:?}", err);
                ctx.stop();
            }
            _ => (),
        }
    }
}

/// All logic
impl WsSession {
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
            // INFO
            WsCommand::Info { correlation } => {
                tracing::info!("INFO");
                let base = serde_json::json!(ReturnBase {
                    action: "info",
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });
                let db = self.db.clone();
                let fut = async move {
                    let info = db.info().await.map_err(|e| e.to_string())?;
                    Ok(serde_json::json!({ "result": info }))
                };
                self.fut_send(ctx, fut, base);
            }

            // PUT
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

                let base = serde_json::json!(ReturnBase {
                    action: "put",
                    // key: Some(key.as_str()),
                    // data: Some(data.as_str()),
                    correlation: correlation.as_deref(),
                    // ttl,
                    // expires_at,
                    // if_match: if_match.as_deref(),
                    // if_none_match: if_none_match.as_deref(),
                    ..Default::default()
                });

                let claims = self.claims.clone();
                let db = self.db.clone();

                let fut = async move {
                    // Check workspace
                    if let Err(e) = check_workspace_core(claims, &key) {
                        return Err(e.into());
                    }

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

                    // Save
                    db.save(&key, &data, real_ttl, mode)
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

                let db = self.db.clone();
                let claims = self.claims.clone();

                let base = serde_json::json!(ReturnBase {
                    action: "delete",
                    // key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    // if_match: if_match.as_deref(),
                    ..Default::default()
                });

                let fut = async move {
                    // Check workspace
                    if let Err(e) = check_workspace_core(claims, &key) {
                        return Err(e.into());
                    }

                    // MODE logic
                    let mut mode = Some(SaveMode::Upsert);
                    if let Some(s) = if_match {
                        if s == "*" {
                            // `If-Match: *` — return error if not exist
                            mode = Some(SaveMode::Update);
                        } else {
                            // `If-Match: <md5>` — delete only if current
                            mode = Some(SaveMode::Equal(s.to_string()));
                        }
                    }

                    // Delete
                    let deleted = db.delete(&key, mode).await.map_err(|e| e.to_string())?;

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

                let base = serde_json::json!(ReturnBase {
                    action: "get",
                    // key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let db = self.db.clone();
                let claims = self.claims.clone();

                let fut = async move {
                    // Check workspace
                    if let Err(e) = check_workspace_core(claims, &key) {
                        return Err(e.into());
                    }

                    // Read
                    let data_opt = db.read(&key).await.map_err(|e| e.to_string())?;
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

                let base = serde_json::json!(ReturnBase {
                    action: "list",
                    // key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let db = self.db.clone();
                let claims = self.claims.clone();

                let fut = async move {
                    // Check workspace
                    if let Err(e) = check_workspace_core(claims, &key) {
                        return Err(e.into());
                    }
                    // List
                    let data = db.list(&key).await.map_err(|e| e.to_string())?;
                    Ok(json!({ "result": data }))
                };

                self.fut_send(ctx, fut, base);
            }

            WsCommand::Sub { key, correlation } => {
                // LEVENT 3
                tracing::info!("SUB {}", &key); //  correlation: {:?} , &correlation

                let base = serde_json::json!(ReturnBase {
                    action: "sub",
                    // key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let hub_state = self.hub_state.clone();
                let id = self.id.clone();
                let claims = self.claims.clone();

                let fut = async move {
                    // Check workspace
                    if let Err(e) = check_workspace_core(claims, &key) {
                        return Err(e.into());
                    }

                    hub_state.write().await.subscribe(id, key);
                    Ok(json!({ "result": "OK" }))
                };

                self.fut_send(ctx, fut, base);
            }

            WsCommand::Unsub { key, correlation } => {
                // LEVENT 4
                tracing::info!("UNSUB {}", &key); //  correlation: {:?} , &correlation

                let base = serde_json::json!(ReturnBase {
                    action: "unsub",
                    // key: Some(key.as_str()),
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let hub_state = self.hub_state.clone();
                let id = self.id.clone();
                let claims = self.claims.clone();

                let fut = async move {
                    if key == "*" {
                        hub_state.write().await.unsubscribe_all(id);
                        Ok(json!({ "result": "OK" }))
                    } else {
                        // Check workspace
                        if let Err(e) = check_workspace_core(claims, &key) {
                            return Err(e.into());
                        }

                        hub_state.write().await.unsubscribe(id, key);
                        Ok(json!({ "result": "OK" }))
                    }
                };
                self.fut_send(ctx, fut, base);
            }

            WsCommand::Sublist { correlation } => {
                tracing::info!("SUBLIST"); //  correlation: {:?} , &correlation
                // w/o Check workspace!
                let base = serde_json::json!(ReturnBase {
                    action: "sublist",
                    correlation: correlation.as_deref(),
                    ..Default::default()
                });

                let hub_state = self.hub_state.clone();
                let id = self.id.clone();

                let fut = async move {
                    let keys = hub_state.read().await.subscribe_list(id);
                    Ok(json!({ "result": keys }))
                };
                self.fut_send(ctx, fut, base);
            } // End of commands
        }
    }
}

pub async fn handler(
    req: HttpRequest,
    payload: web::Payload,
    db: web::Data<Db>,
    hub_state: web::Data<Arc<RwLock<HubState>>>,
) -> Result<HttpResponse, Error> {
    let claims = if !CONFIG.no_authorization {
        Some(
            req.extensions()
                .get::<Claims>()
                .expect("Missing claims")
                .to_owned(),
        )
    } else {
        None
    };

    let session = WsSession {
        db: db.get_ref().clone(),
        hub_state: hub_state.get_ref().clone(),
        id: new_session_id(),
        claims,
    };

    ws::start(session, &req, payload)
}
