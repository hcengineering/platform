# GitHub Integration Guide

This guide describes how to configure the Huly GitHub integration for a self-hosted deployment.

It covers the full path from GitHub App registration to Huly `compose.yml`, reverse proxy wiring, verification, and troubleshooting.

## Scope

There are two different GitHub-related features in Huly:

1. GitHub OAuth login
2. GitHub service integration for repository, issue, pull request, comment, and review sync

They are not the same thing.

GitHub OAuth login is used for signing users into Huly and relies on:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

The GitHub service integration uses a GitHub App and relies on:

- `GITHUB_APPID`
- `GITHUB_APP_SLUG`
- `GITHUB_CLIENTID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

Important:
`GITHUB_CLIENT_ID` and `GITHUB_CLIENTID` are different variables for different features.

## Prerequisites

Before starting, make sure:

- your Huly instance is reachable via HTTPS
- the frontend is reachable from the browser at `https://<your-host>/`
- the account service is reachable behind the same host
- your reverse proxy can expose `/_github`
- you can restart the affected Docker services

For the current `huly-dev` deployment discussed in this repo, the relevant files are:

- `/home/alexander/huly-dev/huly_v7.conf`
- `/home/alexander/huly-dev/compose.yml`
- `/home/alexander/huly-dev/.huly.nginx`

## 1. Register the GitHub App

Go to GitHub:

- `Settings`
- `Developer settings`
- `GitHub Apps`
- `New GitHub App`

Use the following values:

- App name: choose a unique public name such as `my-huly-dev`
- Homepage URL: `https://<your-host>/`
- Callback URL: `https://<your-host>/github`
- Setup URL: `https://<your-host>/github?op=installation`
- Redirect on update: enabled
- Webhook URL: `https://<your-host>/_github/api/webhook`
- Webhook secret: generate a random secret and keep it for `GITHUB_WEBHOOK_SECRET`

### Required permissions

Set these permissions on the GitHub App:

- Commit statuses: `Read and write`
- Contents: `Read and write`
- Custom properties: `Read and write`
- Discussions: `Read and write`
- Issues: `Read and write`
- Metadata: `Read-only`
- Pages: `Read and write`
- Projects: `Read and write`
- Pull requests: `Read and write`
- Webhooks: `Read and write`

### Required events

Subscribe to these events:

- Issues
- Pull request
- Pull request review
- Pull request review comment
- Pull request review thread

### Secrets to collect

After creating the app, collect these values:

- `GITHUB_APPID`
- `GITHUB_APP_SLUG`
- `GITHUB_CLIENTID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

Notes:

- `GITHUB_APPID` is the numeric app ID from the GitHub App page.
- `GITHUB_APP_SLUG` is the slug from `https://github.com/apps/<slug>`.
- `GITHUB_CLIENTID` is the GitHub App client ID.
- `GITHUB_PRIVATE_KEY` must contain the full PEM content including `BEGIN` and `END` lines.

## 2. Add the secrets to the Huly deployment

Store the secrets in your deployment configuration.

For the current self-hosted layout this is typically `huly_v7.conf` or another environment file loaded by `compose.yml`.

Add:

```bash
GITHUB_APPID=<numeric-app-id>
GITHUB_APP_SLUG=<github-app-slug>
GITHUB_CLIENTID=<github-app-client-id>
GITHUB_CLIENT_SECRET=<github-app-client-secret>
GITHUB_PRIVATE_KEY=<full-private-key>
GITHUB_WEBHOOK_SECRET=<random-webhook-secret>
```

Important:

- do not truncate the private key
- do not accidentally use the OAuth login variable name `GITHUB_CLIENT_ID`
- after editing the env file, always validate with `docker compose config`

If your secret handling does not support multiline values cleanly, store the private key using a mechanism your Compose setup actually supports and verify that the container receives the exact PEM content.

## 3. Add the `github` service to `compose.yml`

Add this service to your deployment:

```yaml
github:
  image: hardcoreeng/github:${HULY_VERSION}
  ports:
    - 3500:3500
  environment:
    - PORT=3500
    - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
    - SERVER_SECRET=${SECRET}
    - ACCOUNTS_URL=http://account:3000
    - STATS_URL=http://stats:4900
    - APP_ID=${GITHUB_APPID}
    - CLIENT_ID=${GITHUB_CLIENTID}
    - CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    - PRIVATE_KEY=${GITHUB_PRIVATE_KEY}
    - COLLABORATOR_URL=ws${SECURE:+s}://${HOST_ADDRESS}/_collaborator
    - WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
    - FRONT_URL=http${SECURE:+s}://${HOST_ADDRESS}
    - BOT_NAME=${GITHUB_APP_SLUG}[bot]
  restart: unless-stopped
  networks:
    - huly_net
```

## 4. Expose the GitHub integration to the frontend

In the `front` service inside `compose.yml`, add:

```yaml
- GITHUB_URL=http${SECURE:+s}://${HOST_ADDRESS}/_github
- GITHUB_APP=${GITHUB_APP_SLUG}
- GITHUB_CLIENTID=${GITHUB_CLIENTID}
```

These values are required so the frontend can:

- build the GitHub authorize URL
- build the GitHub app installation URL
- talk to the GitHub integration backend through `/_github`

If these values are missing, `config.json` will expose empty GitHub fields and the UI may redirect to GitHub with `client_id=`.

## 5. Enable the reverse proxy route

In `.huly.nginx`, uncomment or add the GitHub route:

```nginx
location /_github {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    rewrite ^/_github(/.*)$ $1 break;
    proxy_pass http://github:3500/;
}
```

Without this route:

- the frontend cannot reach the GitHub backend
- webhook delivery will fail
- installation and authorization callbacks may break

## 6. Restart the affected services

After changing the env file, `compose.yml`, or `.huly.nginx`, restart the affected containers:

```bash
docker compose up -d --no-deps github front nginx
```

If `nginx` still points to an old container IP after a recreate, restart it explicitly:

```bash
docker compose restart nginx
```

For the current `huly-dev` deployment, this mattered after recreating `front`.

## 7. Verify the runtime configuration

### Check Compose expansion

Run:

```bash
docker compose config
```

Verify:

- the `github` service is present
- `front` contains `GITHUB_URL`
- `front` contains `GITHUB_APP`
- `front` contains `GITHUB_CLIENTID`

### Check public frontend config

Open:

- `https://<your-host>/config.json`

Verify these are no longer empty:

- `GITHUB_APP`
- `GITHUB_CLIENTID`
- `GITHUB_URL`

### Check the backend route

The route should at least be reachable through the reverse proxy. Even if a specific endpoint returns a non-200 application response, it must not fail because the route is missing.

### Check the UI flow

In Huly:

1. Open `Settings`
2. Open `Integrations`
3. Open `GitHub`
4. Click `Connect`

Expected behavior:

- authorization redirects to GitHub with a non-empty `client_id`
- installation redirects to the GitHub App page
- callbacks return to Huly instead of landing on `404`

## 8. Recommended end-to-end test

After the configuration is live:

1. Authorize the GitHub user account
2. Install the GitHub App into a test organization or repository scope
3. Select at least one repository
4. Connect the repository to an existing Huly project
5. Create a test issue in GitHub
6. Verify it appears in Huly
7. Add a comment in Huly
8. Verify the comment syncs back to GitHub

If webhooks are working, sync should happen without manual polling steps.

## 9. Common failure modes

### `client_id=` is empty in the GitHub authorize URL

Typical causes:

- `front` is missing `GITHUB_CLIENTID`
- `config.json` still exposes empty GitHub fields
- an old frontend build is still being served

What to check:

- `docker compose config`
- public `config.json`
- browser cache
- whether `front` was recreated after env changes

### GitHub shows `404` after redirect

Typical causes:

- Callback URL in the GitHub App does not match `https://<your-host>/github`
- Setup URL is missing or wrong
- the Huly route handling is old or not deployed

What to check:

- GitHub App `Callback URL`
- GitHub App `Setup URL`
- deployed frontend version

### Webhooks fail

Typical causes:

- `/_github` is not routed in `.huly.nginx`
- `GITHUB_WEBHOOK_SECRET` does not match the GitHub App webhook secret
- the `github` container is not running

What to check:

- `docker compose ps`
- `docker compose logs github`
- GitHub App webhook delivery history

### Frontend config is correct, but the integration still does not open correctly

Typical causes:

- a stale frontend build
- a stale reverse proxy
- an outdated frontend callback handler

For the fixes currently prepared in this fork, make sure the deployment includes:

- `a4de9e36e` `Fix login auth and routing regressions`
- `b03e564dd` `Fix GitHub integration connect callback flow`
- `760083d22` `Add GitHub config fallback for authorize flow`
- `bcf914cd2` `Fix login tabs build for deploy`

## 10. Difference between login OAuth and GitHub integration

If you want both features, you may need both configurations:

- GitHub OAuth login for user sign-in
- GitHub App service integration for repository synchronization

Do not assume that configuring one automatically configures the other.

In particular:

- `/_accounts/auth/github/callback` belongs to OAuth login
- `/_github/api/webhook` belongs to the GitHub integration backend
- `https://<your-host>/github` is used by the GitHub App callback/setup flow in the frontend

## 11. Operator checklist

Use this checklist before declaring the setup complete:

- GitHub App exists
- permissions are set correctly
- events are subscribed correctly
- all six integration secrets are present in the deployment
- `github` service exists in `compose.yml`
- `front` has `GITHUB_URL`, `GITHUB_APP`, and `GITHUB_CLIENTID`
- `.huly.nginx` exposes `/_github`
- `docker compose config` shows expanded values
- public `config.json` exposes non-empty GitHub values
- `docker compose ps` shows `github`, `front`, and `nginx` healthy/running
- Huly can authorize GitHub
- Huly can install the GitHub App
- repository linking works
- webhook-driven sync works in both directions
