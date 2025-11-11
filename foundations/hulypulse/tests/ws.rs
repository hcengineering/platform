use futures_util::{SinkExt, StreamExt};
use serde_json::{Value, json};
use tokio_tungstenite::{WebSocketStream, connect_async, tungstenite::Message};

#[tokio::test]
async fn websocket_echo_id() {
    let workspace = "00000000-0000-0000-0000-000000000001";
    let key = "TESTS/key1";

    let base =
        std::env::var("TEST_SERVER_URL").unwrap_or_else(|_| "ws://127.0.0.1:8099/ws".to_string());

    let (ws_stream, _) = connect_async(&base).await.expect("Can't connect WebSocket");
    let (mut write, mut read) = ws_stream.split();

    let mut req_id = 1;

    let msg = json!({
        "correlation": req_id.to_string(),
        "type": "info"
    });
    let r = send(&mut write, &mut read, &msg).await;
    assert_eq!(r["correlation"], req_id.to_string(), "ID should match");

    req_id += 1;
    let msg = json!({
        "correlation": req_id.to_string(),
        "type": "sub",
        "workspace": workspace,
        "key": key
    });
    let r = send(&mut write, &mut read, &msg).await;
    // println!("Answer: {:?}", r);
    assert_eq!(r["correlation"], req_id.to_string(), "ID should match");
    assert_eq!(r["result"], "OK", "Subscription should be ok");
}

async fn send<S>(
    write: &mut futures_util::stream::SplitSink<WebSocketStream<S>, Message>,
    read: &mut futures_util::stream::SplitStream<WebSocketStream<S>>,
    data: &Value,
) -> Value
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    // Sending
    let msg = Message::Text(data.to_string());
    write.send(msg).await.unwrap();

    // Waiting for response
    while let Some(Ok(Message::Text(resp))) = read.next().await {
        let json_resp: Value = serde_json::from_str(&resp).unwrap();
        return json_resp;
    }

    panic!("No answer from server");
}
