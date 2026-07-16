# HH Shade — Fork Cleanup Notes (Track B)

*What was changed relative to the pristine upstream fork (`origin/develop` @ `293bc91`), and — importantly — what was investigated and deliberately **not** done. Companion to `HANDOFF.md` "TRACK B". Everything here is reversible; no build-time stripping was performed.*

---

## TL;DR

- ✅ **Branding hygiene is done** and is the substance of this pass (README, AGENTS, ARCHITECTURE, both `branding.json` files → "HH Shade"; upstream "hosted Huly shutting down" notice + marketing removed; attribution to upstream Huly preserved; build/setup/test docs preserved).
- ↩️ **Runtime app lean-down was attempted via `DISABLED_FEATURES` and reverted** — because a code trace proved `DISABLED_FEATURES` does **not** hide launcher apps. The handoff's suggested Track B mechanism was inaccurate. `DISABLED_FEATURES` is back at its baseline value (`auto-translate,mailboxes`).
- 📌 **Actually hiding the app tiles is deferred** — it requires either a small config-plumbing addition (`ExcludedApplications`) or the model/build-time change the handoff already defers (`PluginConfiguration.enabled=false`). Details below.

---

## 1. What changed (the committed diff vs `origin/develop`)

| File | Change |
|---|---|
| `README.md` | Rebranded Huly → HH Shade / 4C Shade. Removed the "hosted Huly is shutting down" notice, social/marketing badges, and Repobeats activity image. **Kept** all build/setup/test instructions (they still apply to the fork) and **kept** honest upstream attribution + links. |
| `AGENTS.md` | Added a one-line context note pointing to `CLAUDE.md` / `docs/4c-shade/`. The two behavioral rules ("Do not run build commands…", "When finishing work, state the task is complete…") are **preserved verbatim**. |
| `ARCHITECTURE_OVERVIEW.md` | Title → "HH Shade / 4C Shade Architecture Overview" + a note that the service map is the upstream Huly architecture and remains accurate. Service tables unchanged. |
| `dev/branding.json` | `title` fields "Huly"/"TraceX" → "HH Shade" for the huly/tracex host entries. **`key` identifier fields unchanged** (changing them would break config lookups). |
| `dev/prod/public/branding.json` | Same `title` → "HH Shade" rebrand; `key` fields unchanged. |

Net diff is **branding + docs only** — no code, model, or migration files touched.

## 2. The `DISABLED_FEATURES` correction (why the runtime-hide was reverted)

The handoff proposed hiding non-Shade apps at runtime "via `dev/branding.json` app preset and/or `models/workbench` `HiddenApplication`." A full trace of the front-end showed **all three assumed levers are wrong for a global, all-users, config-only app hide:**

- **`Branding` type** (`foundations/core/packages/core/src/server.ts`) has only `key/front/title/language/initWorkspace/lastNameFirst/protocol` — **no app field**. `branding.json` can rebrand the title; it cannot hide apps.
- **`workbench.class.HiddenApplication`** is a **per-user `Preference`** (`models/workbench/src/index.ts`) — not a global lever.
- **`DISABLED_FEATURES`** (env → `presentation` metadata `DisabledFeatures` → `isDisabled(feature)`) — despite `docs/disableFeatures.md` saying e.g. "recruit — Will disable Recruit", it does **not** hide any launcher app. It gates exactly four surfaces: the invite UI, account-settings sections (`SettingsCategory.feature`), workspace-settings sections (`WorkspaceSettingCategory.feature`), and **plugin cards in Settings → Configuration** (`Configure.svelte` via `PluginConfiguration.pluginId`). For a token like `recruit`, the only visible effect is hiding the Recruit *card in the admin Configuration grid* — the Recruit app tile in the launcher stays.

**Proof — the launcher filter never consults `DisabledFeatures`:**

```ts
// plugins/workbench-resources/src/components/Workbench.svelte:156-164
const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []
const apps = client.getModel()
  .findAllSync<Application>(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } })
  .filter((it) => isAllowedToRole(it.accessLevel, account))
```

Apps are filtered by `Application.hidden`, `workbench.metadata.ExcludedApplications`, per-user `HiddenApplication`, and role — never by `DisabledFeatures`. To actually remove a tile you must set `PluginConfiguration.enabled=false` (`models/all/src/index.ts`), which makes `pluginFilterTx` drop the plugin's `Application` create-tx. `DISABLED_FEATURES` never sets `enabled`.

Because the `DISABLED_FEATURES=…,recruit,lead,inventory,calendar,telegram,github` edit achieved nothing toward the goal (and only hid some admin config cards), it was **reverted** to the baseline `auto-translate,mailboxes` in both resolution points (`dev/docker-compose.yaml`, `dev/prod/public/config.json`).

*(Doc bugs noted for later: `docs/disableFeatures.md` lists `integration` but the settings category uses `integrations`; `cards` vs plugin id `card`; `training` vs feature `trainings`. Singular/plural mismatches mean those documented tokens silently match nothing.)*

## 3. Which HIDE-list apps are actually visible tiles (source-verified)

A tile shows in the launcher only if it **both** registers a `workbench.class.Application` with `hidden: false` **and** its `PluginConfiguration.enabled` is `true` in `models/all/src/index.ts` (an `enabled: false` plugin has its `Application` create-tx pruned by `pluginFilterTx`, since `defaultFilter` includes `workbench.class.Application`). Against both conditions, only **3** HIDE-list apps are actually shown by default:

| App | `Application.hidden` | `PluginConfiguration.enabled` | Shown by default? |
|---|---|---|---|
| `recruit` | false (`models/recruit/src/index.ts:129`) | true (`models/all/src/index.ts:234`) | **yes — needs hiding** |
| `hr` | false (`models/hr/src/index.ts:192`) | true (`models/all/src/index.ts:304`) | **yes — needs hiding** |
| `love` (Office) | false (`models/love/src/index.ts:255`) | true (`models/all/src/index.ts:395`) | **yes — needs hiding** |
| `lead` | false | **false** (`models/all/src/index.ts:259`) | no — already pruned |
| `inventory` | false | **false** (`models/all/src/index.ts:283`) | no — already pruned |
| `board` | false / `hidden:true` cfg | **false** (`models/all/src/index.ts:340`) | no — already pruned |

The remaining HIDE-list apps register **no launcher Application** and need no hiding: `calendar` (the tile users see is Time/Planner + Team), `telegram`, `github` (injects a "Pull Requests" special *inside* Tracker), `gmail`, `mail`, `huly-mail`, `billing`, `payment`, `achievement`, `rating`, `support`, `recorder`, `bitrix`, `ai-assistant`, `ai-bot`, `openai`, `analytics-collector`.

**So the real app-hide scope is just 3 tiles — `recruit`, `hr`, `love`.** Most of the handoff's HIDE list is already handled by upstream defaults (`enabled:false`) or was never a launcher app. (Note: this corrects an earlier draft of this doc that listed 6 "shown by default" tiles — `lead`/`inventory`/`board` register apps but are already off.)

## 4. Recommended next pass — how to actually hide the 3 tiles (choose one)

**Option A — `ExcludedApplications` config plumbing (reversible, all-users, small code add).**
`Workbench.svelte` already excludes `workbench.metadata.ExcludedApplications`, but **nothing sets it** — only `ExcludedApplicationsForAnonymous` is wired to config (`EXCLUDED_APPLICATIONS_FOR_ANONYMOUS` in `dev/prod/src/platform.ts` + `pods/front/src/__start.ts`). Mirror that wiring: add an `EXCLUDED_APPLICATIONS` config key that `setMetadata(workbench.metadata.ExcludedApplications, [...])` with the Refs of the 3 apps (`recruit.app.Recruit`, `hr.app.HR`, `love.app.Love`). ~3 small edits (platform.ts, front `__start.ts`, desktop), fully reversible via config, hides tiles for all logged-in users. *Slightly beyond "config-only" (adds plumbing), but no model/migration change.*

**Option B — `PluginConfiguration.enabled=false` (the handoff's deferred build-time path).**
Flip `enabled: false` for just `recruit`/`hr`/`love` in `models/all/src/index.ts` (lines 234/304/395) — the same one-word change upstream already applies to `lead`/`inventory`/`board`. This is the upstream-intended way and also drops their model txs; a model/build-time change → matches the handoff's "Defer: build-time stripping until the app set is validated running." Lowest-footprint option and consistent with how the codebase already gates optional apps.

**Not recommended:** per-user `HiddenApplication` (not global); `branding.json` (cannot hide apps).

## 5. Manual verification checklist (no build was run — per project rule)

- [ ] `git diff origin/develop` shows **only** branding + docs (README, AGENTS, ARCHITECTURE, both branding.json, this notes file) — `DISABLED_FEATURES` back to baseline, no code/model diffs.
- [ ] `dev/branding.json` + `dev/prod/public/branding.json`: `key` fields unchanged; only `title` → "HH Shade".
- [ ] `AGENTS.md` still contains both behavioral rules verbatim.
- [ ] After `rush docker:up` (when you build): app launcher still shows the full Huly set (app-hiding is intentionally deferred — see §4); branding reads "HH Shade".
- [ ] No secrets/tokens introduced.
