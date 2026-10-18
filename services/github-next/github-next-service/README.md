# GitHub Next service

Service for GitHub Next OAuth authorization and slot-based GitHub sync.

## Local OAuth setup

Create a GitHub OAuth App:

1. Open GitHub: `Settings` -> `Developer settings` -> `OAuth Apps` -> `New OAuth App`.
2. Use any clear app name, for example `Huly GitHub Next Local`.
3. Set `Homepage URL` to:

   ```text
   http://huly.local:8087
   ```

4. Set `Authorization callback URL` to:

   ```text
   http://huly.local:3510/api/v1/oauth/callback
   ```

5. Copy the generated `Client ID`.
6. Generate and copy a `Client secret`.

For local docker compose, put these values into the environment used by compose:

```bash
GITHUB_NEXT_CLIENT_ID=<github-oauth-client-id>
GITHUB_NEXT_CLIENT_SECRET=<github-oauth-client-secret>
```

Use the `Client ID` from this new GitHub Next OAuth App. Do not reuse the existing `GITHUB_CLIENTID`
unless that OAuth App has exactly this callback URL configured:

```text
http://huly.local:3510/api/v1/oauth/callback
```

`dev/docker-compose.yaml` maps `GITHUB_NEXT_CLIENT_ID` into the frontend as `GITHUB_NEXT_CLIENTID`
and into the service as `CLIENT_ID`. It maps `GITHUB_NEXT_CLIENT_SECRET` into the service as
`CLIENT_SECRET`. It also sets local `FRONT_URL` and `COLLABORATOR_URL` for markup conversion.

## Service env

The service reads env variables from `src/config.ts`.

Required:

```text
SERVER_SECRET
ACCOUNTS_URL
FRONT_URL
COLLABORATOR_URL
CLIENT_ID
CLIENT_SECRET
```

Optional:

```text
SERVICE_ID          default: github-next-service
PORT                default: 3510
PUBLIC_URL          default: http://huly.local:<PORT>
POLL_INTERVAL_MS    default: 300000
OUTBOUND_DEBOUNCE_MS default: 1000
SYNC_INBOUND        default: true
SYNC_OUTBOUND       default: true
HULYLAKE_URL        default: http://huly.local:8096
QUEUE_CONFIG        default from kafka package: huly.local:9092
QUEUE_REGION        default: empty
OTEL_EXPORTER_OTLP_ENDPOINT optional: OpenTelemetry collector URL
ENABLE_CONSOLE      default: true
LOG_LEVEL           default: info
VERSION             default: 0.7.0
```

Telemetry uses `SERVICE_ID` as the service name. The local Docker overlay exports traces to
`http://jaeger:4318/v1/traces`. Service logs are written to `logs/` and to the console when
`ENABLE_CONSOLE=true`.

For local docker, `PUBLIC_URL` must match the GitHub OAuth callback host:

```text
http://huly.local:3510
```

## Frontend config

The frontend needs `GITHUB_NEXT_CLIENTID` and `GITHUB_NEXT_URL` so it can open OAuth and call this service:

```text
GITHUB_NEXT_CLIENTID=<github-oauth-client-id>
GITHUB_NEXT_URL=http://huly.local:3510
```

Local docker compose already sets it for the `front` service.





Необходимо перезапускать воркер иначе он не знает об интеграции.
