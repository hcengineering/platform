use redis::aio::MultiplexedConnection;

use redis::Connection;


use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_stream::StreamExt;

#[derive(Debug, Clone)]
pub enum RedisEventKind { Set, Del, Expired }

#[derive(Debug, Clone)]
pub struct RedisEvent {
    pub kind: RedisEventKind,
    pub key: String,
}

/// Попытаться включить keyspace notifications (необязательно, но полезно).
/// Если Redis управляемый и CONFIG запрещён, просто вернёт Err — это не критично,
/// слушатель всё равно можно запускать (если они уже включены конфигом).
pub async fn try_enable_keyspace_notifications(
    client: &redis::Client,
) -> redis::RedisResult<()> {
    let mut conn = client.get_tokio_connection().await?;
    let _: redis::Value = redis::cmd("CONFIG")
        .arg("SET")
        .arg("notify-keyspace-events")
        .arg("KExg")
        .query_async(&mut conn)
        .await?;
    Ok(())
}


/// Внутренняя функция: крутит pubsub и шлёт события в tx.
/// Завершается при ошибке соединения (см. spawn_* для обёртки).
/// Запускаем слушатель keyevents, используя redis::Client (сам внутри делает into_pubsub()).
pub async fn run_keyevent_listener_with_client(
    client: redis::Client,
    tx: tokio::sync::mpsc::UnboundedSender<RedisEvent>,
) -> redis::RedisResult<()> {
    let conn = client.get_tokio_connection().await?;
    let mut pubsub = conn.into_pubsub();

    pubsub.subscribe("__keyevent@0__:set").await?;
    pubsub.subscribe("__keyevent@0__:del").await?;
    pubsub.subscribe("__keyevent@0__:expired").await?;

    let mut stream = pubsub.on_message();

    while let Some(msg) = stream.next().await {
        let channel: String = match msg.get_channel() { Ok(c) => c, Err(_) => continue };
        let key: String = match msg.get_payload() { Ok(p) => p, Err(_) => continue };

        let kind = if channel.ends_with(":set") {
            RedisEventKind::Set
        } else if channel.ends_with(":del") {
            RedisEventKind::Del
        } else if channel.ends_with(":expired") {
            RedisEventKind::Expired
        } else {
            continue;
        };

        let _ = tx.send(RedisEvent { kind, key });
    }

    Ok(())
}



/// Удобная обёртка: создаёт канал, спаунит таск и возвращает (rx, handle).
/// Ошибки изнутри логируйте в таске, чтобы handle::<()> не падал наружу.
pub fn start_keyevent_listener(
    client: redis::Client,
) -> (tokio::sync::mpsc::UnboundedReceiver<RedisEvent>, tokio::task::JoinHandle<()>) {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let handle = tokio::spawn(async move {
        if let Err(e) = run_keyevent_listener_with_client(client, tx).await {
            eprintln!("[redis_events] listener stopped: {e}");
        }
    });
    (rx, handle)
}

