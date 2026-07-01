# Slack UI integration — build & verify

This adds a **Slack** tile under **Settings → Integrations** in the Huly workbench.

## Packages added
- `plugins/slack` — plugin definition (component/string/handler IDs)
- `plugins/slack-assets` — i18n strings (`lang/en.json`)
- `plugins/slack-resources` — Svelte UI (`Configure.svelte`, Slack icon)
- `models/slack` — registers `setting.class.IntegrationType`

## Registrations wired
- `rush.json` — 4 new projects
- `models/all` (`src/index.ts` + `package.json`) — model imported + registered
- `dev/prod/src/platform.ts` — id import, assets import, `addStringsLoader`, `addLocation`
- `dev/prod/package.json` — 3 new deps

## Build & test (fast path — dev server)
From the repo root:

```bash
rush update          # picks up new packages + dependency changes
rush build           # builds the new plugin/model packages
cd dev/prod
rush validate
rushx dev-server     # serves the front at http://localhost:8080
```

Open http://localhost:8080, sign in, go to **Settings → Integrations** — the
**Slack** tile should appear with its icon. Clicking it opens the Configure card.

## Build & test (docker path — updates huly.local:8087)
```bash
cd dev
rush build
rush docker:build    # rebuilds the front image with the new plugin
rush docker:up
```
Then reload http://huly.local:8087.

## Notes
- The tile is informational: task creation still runs in the `pod-slack`
  backend service (env-configured). The UI panel explains this.
- If the build fails, it's most likely a missing dep or a Svelte/mergeIds typo —
  the compiler output points to the file. Fix and re-run `rush build`.
