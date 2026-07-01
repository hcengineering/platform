# Deploying pod-slack (OAuth mode)

The service runs as a public HTTPS web service using Slack OAuth + the Events
API. Workspaces connect via "Add to Slack" — no tokens are hardcoded.

## Prerequisites
- A public HTTPS domain pointing at this service, e.g. `https://slack.company.com`
  (behind an ALB / nginx / Caddy with TLS). Slack requires HTTPS for OAuth and events.
- The Huly instance reachable from this service.

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

## Notes
- One running instance per file store. Scale-out needs a shared installation store.
- Socket Mode is NOT used in this mode; the app-level token is not needed.
