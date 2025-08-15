/*
TODO: Со *

Сперва по точному совпадению
Потом перебором по *
*/


use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_stream::StreamExt;

use serde::Serialize;


use redis::{
    self,
    AsyncCommands,
    RedisResult,
    Client,
    aio::{PubSub, ConnectionLike},
};

#[derive(Debug, Clone, Serialize)]
pub enum RedisEventKind {
    Set,        // создание или перезапись (Redis не различает)
    Del,        // удаление
    Unlink,     // удаление (асинхронное)
    Expired,    // исчез по TTL
    Other(String),
}

use actix::Message;
// use serde::Serialize;


#[derive(Debug, Clone, Serialize, Message)]
#[rtype(result = "()")]
pub struct RedisEvent {
    pub db: u32,
    pub key: String,
    pub kind: RedisEventKind,
}







/// Включаем только нужные нотификации: keyevent + generic + expired → "Egx".
/// Это отключит шум от многих классов, включая keyspace и т.п.
/// Если прав на CONFIG нет — это не фатально.
async fn try_enable_keyspace_notifications<C>(conn: &mut C) -> RedisResult<()>
where
    C: ConnectionLike + Send,
{
    let _: String = redis::cmd("CONFIG").arg("SET").arg("notify-keyspace-events").arg("E$gx").query_async(conn).await?;
    Ok(())
}

/// Создаём обычный async-коннект, пробуем включить KEA=Egx,
/// затем открываем отдельный PubSub-коннект.
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
                Ok(c)  => c,
                Err(e) => { eprintln!("[redis_events] bad channel: {e}"); continue; }
            };
            let payload = match msg.get_payload::<String>() {
                Ok(p)  => p,
                Err(e) => { eprintln!("[redis_events] bad payload: {e}"); continue; }
            };

            // "__keyevent@0__:set" → event="set", db=0; payload = ключ
            let event = channel.rsplit(':').next().unwrap_or("");
	    let kind = match event {
	        "set"     => RedisEventKind::Set,
	        "del"     => RedisEventKind::Del,
	        "unlink"  => RedisEventKind::Unlink,
    		"expired" => RedisEventKind::Expired,
	        other     => RedisEventKind::Other(other.to_string()),
	    };

	    let db = channel.find('@')
	        .and_then(|at| channel.get(at + 1..))
	        .and_then(|rest| rest.find("__:").map(|end| &rest[..end]))
	        .and_then(|s| s.parse::<u32>().ok())
	        .unwrap_or(0);

            let ev = RedisEvent { db, key: payload.clone(), kind };

            if tx.send(ev).is_err() { break; } // closed
        }
    });

    (rx, handle)
}
