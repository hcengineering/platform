# HulypulseClient

A TypeScript/Node.js client for the Hulypulse WebSocket server.
Supports automatic reconnection, request–response correlation, `get` / `put` / `delete`, and subscriptions.

---

### Main Methods

## put(key: string, data: string, TTL?: number): Promise<boolean>

Stores a value under a key.

    TTL (optional) — time-to-live in seconds.

    Resolves with true if the operation succeeded.

await client.put("workspace/users/123", "Alice", 60) → true

## get(key: string): Promise<any | false>

Retrieves the value for a key.

    Resolves with the value if found.
    Resolves with false if the key does not exist.

const value = await client.get("workspace/users/123")
if (value) {
  console.log("User data:", value)
} else {
  console.log("User not found")
}

## get_full(key: string): Promise<{data, etag, expires_at} | false>

Retrieves the full record:

    data — stored value,
    etag — data identifier,
    expires_at — expiration in seconds.

const full = await client.get_full("workspace/users/123")
if (full) {
  console.log(full.data, full.etag, full.expires_at)
}

## delete(key: string): Promise<boolean>

Deletes a key.

    Resolves with true if the key was deleted.
    Resolves with false if the key was not found.

const deleted = await client.delete("workspace/users/123")
console.log(deleted ? "Deleted" : "Not found")

## subscribe(key: string, callback: (msg, key, index) => void): Promise<boolean>

Subscribes to updates for a key (or prefix).

    The callback is invoked on every event: Set, Del, Expired

    Resolves with true if a new subscription was created.
    Resolves with false if the callback was already subscribed.

const cb = (msg, key, index) => {
  if( msg.message === 'Expired' ) console.log(`${msg.key} was expired`)
}

await client.subscribe("workspace/users/", cb)
// Now cb will be called when any key starting with "workspace/users/" changes

## unsubscribe(key: string, callback: Callback): Promise<boolean>

Unsubscribes a specific callback.

    Resolves with true if the callback was removed (and if it was the last one, the server gets an unsub message).
    Resolves with false if the callback was not found.

await client.unsubscribe("workspace/users/", cb)

## send(message: any): Promise<any>

Low-level method to send a raw message.

    Automatically attaches a correlation id.
    Resolves when a response with the same correlation is received.

const reply = await client.send({ type: "get", key: "workspace/users/123" })
console.log("Raw reply:", reply)

## Reconnection

    If the connection drops, the client automatically reconnects.
    All active subscriptions are re-sent to the server after reconnect.

## Closing

The client supports both manual closing and the new using syntax (TypeScript 5.2+).

client[Symbol.dispose]() // closes the connection

or, if needed internally:

(client as any).close()

---

## Usage Example

```ts
import { HulypulseClient } from "./hulypulse_client.js"

async function main() {
  // connect
  const client = await HulypulseClient.connect("wss://hulypulse_mem.lleo.me/ws")

  // subscribe to updates
  const cb = (msg, key, index) => {
    console.log("Update for", key, ":", msg)
  }
  await client.subscribe("workspace/users/", cb)

  // put value
  await client.put("workspace/users/123", JSON.stringify({ name: "Alice" }), 5)

  // get value
  const value = await client.get("workspace/users/123")
  console.log("Fetched:", value)

  // get full record
  const full = await client.get_full("workspace/users/123")
  if (full) {
    console.log(full.data, full.etag, full.expires_at)
  }

  // delete key
  const deleted = await client.delete("workspace/users/123")
  console.log(deleted ? "Deleted" : "Not found")

  // unsubscribe
  await client.unsubscribe("workspace/users/", cb)

  // low-level send
  const reply = await client.send({ type: "sublist" })
  console.log("My sublists:", reply)

  // dispose
  client[Symbol.dispose]()
}

main()
