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

use actix_ws;
use futures_util::StreamExt;
// use tracing::info;
use actix_web::{Error, HttpRequest, HttpResponse, web};

#[cfg(feature = "auth")]
use actix_web::HttpMessage;

use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::{
    BACKEND,
    db::{Db, SaveMode, Ttl},
    hub_service::{HubState, SessionId, new_session_id},
};

#[cfg(feature = "auth")]
use crate::workspace_owner::check_workspace_core;

#[cfg(feature = "auth")]
use crate::workspace_owner::test_rego_claims;

// use strum_macros::AsRefStr;
use strum::AsRefStr;

#[derive(Deserialize, Debug, AsRefStr)]
#[serde(rename_all = "lowercase", tag = "type")]
pub enum WsCommand {
    Put {
        #[serde(default = "default_corr")]
        correlation: String,
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
        #[serde(default = "default_corr")]
        correlation: String,
        key: String,

        #[serde(rename = "ifMatch")]
        #[serde(default)]
        if_match: Option<String>,
    },

    Get {
        #[serde(default = "default_corr")]
        correlation: String,
        key: String,
    },

    List {
        #[serde(default = "default_corr")]
        correlation: String,
        key: String,
    },

    Sub {
        #[serde(default = "default_corr")]
        correlation: String,
        key: String,
    },

    Unsub {
        #[serde(default = "default_corr")]
        correlation: String,
        key: String,
    },

    Sublist {
        #[serde(default = "default_corr")]
        correlation: String,
    },

    Info {
        #[serde(default = "default_corr")]
        correlation: String,
    },
}

fn default_corr() -> String {
    "1".to_string()
}

#[cfg(feature = "auth")]
use hulyrs::services::jwt::Claims;

#[cfg(feature = "auth")]
async fn wrong_workspace(
    claims: &Option<Claims>,
    key: &str,
    correlation: &String,
    session: &mut actix_ws::Session,
) -> bool {
    if let Err(e) = check_workspace_core(claims.clone(), key) {
        result_err(e, correlation, session).await;
        return true;
    }
    false
}

async fn result<T: Into<serde_json::Value>>(
    result: T,
    correlation: &String,
    session: &mut actix_ws::Session,
) {
    let _ = session
        .text(json!({ "correlation": correlation, "result": result.into()}).to_string())
        .await;
}

async fn result_err(err: impl Into<String>, correlation: &String, session: &mut actix_ws::Session) {
    let _ = session
        .text(json!({ "correlation": correlation, "error": err.into()}).to_string())
        .await;
}

async fn handle_command(
    ws: &mut actix_ws::Session,
    cmd: WsCommand,
    db: &Db,
    hub_state: &Arc<RwLock<HubState>>,
    #[cfg(feature = "auth")] claims: Option<Claims>,
    session_id: SessionId,
) {
    match cmd {
        // INFO
        WsCommand::Info { correlation } => {
            tracing::info!("INFO");
            match db.info().await {
                Ok(info) => {
                    let info = json!({
                        "memory_info": info,
                        "backend": BACKEND,
                        "websockets": hub_state.read().await.count(),
                        "version": env!("CARGO_PKG_VERSION"),
                    });
                    result(info, &correlation, ws).await
                }
                Err(e) => result_err(e.to_string(), &correlation, ws).await,
            }
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
            tracing::info!("PUT {} = {}", &key, &data);

            #[cfg(feature = "auth")]
            if wrong_workspace(&claims, &key, &correlation, ws).await {
                return;
            }

            // TTL logic
            let real_ttl = if let Some(secs) = ttl {
                Some(Ttl::Sec(secs as usize))
            } else if let Some(timestamp) = expires_at {
                Some(Ttl::At(timestamp))
            } else {
                None
            };

            // SaveMode logic
            let mut mode = Some(SaveMode::Upsert);
            if let Some(s) = if_match {
                if s == "*" {
                    mode = Some(SaveMode::Update);
                } else {
                    mode = Some(SaveMode::Equal(s));
                }
            } else if let Some(s) = if_none_match {
                if s == "*" {
                    mode = Some(SaveMode::Insert);
                } else {
                    result_err("ifNoneMatch must contain only '*'", &correlation, ws).await;
                    return;
                }
            }

            match db.save(&key, &data, real_ttl, mode).await {
                Ok(_) => result("OK", &correlation, ws).await,
                Err(e) => result_err(e.to_string(), &correlation, ws).await,
            }
        }

        WsCommand::Delete {
            key,
            correlation,
            if_match,
        } => {
            tracing::info!("DELETE {}", &key); //  correlation:{:?} , &correlation

            #[cfg(feature = "auth")]
            if wrong_workspace(&claims, &key, &correlation, ws).await {
                return;
            }

            // MODE logic
            let mut mode = Some(SaveMode::Upsert);
            if let Some(s) = if_match {
                if s == "*" {
                    // `If-Match: *` - return error if not exist
                    mode = Some(SaveMode::Update);
                } else {
                    // `If-Match: <md5>` - delete only if current
                    mode = Some(SaveMode::Equal(s));
                }
            }

            // Delete
            match db.delete(&key, mode).await {
                Ok(true) => result("OK", &correlation, ws).await,
                Ok(false) => result_err("not found", &correlation, ws).await,
                Err(e) => result_err(e.to_string(), &correlation, ws).await,
            }
        }

        WsCommand::Get { key, correlation } => {
            tracing::info!("GET {}", &key);

            #[cfg(feature = "auth")]
            if wrong_workspace(&claims, &key, &correlation, ws).await {
                return;
            }

            match db.read(&key).await {
                Ok(Some(data)) => match serde_json::to_value(&data) {
                    Ok(v) => result(v, &correlation, ws).await,
                    Err(e) => result_err(e.to_string(), &correlation, ws).await,
                },
                Ok(None) => result_err("not found", &correlation, ws).await,
                Err(e) => result_err(e.to_string(), &correlation, ws).await,
            }
        }

        WsCommand::List { key, correlation } => {
            tracing::info!("LIST {:?}", &key);

            #[cfg(feature = "auth")]
            if wrong_workspace(&claims, &key, &correlation, ws).await {
                return;
            }

            match db.list(&key).await {
                Ok(data) => {
                    let values: Vec<Value> = data.into_iter().map(|item| json!(item)).collect();
                    result(values, &correlation, ws).await;
                }
                Err(e) => result_err(e.to_string(), &correlation, ws).await,
            }
        }

        WsCommand::Sub { key, correlation } => {
            tracing::info!("SUB {}", &key);

            #[cfg(feature = "auth")]
            if wrong_workspace(&claims, &key, &correlation, ws).await {
                return;
            }

            hub_state.write().await.subscribe(session_id, key);
            result("OK", &correlation, ws).await;
        }

        WsCommand::Unsub { key, correlation } => {
            tracing::info!("UNSUB {}", &key);
            if key == "*" {
                hub_state.write().await.unsubscribe_all(session_id);
                result("OK", &correlation, ws).await;
            } else {
                #[cfg(feature = "auth")]
                if wrong_workspace(&claims, &key, &correlation, ws).await {
                    return;
                }

                hub_state.write().await.unsubscribe(session_id, key);
                result("OK", &correlation, ws).await;
            }
        }

        WsCommand::Sublist { correlation } => {
            tracing::info!("SUBLIST");
            // w/o Check workspace!
            let keys = hub_state.read().await.subscribe_list(session_id);
            result(keys, &correlation, ws).await;
        } // End of commands
    }
}
// }

pub async fn handler(
    req: HttpRequest,
    payload: web::Payload,
    db: web::Data<Db>,
    hub_state: web::Data<Arc<RwLock<HubState>>>,
) -> Result<HttpResponse, Error> {
    #[cfg(feature = "auth")]
    let claims = Some(
        req.extensions()
            .get::<Claims>()
            .expect("Missing claims")
            .to_owned(),
    );

    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, payload)?;

    let session_id = new_session_id();

    hub_state.write().await.connect(session_id, session.clone());
    tracing::info!("WebSocket connected: {}", session_id);

    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            if !matches!(msg, actix_ws::Message::Pong(_)) {
                tracing::debug!("WebSocket message: {:?}", msg);
            }

            // renew heartbeat to unixtime (all messages is activity, including "ping")
            hub_state.write().await.renew_heartbeat(session_id);

            match msg {
                actix_ws::Message::Ping(bytes) => {
                    session.pong(&bytes).await.ok();
                    continue;
                }

                actix_ws::Message::Pong(_) => {
                    continue;
                }

                actix_ws::Message::Text(text) if text == "ping" => {
                    let _ = session.text("pong").await;
                    continue;
                }
                actix_ws::Message::Text(text) if text == "pong" => {
                    continue;
                }

                actix_ws::Message::Text(text) => match serde_json::from_str::<WsCommand>(&text) {
                    Ok(cmd) => {
                        #[cfg(feature = "auth")]
                        {
                            let key = match &cmd {
                                WsCommand::Put { key, .. }
                                | WsCommand::Delete { key, .. }
                                | WsCommand::Get { key, .. }
                                | WsCommand::List { key, .. }
                                | WsCommand::Sub { key, .. }
                                | WsCommand::Unsub { key, .. } => key.as_str(),
                                _ => "",
                            };

                            if let Some(ref claim) = claims {
                                if !test_rego_claims(claim, cmd.as_ref(), key) {
                                    let _ = session.text("Unauthorized: Rego policy").await;
                                    break;
                                }
                            }
                        }

                        handle_command(
                            &mut session,
                            cmd,
                            &db,
                            &hub_state,
                            #[cfg(feature = "auth")]
                            claims.clone(),
                            session_id,
                        )
                        .await;
                    }

                    Err(err) => {
                        let _ = session.text(format!("Invalid JSON: {}", err)).await;
                    }
                },

                actix_ws::Message::Close(reason) => {
                    if let Err(e) = session.close(reason).await {
                        tracing::warn!("WS close error: {:?}", e);
                    }
                    break;
                }

                _ => {
                    tracing::info!("Unhandled WS message: {:?}", msg);
                }
            }
        }

        hub_state.write().await.disconnect(session_id);
        tracing::info!("WebSocket disconnected: {}", session_id);
    });

    Ok(response)
}
