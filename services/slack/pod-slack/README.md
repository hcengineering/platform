# pod-slack — Huly ⇄ Slack integration

A Slack bot service for the Huly Platform, built on Slack's official
[Bolt](https://slack.dev/bolt-js) SDK in **Socket Mode**. Socket Mode opens an
outbound websocket to Slack, so it works against a local `huly.local` dev stack
with **no public URL, tunnel, or ngrok** required.

## What it does today

- Responds when the bot is `@`-mentioned in a channel.
- Handles the `/huly` slash command (`help`, `status`, `ping`).
- Mirrors channel messages toward Huly via the `onSlackMessage` hook in `src/huly.ts`.
- Exposes `POST /notify` so other Huly services can push messages into Slack.

The Huly side of the bridge lives in `src/huly.ts` as clearly marked extension
points — wire it to `@hcengineering/api-client` once your platform runs locally.

## 1. Create the Slack app (on your personal Slack)

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**.
2. Name it (e.g. `Huly Bridge`) and pick your personal workspace.
3. **Socket Mode** (left sidebar) → toggle **Enable Socket Mode** on.
   - When prompted, generate an **App-Level Token** with the `connections:write`
     scope. Copy it → this is `SLACK_APP_TOKEN` (`xapp-...`).
4. **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**, add:
   `app_mentions:read`, `channels:history`, `channels:read`, `chat:write`,
   `commands`, `groups:history`.
5. **Event Subscriptions** → toggle **Enable Events** on → under
   **Subscribe to bot events** add: `app_mention`, `message.channels`.
   (No Request URL needed — Socket Mode delivers events over the websocket.)
6. **Slash Commands** → **Create New Command**: command `/huly`, any description.
   (Leave the Request URL blank/placeholder — Socket Mode handles it.)
7. **Basic Information** → copy the **Signing Secret** → `SLACK_SIGNING_SECRET`.
8. **Install App** (OAuth & Permissions → Install to Workspace). Copy the
   **Bot User OAuth Token** (`xoxb-...`) → `SLACK_BOT_TOKEN`.
9. In Slack, invite the bot to a channel: `/invite @Huly Bridge`. To get the
   channel id for `SLACK_DEFAULT_CHANNEL`, open the channel → **View channel
   details** → bottom of the popup.

## 2. Configure

```bash
cd services/slack/pod-slack
cp .env.example .env
# fill in SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN
```

## 3. Run locally

```bash
npm install
npm run run-local     # or: npm run dev  (auto-restart)
```

You should see `Bolt app started in Socket Mode`. In Slack, `@mention` the bot
or run `/huly status`.

Test the notification endpoint:

```bash
curl -X POST http://localhost:4025/notify \
  -H 'Content-Type: application/json' \
  -d '{"channel":"C0123ABCD","text":"Hello from Huly"}'
```

## 4. Build a Docker image

```bash
npm run build           # compiles to lib/
npm run docker:build    # -> hardcoreeng/slack
```

## Next steps (real Huly bridge)

In `src/huly.ts`, replace the `console.log` hooks with calls to
`@hcengineering/api-client`: authenticate a service account against
`ACCOUNTS_URL`, connect to a workspace, map a Slack channel to a Huly channel,
and create chat messages on inbound Slack events. For the reverse direction,
subscribe to Huly notifications and call `postToSlack()` from `src/bot.ts`.
See https://github.com/hcengineering/huly.core/tree/main/packages/api-client.
