# HH Shade — Work Handoff

*For a fresh Claude Code session scoped to the `hh-shade` repo. Read this + the files it references, then continue the two tracks below. The repo is already renamed to `hh-shade`; develop on branch `claude/dibbits-workspace-consolidation-69sqj8` — **the only branch this environment can push to.***

## Read first (context base — already committed in this repo)

- `CLAUDE.md` — project memory (identity, guardrails, branch).
- `docs/4c-shade/VISION-BRIEF.md` — what 4C Shade is (product, four-legged-flywheel moat, architecture, rollout, v1-vs-roadmap, open questions). **Start here.**
- `docs/4c-shade/DECISION-LOG.md` — locked decisions + open questions.
- `docs/4c-shade/LICENSING-AND-ENTITY.md` — permissive-licensing framework + 4C Digital / FutureBuild / Hardscape House entity & IP structure.
- `docs/hh-shade/CONTEXT.md` — this instance (delivers the Dibbits/HardscapeOS build; sibling repos; alpha status).

## Working principle — DESIGN-FIRST (the G-DESIGN gate)

Map and prototype the UI/UX, get it **human-approved**, *then* build. Prototype before implementation. Tools:
- **Stitch** (human-led) — generates screens + a design system; exports tokens / `DESIGN.md` that build agents later consume via its MCP.
- **Miro** (MCP available in-session) — flow maps, architecture/system diagrams, design boards; readable back as reference.
- **Local HTML generation** — fast clickable HTML/CSS prototypes for iteration before any real build.

---

## TRACK A (primary) — 4C Shade console UI/UX map + prototypes

**Target = the 4C Shade console/platform UI** (product option 1) — the product's own interface. **Spend the design effort on the differentiating surfaces nobody else has; do NOT try to out-polish generic agent-manager UIs (Cursor/GitHub/Antigravity).**

**Differentiating surfaces to design (the product's face):**
1. **Agent fleet / mission-control view** — see + steer parallel agent threads (Prism coordinator + Claude engineering + Gemini design), grouped by state; artifact-first review (plans, diffs, test evidence).
2. **Gate + traceability cockpit** — the 5 gates (G-DESIGN / G-LOCK / G-PUSH / G-CLIENT / G-MONEY) as first-class objects wired into review; the **requirement ↔ spec ↔ code ↔ test ↔ deploy traceability view**; the audit "who-approved-what" ledger; the **domain-expert sign-off** flow (approve at the spec/gate/artifact level, not only senior-eng diff review).
3. **Second-brain intake view** — expert conversation → cited scope / work-items / specs; the conversation→requirement provenance trail.
4. **Backbone screens it wraps** (mostly Huly's existing UI): tracker (PM), documents (KB), controlled-doc specs (QMS lifecycle). Design the Shade overlays/branding on these.

**Approach:**
1. Produce a **UI/UX map** — the screen inventory + primary user flows (as a Miro board and/or an outline doc).
2. **Prototype** the priority screens — Stitch for high-fidelity + design system; local HTML for clickable flows.
3. Capture approved designs + tokens (`DESIGN.md`) for the eventual build → the **G-DESIGN** sign-off.

**Outputs:** `docs/4c-shade/design/` (UI/UX map, wireframe notes, exported tokens) and `prototypes/` (local HTML). This is the **product console**, not the HardscapeOS ERP — keep client-confidential specifics out.

---

## TRACK B (parallel) — Huly fork cleanup

**Baseline preserved:** the pristine upstream fork is `origin/develop` (`293bc91`) — always diff cleanup against it. (A separate `upstream-mirror` branch was unnecessary and is push-restricted here; `develop` is the baseline.)

**Chosen approach: baseline + branding + runtime-hide — all reversible; NO build-time stripping this pass.**

1. **Identity / branding hygiene:** rewrite `README.md` (Huly → HH Shade / 4C Shade); update root `AGENTS.md` / `ARCHITECTURE_OVERVIEW.md` as needed; update `dev/branding.json` (title / name / logo → HH Shade). Remove the upstream "hosted Huly shutting down" notice + Huly marketing.
2. **Runtime app lean-down:** via `dev/branding.json` app preset and/or `models/workbench` `HiddenApplication`, surface only the Shade app set. **Keep all plugins compiled (reversible).**
   - **KEEP (Shade spine):** `tracker`, `document`, `controlled-documents`, `test-management`, `activity` (+ `task`, `products`, `questions`, `training`, `survey`).
   - **KEEP (framework):** `workbench`, `view`, `text-editor`, `attachment`, `contact`, `setting`, `notification`, `preference`, `tags`, `templates`, `card`, `drive`, `login`/`onboard`/`guest`/`client`.
   - **HIDE (other Huly products):** `recruit`, `hr`, `lead`, `board`, `inventory`, `love`, `calendar`, `achievement`, `rating`, `support`, `recorder`, `bitrix`.
   - **HIDE (integrations we replace via MCP):** `ai-assistant`, `ai-bot`, `openai`, `gmail`, `telegram`, `mail`, `huly-mail`, `billing`, `payment`, `analytics-collector`. (`chunter`/`chat`, `process` = borderline — hold.)
3. **Defer:** build-time stripping (removing from `models/all/src/index.ts` + `migration.ts`) until the app set is validated running.

**Verify:** after runtime-hide, the app launcher shows only the Shade set; nothing build-breaking; `git diff origin/develop` is only config/branding.

**Fork facts (from the audit — don't re-audit):** ~250 MB; ~64 logical apps (each = `x` / `x-assets` / `x-resources` triad → 192 dirs); 22 services; customization levers present (`models/all/src/index.ts`, `models/all/src/migration.ts`, `dev/branding.json`).

---

## Guardrails

- **Agent skills = quality over quantity** — the 26 ShadeOS crew ops are *source material, not a port list*. Curate; add deliberately.
- **Most-permissive components** for anything forked/embedded/shipped (MIT/Apache; EPL/MPL ok; **avoid AGPL**). Tools you only run are unconstrained.
- **Subscription-first** Claude (official CLI on the subscription); the **5 gates**; branch discipline (push only `claude/dibbits-workspace-consolidation-69sqj8`).

## Open questions (still pending — see `VISION-BRIEF.md` §12)

Counsel: license scope / HH path, IP assignment into 4C, channel exclusivity. Technical: "ready to migrate" = backbone-ready vs full-console-ready; hardware pick; the demo-project definition; client-access policy. Unspecced: crew-ops → skills build spec; GTM / pricing.
