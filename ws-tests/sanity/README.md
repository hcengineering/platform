# Running workspace sanity tests locally

## Prerequisites

1. **Platform running locally**  
   Front and account/transactor services must be up (e.g. via `docker compose up` or your usual dev setup).

2. **Node and dependencies**  
   From the repo root:
   ```bash
   rush install
   ```

3. **Playwright browsers** (once per machine):
   ```bash
   cd ws-tests/sanity
   npm run ci
   ```
   This installs Chromium and its dependencies for Playwright.

## Environment

Tests read configuration from environment variables. You can use a `.env` file in `ws-tests/sanity/` (see `ws-tests/sanity/.env` if present).

Typical local values:

| Variable | Example | Purpose |
|----------|---------|--------|
| `PLATFORM_URI` | `http://huly.local:8080` or `http://localhost:8080` | Front URL (where the app is opened in the browser) |
| `PLATFORM_TRANSACTOR` | `ws://huly.local:3333` or `ws://localhost:3333` | Transactor WebSocket |
| `DEV_URL` | Same as account API used by the frontend (e.g. `http://huly.local:8080/account` if front proxies to account, or `http://huly.local:3000` if account runs separately) | **Must** match the account service URL the frontend at `PLATFORM_URI` uses for login/createWorkspace. If wrong, API-based tests (e.g. createWorkspaceWithLogin) hit the wrong server and can fail with transactor/region errors. |
| `WORKSPACE_REGION` | e.g. `cockroach` | Optional. If unset, API tests fetch the first region from the account server (same as the frontend), so it usually works without this. |

Setup/auth tests also use `PLATFORM_USER`, `PLATFORM_USER_SECOND`, `SETTING`, `SETTING_SECOND` if you run the full suite with auth.

## Run tests

From **`ws-tests/sanity`**:

```bash
# All workspace tests (uses PLATFORM_URI + PLATFORM_TRANSACTOR from .env or script)
npm run dev-uitest
```

Override env vars if needed:

```bash
cross-env PLATFORM_URI=http://localhost:8080 PLATFORM_TRANSACTOR=ws://localhost:3333 npm run dev-uitest
```

**Run tests from one suite**:

```bash
npm run dev-uitest -- tests/workspace/create.spec.ts
```

**Single test by name**:

```bash
npm run dev-uitest -- tests/workspace/create.spec.ts -g "User can leave workspace"
```

## Debug

Run with Playwright’s debug UI (headed browser, step-through):

```bash
npm run dev-debug
```

Or for a single file:

```bash
npm run dev-debug -- tests/workspace/create.spec.ts
```

## Viewing results

- **HTML report**: after a run, open `playwright-report/index.html` (e.g. `npx playwright show-report` from `ws-tests/sanity`).
- **Traces**: on failure, traces are kept; open them with `npx playwright show-trace test-results/.../trace.zip`.

## Troubleshooting

- **Timeout / connection errors**: Ensure the platform is up at `PLATFORM_URI` and the transactor at `PLATFORM_TRANSACTOR`.
- **"Please provide transactor endpoint url"** (during workspace creation): (1) **DEV_URL** must point to the **account service** that the frontend uses (see table above). If you open the app at 8080 but the account API is at 3000, set `DEV_URL=http://huly.local:3000` (no `/account` unless that is the path). (2) The account service must have `TRANSACTOR_URL` set (e.g. in `dev/docker-compose.yaml`: `ws://huly.local:3332;;cockroach,`). Restart the account service after changing env.
- **Strict mode / selector errors**: If a locator matches multiple elements, the test may need a more specific selector (e.g. extra class like `.p-2` for the Owners member row).
- **Auth setup**: First run may execute auth setup; ensure `PLATFORM_USER` / `PLATFORM_USER_SECOND` (and passwords) match your local setup if you rely on stored auth.
