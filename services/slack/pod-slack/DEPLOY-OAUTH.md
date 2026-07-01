# Deploying pod-slack (OAuth mode)

The service runs as a public HTTPS web service using Slack OAuth + the Events
API. Workspaces connect via "Add to Slack" — no tokens are hardcoded.

## Prerequisites
- A public HTTPS domain pointing at this service, e.g. `https://slack.company.com`
  (behind an ALB / nginx / Caddy with TLS). Slack requires HTTPS for OAuth and events.
- The Huly instance reachable from this service.

## Recommended: same-domain setup (no front config needed)
Serve `pod-slack` under the **same domain** as Huly, on the `/slack/*` path. Then
the "Connect" button in Huly's Settings → Integrations tile uses the same origin
automatically — you do NOT set `SLACK_SERVICE_URL` anywhere.

Bolt already serves its routes under `/slack/*` (`/slack/install`,
`/slack/oauth_redirect`, `/slack/events`), so the proxy must **preserve** the
path (use `handle`, not `handle_path`). Example Caddy config (TLS auto-provisioned):
```
huly.company.com {
    # Slack OAuth + events -> pod-slack (path kept as /slack/*)
    handle /slack/* {
        reverse_proxy pod-slack:4025
    }
    # Everything else -> Huly front
    handle {
        reverse_proxy huly-front:8080
    }
}
```
Set `PUBLIC_URL=https://huly.company.com` on the pod-slack service.

With this, Slack app URLs are:
`https://huly.company.com/slack/oauth_redirect` and `https://huly.company.com/slack/events`.

**Separate-subdomain alternative:** run the bot on its own host (e.g.
`https://slack.company.com`) and set `SLACK_SERVICE_URL=https://slack.company.com`
in the Huly front's runtime config so the tile button points there.

## Slack app configuration (api.slack.com/apps)
Do this AFTER the domain is live.

1. **Basic Information → App Credentials:** copy Client ID, Client Secret, Signing Secret.
2. **OAuth & Permissions → Redirect URLs:** add
   `https://slack.company.com/slack/oauth_redirect`
3. **OAuth & Permissions → Bot Token Scopes:** add
   `app_mentions:read`, `channels:history`, `channels:read`, `groups:history`,
   `chat:write`, `commands`, `reactions:read`, `reactions:write`, `files:read`
4. **Event Subscriptions:** enable, set Request URL to
   `https://slack.company.com/slack/events`
   then subscribe to bot events: `message.channels`, `message.groups`,
   `app_mention`, `reaction_added`
5. **Interactivity & Shortcuts:** (if used) Request URL `https://slack.company.com/slack/events`
6. **Manage Distribution:** activate distribution so other workspaces can install.

## Environment variables (no .env in prod — inject via env/secrets)
| Variable               | Notes                                                        |
|------------------------|--------------------------------------------------------------|
| `SLACK_CLIENT_ID`      | from Basic Information                                        |
| `SLACK_CLIENT_SECRET`  | secret — use Secrets Manager                                  |
| `SLACK_SIGNING_SECRET` | secret                                                       |
| `SLACK_STATE_SECRET`   | any long random string                                       |
| `PUBLIC_URL`           | `https://slack.company.com` (no trailing slash)              |
| `SLACK_NOTIFY_CHANNEL` | channel id `C...` for task notifications (optional)          |
| `TASK_TRIGGER_EMOJI`   | default `ticket`                                             |
| `INSTALL_STORE_PATH`   | path for the installations file (use a persistent volume)    |
| `HULY_URL`             | prod Huly front URL                                          |
| `HULY_EMAIL` / `HULY_PASSWORD` | Huly service account (secret)                        |
| `HULY_WORKSPACE`       | workspace slug tasks are created in                          |
| `PORT`                 | default 4025 (put TLS/proxy in front)                        |

## Run (Docker)
```bash
docker build -t pod-slack .
docker run -d --name pod-slack --restart unless-stopped \
  -p 4025:4025 \
  --env-file /secure/slack.env \
  -v pod-slack-data:/usr/src/app/data \
  pod-slack
```
Set `INSTALL_STORE_PATH=/usr/src/app/data/installations.json` so tokens survive
restarts. For multi-instance/autoscaled deployments, replace the file store in
`src/installationStore.ts` with a shared DB/Redis store.

## Connecting a workspace
Once deployed, an admin visits `https://slack.company.com/slack/install`
(or the "Connect" tile in Huly Settings → Integrations once the tile's service
URL is configured), authorizes, and the workspace is linked. From then on:
- messages create Huly tasks, the bot reacts 👀 on human messages,
- "huly" in a thread creates a task for the message above,
- the 🎫 reaction creates a task for any message,
- task assignment/status changes post to the notify channel.

## Post-deploy test checklist (run on the live domain)
1. **Events URL verifies:** in the Slack app → Event Subscriptions, the Request
   URL `https://DOMAIN/slack/events` shows **Verified** (Bolt answers the challenge).
2. **Install:** open `https://DOMAIN/slack/install` (or the Connect button in
   Huly Settings → Integrations once `SLACK_SERVICE_URL` is set) → authorize →
   redirected back with success; `installations.json` now has an entry.
3. **Invite the bot** to a channel: `/invite @<app>`.
4. **Top-level message → task:** post a message → bot reacts 👀 and a task
   appears in Huly Tracker; a confirmation replies in-thread.
5. **Human-only 👀:** the bot does not react to other bots' messages.
6. **Thread trigger:** in a thread, reply mentioning `huly` → a task is created
   for the message directly above the reply.
7. **Reaction trigger:** react to any message with `:ticket:` (or
   `TASK_TRIGGER_EMOJI`) → a task is created for that message.
8. **Notifications:** assign a task / change its status in Huly → within ~10s an
   update posts to `SLACK_NOTIFY_CHANNEL`.
9. **Image attach:** post an image with a caption → the image attaches to the task.

## Notes
- One running instance per file store. Scale-out needs a shared installation store.
- Socket Mode is NOT used in this mode; the app-level token is not needed.
- Local testing note: the full flow can't be verified on a laptop — Slack must
  reach the events URL from the internet. Test on the deployed domain.
