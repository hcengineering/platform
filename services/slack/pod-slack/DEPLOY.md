# Deploying pod-slack to AWS

The service uses Slack **Socket Mode**, so it makes an *outbound* websocket to
Slack. It needs **no public domain, no inbound ports, no load balancer** — only
outbound internet access and network reachability to your Huly instance.

## Environment variables

Provide these at runtime (never bake secrets into the image):

| Variable                | Required | Notes                                                    |
|-------------------------|----------|----------------------------------------------------------|
| `SLACK_BOT_TOKEN`       | yes      | `xoxb-…` Bot User OAuth Token                             |
| `SLACK_APP_TOKEN`       | yes      | `xapp-…` App-Level Token (Socket Mode)                   |
| `SLACK_SIGNING_SECRET`  | yes      | App signing secret                                       |
| `SLACK_NOTIFY_CHANNEL`  | no       | Channel id (`C…`) for task notifications                 |
| `HULY_URL`              | yes      | Prod Huly front URL, e.g. `https://huly.company.com`     |
| `HULY_EMAIL`            | yes      | Dedicated Huly **service account** (not admin)           |
| `HULY_PASSWORD`         | yes      | Service account password                                 |
| `HULY_WORKSPACE`        | yes      | Prod workspace slug                                      |
| `TASK_TRIGGER_EMOJI`    | no       | Reaction emoji that creates a task (default `ticket`)    |
| `PORT`                  | no       | HTTP health/notify port (default 4025)                   |

> **One instance per Slack app.** Socket Mode splits events across all live
> connections sharing a token. Run only ONE deployed instance, and stop any
> local `npm run run-local` while prod is up (or use a separate dev Slack app).

## Option A — EC2 + Docker (simplest)

```bash
# on the EC2 box (Amazon Linux/Ubuntu with Docker installed)
git clone <your-fork> && cd platform/services/slack/pod-slack

# build the image
docker build -t pod-slack .

# create an env file (chmod 600; keep it off git)
cat > slack.env <<'EOF'
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
SLACK_NOTIFY_CHANNEL=C...
HULY_URL=https://huly.company.com
HULY_EMAIL=slack-bot@company.com
HULY_PASSWORD=...
HULY_WORKSPACE=prod
EOF

# run with auto-restart
docker run -d --name pod-slack --restart unless-stopped --env-file slack.env pod-slack

# logs
docker logs -f pod-slack
```

## Option B — ECS Fargate (managed)

1. Build and push the image to ECR.
2. Store secrets in **AWS Secrets Manager** / SSM Parameter Store.
3. Create a Fargate task definition (1 task, no load balancer needed) that maps
   the secrets into the env vars above.
4. Run as a Service with desired count **1** and a restart policy.

CloudWatch captures stdout for logs. No security-group inbound rules required;
allow outbound 443 to Slack and to your Huly URL.

## Health check

`GET /health` on `PORT` returns `{"status":"ok"}` if you want a liveness probe.
