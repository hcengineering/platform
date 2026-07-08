# pod-slack — Slack → Huly task creation

Creates Huly Tracker issues from Slack messages: top-level channel messages,
the :ticket: reaction, or a "huly" mention in a thread. Files are attached,
confirmations post in-thread.

See **[DEPLOY-OAUTH.md](DEPLOY-OAUTH.md)** for setup: the service runs in
Slack OAuth mode over HTTPS (Events API). Configuration is via env vars —
see `.env.example`.

Run locally: copy `.env.example` to `.env`, fill it, then `npm run dev`.
