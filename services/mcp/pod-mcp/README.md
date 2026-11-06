# TraceX MCP Service

This pod exposes TraceX workspace tools as a Streamable HTTP MCP server.

## Endpoints

The default local endpoints are:

```text
MCP:    http://localhost:4020/mcp
Health: http://localhost:4020/health
```

MCP uses OAuth authorization code with PKCE. Add the server URL in your client and sign in through TraceX in the browser. No manual API-key creation or copying is required.

One connection can work with every workspace the authenticated account can currently access. Call `my.workspaces` first, then pass an exact returned workspace ID in the `workspace` argument of every other tool. There is no implicit current workspace. Ask the user when the target is ambiguous. Results identify the target workspace and installation.

OAuth access tokens are opaque, short-lived, and bound to this MCP resource. TraceX account tokens stay on the issuer. Workspace tokens are obtained through the existing accounts `selectWorkspace` exchange when a tool runs. Membership is checked even when a workspace client is cached.

Consent grants access to one explicitly selected workspace or all currently accessible workspaces, including future memberships. `my.workspaces` only lists workspaces allowed by that connection. Calls for a different workspace are rejected before token exchange or cache access. Refresh preserves the original restriction; changing it requires a new authorization.

## Local Docker Compose

Build the image before starting the compose service:

```bash
rush build --to @hcengineering/pod-openauth --to @hcengineering/pod-mcp --to @hcengineering/pod-front
rush bundle --to @hcengineering/pod-openauth --to @hcengineering/pod-mcp --to @hcengineering/pod-front
rush docker:build --to @hcengineering/pod-openauth --to @hcengineering/pod-mcp --to @hcengineering/pod-front
```

Start the service from the repository root:

```bash
docker compose -f dev/docker-compose.yaml up -d openauth mcp front
```

Check that the service is running:

```bash
curl http://tracex.local:4020/health
```

## Codex

Register the Streamable HTTP endpoint and complete browser authorization:

```bash
codex mcp add tracex --url http://tracex.local:4020/mcp
codex mcp login tracex
```

In Codex desktop, add the same URL and use its authentication action. Restart the client if it does not pick up the new configuration.

The browser asks permission to access all current and future workspaces available to the account. Existing TraceX sessions and login methods are reused, including two-factor authentication and external identity providers.

Manage and revoke individual connections under **Account settings → Authentication → MCP connections**. Revocation blocks new requests and refresh immediately. A request that has already started is not rolled back. Expired TraceX account sessions require browser sign-in again.

## Other MCP Clients

Use an OAuth-capable Streamable HTTP client with the same URL. The service advertises resource metadata and an authorization server with dynamic public-client registration, PKCE S256, access-token renewal, and issuer-bound callback responses. ChatGPT compatibility must be checked separately; local stdio transport is not implemented.

The server returns JSON text for all tool results and also fills MCP `structuredContent` when a tool has an output schema.

## Tools

### Cards

Card tools use the `card.` namespace:

```text
card.list_spaces
card.list_master_tags
card.master_tag_details
card.get
card.search
card.create
card.update
```

Use `card.list_spaces` to discover visible card spaces. Use `card.list_master_tags` and `card.master_tag_details` to discover available card types, master attributes, versioning settings, and tag mixins before creating or updating cards.

`card.get`, `card.create`, and `card.update` support top-level collaborative card content as HTML. `card.update` also supports `TypeCollaborativeDoc` attribute updates through the collaborator service.

### Chat

The [message model](../../../docs/chat-messages.md) describes streams, reading positions and notifications.
All six tools use the same stream address, `target: { "class": "<class-id>", "id": "<document-id>" }`.

| Tool | Purpose |
| --- | --- |
| `chat.list` | Discover streams, optionally filtered by `type`, `parent` or `name` |
| `chat.unread` | List streams with unread messages and database-calculated `unreadCount` |
| `chat.messages` | Read ordinary history from one required `target` |
| `chat.unread_messages` | Read unread messages everywhere, or within optional `target` |
| `chat.send` | Send Markdown to the required `target` as the authenticated user |
| `chat.mark_read` | Explicitly mark the whole required `target` read |

Every call requires an explicit `workspace` from `my.workspaces`.

#### Stream identity and context

| Readable type | Target document | Parent context |
| --- | --- | --- |
| `channel` | Channel | None |
| `direct` | Personal/group direct chat | None |
| `discussion` | Discussion itself | Owner document |
| `thread` | Root chat message, with its actual class | Containing channel, direct or discussion |

Use the returned target unchanged. A thread has no separate Thread document: its target is the
root message's class and id. Reply ids, document activity and messages attached directly to
arbitrary documents are not valid stream targets. The containing chat and access checks are
resolved internally.

Every stream summary contains `target`, `type` and `name`. Direct names omit the current account
except for a chat with oneself. Thread names are root-message previews. Optional `parent` and
`parentTitle` provide context; a discussion can also expose `linkedTo` and `resolved`.
Parents are not required to read, send or mark a stream read. A discussion owner's id must
not replace the discussion's own target.

Channels and directs require current-account membership; discussions use their access policy.
Tools never join chats or add followers.

#### Discovery

Without filters, `chat.list` returns active channels, directs and discussions.
Use `type: "thread"` for threads with existing replies, including threads the account does not follow.
A root without replies can still be used as a target to send its first reply.

For threads, `parent` filters by containing chat. For discussions, it filters by owner document.
When `type` is omitted, a chat parent selects threads; another document parent selects discussions.
`name` filters names/previews, not message text. Personal hidden state does not filter discovery.
Discovery pages use stable identifier order, across the different storage domains.

#### Unread streams and messages

`chat.unread` returns one row for every stream with a positive unread-message count.
A thread is a separate row: its replies are not added to its parent chat's count.
Optional `type` filters the rows. Each row includes `unreadCount` and `readFrom`.
Counts use a database total with the same filters as message retrieval; history is not downloaded
to count it. Counts reflect the query time and can change with new messages or concurrent reading.

Unread discovery examines the account's personal contexts, including root-message contexts for
unfollowed threads. It does not require a UI timestamp marker or unviewed reply notification:
those signals do not necessarily match the unread-history range.
Archived and unjoined chats are omitted.

`chat.unread_messages` returns messages oldest first, with `stream` metadata on every message.
Omit `target` for the global feed, or supply any supported target for one stream.
Reading uses the same personal boundary and own-identity exclusion as the counter:

- Missing context: no unread messages.
- Existing never-read context: boundary zero.
- Otherwise: last-viewed timestamp, possibly rewound just before an older message referenced
  by an unviewed activity/mention notification in that stream.
- Only messages strictly after the boundary are returned, excluding every social identity
  belonging to the current account.

Notification creation time is not a message timestamp. Deleted or foreign-stream references
do not rewind the boundary. A reopened range can include previously viewed messages; this is
not an individual read receipt for each returned row. See the
[reading-state guide](../../../docs/chat-messages.md#unread-history).

#### History, pagination and read actions

`chat.messages` returns `stream`, `messages` and, for a thread, its separate `root`.
Main-stream history excludes replies. History defaults to the latest page (`direction: "older"`);
`direction: "newer"` traverses forward. Each returned page is chronological.
Unread selection belongs only to `chat.unread_messages`; history has no `unreadOnly` flag.

Readers accept `limit` (default `50`, maximum `200`), and return `hasMore` and optional `nextCursor`.
Pass the cursor unchanged with the same target and filters. History/feed cursors retain both
time and message identity so equal timestamps do not lose messages.
Discovery and global unread scanning can return an empty filtered page with `hasMore: true`;
continue with its cursor.

Fetching history or discovering streams does not mark anything read.
`chat.mark_read` updates the selected context's timestamp and unviewed notifications together.
It affects the whole stream, including beyond a fetched page. A chat and each thread are
independent. The result contains `readAt` and `readCount` (notifications, not messages).
Without a personal context it returns `readCount: 0` without `readAt` and creates nothing.
There is no mark-unread tool.

For example, read unread replies under a root message:

```json
{
  "name": "chat.unread_messages",
  "arguments": {
    "workspace": "<workspace-id-from-my.workspaces>",
    "target": {
      "class": "chunter:class:ChatMessage",
      "id": "<root-message-id>"
    }
  }
}
```

Use the same target in `chat.send` with Markdown `content` or in `chat.mark_read`.
The actual root class comes from tool results; do not infer it from a document title.

Sending to archived chats is rejected. Native reference mentions become text, while plain
`@names` remain text. Sending has no idempotency guarantee: do not automatically retry an
uncertain send. Message text search, conversation/participant management, editing/deletion,
uploads and addressed mentions are outside this version.

Attachments include ids, blob ids, names, sizes and MIME types, plus storage-provided HTTP(S)
URLs when available. URLs may expire or require authorization; metadata remains available
without a URL. Workspace storage identity comes from the authenticated workspace exchange.

### Fulltext

Use `fulltext.search` to search indexed workspace objects and return compact object references:

```json
{
  "name": "fulltext.search",
  "arguments": {
    "workspace": "<workspace-id-from-my.workspaces>",
    "query": "risk",
    "classes": ["card:class:Card"],
    "limit": 20
  }
}
```

Optional filters include `classes`, `spaces`, and `includeClassDescendants`.

### Object Lookup

Use `object.lookup` to list recent objects by class or mixin and return compact references:

```json
{
  "name": "object.lookup",
  "arguments": {
    "workspace": "<workspace-id-from-my.workspaces>",
    "classId": "contact:mixin:Employee",
    "limit": 50
  }
}
```

Results are sorted by `modifiedOn` descending. `limit` defaults to `50` and is capped at `200`.

## Environment

The compose service uses:

```text
PORT=4020
SERVER_SECRET=secret
ACCOUNTS_URL=http://tracex.local:3000
COLLABORATOR_URL=ws://tracex.local:3078
SERVICE_ID=mcp-service
WORKSPACE_CLIENT_CACHE_MS=0
STORAGE_CONFIG=${STORAGE_CONFIG}
OPENAUTH_ISSUER_URL=http://tracex.local:3001
OPENAUTH_INTERNAL_URL=http://openauth:3001
OPENAUTH_MCP_RESOURCE_URL=http://tracex.local:4020/mcp
OPENAUTH_ALLOW_HTTP=true
```

`ACCOUNTS_URL` and `COLLABORATOR_URL` are required. `COLLABORATOR_URL` is used for correct card content updates and `TypeCollaborativeDoc` attribute updates.

`SERVER_SECRET` is required. It verifies internal TraceX tokens and authenticates MCP to the issuer. Legacy API-key authentication is not supported on `/mcp`.

`OPENAUTH_ISSUER_URL` and `OPENAUTH_MCP_RESOURCE_URL` must match externally visible URLs. `OPENAUTH_INTERNAL_URL` is the server-to-server issuer address; it defaults to the public issuer. HTTPS is required outside local development. `OPENAUTH_ALLOW_HTTP=true` is a development-only opt-in.

Path-based routing on one origin is supported. For example, use issuer `https://stage.example.com/oauth`, internal issuer `http://openauth:3001/oauth`, and resource `https://stage.example.com/mcp`. MCP handles requests on the configured resource path, including nested paths such as `/services/mcp`. Preserve those paths through the proxy and route the discovery URLs at the origin root separately. See the [proxy example](../../../pods/openauth/README.md#one-origin-with-path-based-routing).

The front service needs `OPENAUTH_PUBLIC_URL` to expose the trusted issuer URL to the login and connection-management UI. See [OpenAuth deployment](../../../pods/openauth/README.md) for issuer configuration. Production and staging must use separate public issuer/resource URLs and separate issuer databases.

`WORKSPACE_CLIENT_CACHE_MS=0` disables the workspace client cache so runtime card type and space changes are visible to the next tool call. Set a positive value only when schema freshness is less important than reducing model reloads.
