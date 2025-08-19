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

use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_stream::StreamExt;

use serde::Serialize;

use redis::{
    self, AsyncCommands, Client, RedisResult,
    aio::{ConnectionLike, PubSub},
};

#[derive(Debug, Clone, Serialize)]
pub enum RedisEventAction {
    Set,     // Insert or Update
    Del,     // Delete
    Unlink,  // async Delete
    Expired, // TTL Delete
    Other(String),
}

use actix::Message;

#[derive(Debug, Clone, Serialize, Message)]
#[rtype(result = "()")]
pub struct RedisEvent {
    pub db: u32,
    pub key: String,
    //    pub value: String,
    pub action: RedisEventAction,
}

/// Notifications: keyevent + generic + expired = "Egx" (no keyspace)
async fn try_enable_keyspace_notifications<C>(conn: &mut C) -> RedisResult<()>
where
    C: ConnectionLike + Send,
{
    let _: String = redis::cmd("CONFIG")
        .arg("SET")
        .arg("notify-keyspace-events")
        .arg("E$gx")
        .query_async(conn)
        .await?;
    Ok(())
}

/// Create async-connect, try to enable KEA=Egx, open PubSub-connect
pub async fn make_pubsub_with_kea(client: &Client) -> RedisResult<PubSub> {
    let mut conn = client.get_multiplexed_async_connection().await?;
    let _ = try_enable_keyspace_notifications(&mut conn).await;
    drop(conn);

    let pubsub = client.get_async_pubsub().await?;
    Ok(pubsub)
}

/// Listener keyevents
pub fn start_keyevent_listener(
    mut pubsub: PubSub,
) -> (mpsc::UnboundedReceiver<RedisEvent>, JoinHandle<()>) {
    let (tx, rx) = mpsc::unbounded_channel();

    let handle = tokio::spawn(async move {
        // Subscribe to events
        if let Err(e) = pubsub.psubscribe("__keyevent@*__:set").await {
            eprintln!("[redis_events] psubscribe error (set): {e}");
            return;
        }
        if let Err(e) = pubsub.psubscribe("__keyevent@*__:del").await {
            eprintln!("[redis_events] psubscribe error (del): {e}");
            return;
        }
        if let Err(e) = pubsub.psubscribe("__keyevent@*__:unlink").await {
            eprintln!("[redis_events] psubscribe error (unlink): {e}");
            return;
        }
        if let Err(e) = pubsub.psubscribe("__keyevent@*__:expired").await {
            eprintln!("[redis_events] psubscribe error (expired): {e}");
            return;
        }

        let mut stream = pubsub.on_message();

        while let Some(msg) = stream.next().await {
            let channel = match msg.get_channel::<String>() {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("[redis_events] bad channel: {e}");
                    continue;
                }
            };
            let payload = match msg.get_payload::<String>() {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("[redis_events] bad payload: {e}");
                    continue;
                }
            };

            // "__keyevent@0__:set" → event="set", db=0; payload = key
            let event = channel.rsplit(':').next().unwrap_or("");
            let action = match event {
                "set" => RedisEventAction::Set,
                "del" => RedisEventAction::Del,
                "unlink" => RedisEventAction::Unlink,
                "expired" => RedisEventAction::Expired,
                other => RedisEventAction::Other(other.to_string()),
            };

            let db = channel
                .find('@')
                .and_then(|at| channel.get(at + 1..))
                .and_then(|rest| rest.find("__:").map(|end| &rest[..end]))
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);

            let ev = RedisEvent {
                db,
                key: payload.clone(),
                action,
            };

            if tx.send(ev).is_err() {
                break;
            } // closed
        }
    });

    (rx, handle)
}
