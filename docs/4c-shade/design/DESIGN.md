# 4C Shade — Console Design System (`DESIGN.md`)

*Track A / G-DESIGN deliverable. This is the proposed token set + component spec for the **product console** (not the HardscapeOS ERP — that is "Hardscape Dark", a separate system). Build agents consume this file; the local HTML prototypes in `/prototypes` are its first realization.*

**Status:** proposal for G-DESIGN sign-off. Nothing here is locked until a human approves the gate.

---

## 1 · Design thesis

The product is named **Shade** and its positioning is *"autonomous delivery you can prove and stand behind."* The interface is therefore an **instrument, not a hype surface**: calm, dense, evidence-first, and dark-committed. Two subject-native ideas drive the visual language:

- **Refraction / Prism.** The coordinator agent is *Prism* — it splits one stream of work across a fleet. A single **spectral gradient** (violet → cyan → teal) is the product's one bold motif, reserved for exactly two places: the Prism coordinator and the requirement→…→deploy **traceability spine**. Everywhere else is quiet.
- **Chain-of-custody.** Every traceable object (requirement, spec, commit, test run, gate approval) carries an **ID rendered in monospace**. Monospace is not just for code here — it is the typographic signal of *"this thing has provenance"*. That is the console's typographic character.

### Scoping rule (load-bearing — repeated from the Track A brief)

> Spend fidelity on the **differentiating surfaces** (fleet/mission-control, gate + traceability cockpit, second-brain intake). The **backbone screens** (tracker, docs, controlled-doc QMS) are **Huly's existing UI + a Shade overlay** — do *not* redesign them, and do not try to out-polish generic agent-manager UIs (Cursor / GitHub / Antigravity). The tokens below define the *overlay* (top bar, rail, accent, status chips, gate ribbon) that makes a backbone screen read as Shade.

---

## 2 · Color tokens

Semantic tokens are the contract — components reference these, never raw hex. **Dark is primary** (the name *Shade* commits to it). A full light ramp is specified so build agents can ship a light mode; the prototypes render dark only, by deliberate choice (see §9, open question OQ-1).

### 2.1 Neutrals — cool blue-slate (chosen, not defaulted)

The neutral carries a slight blue-cyan hue bias toward the accent, so it reads as selected rather than a generic grey.

| Token | Dark (primary) | Light | Role |
|---|---|---|---|
| `--bg` | `#0A0D13` | `#F4F7FA` | App canvas (near-black blue-slate) |
| `--surface-1` | `#0F131B` | `#FFFFFF` | Left rail, base panels |
| `--surface-2` | `#151A24` | `#FFFFFF` | Cards, list rows |
| `--surface-3` | `#1C2230` | `#EDF1F6` | Inputs, hover, raised |
| `--surface-4` | `#232B3B` | `#E4EAF2` | Popovers, active row, drawer |
| `--border` | `#242C3A` | `#E2E7EF` | Hairline dividers |
| `--border-2` | `#313B4D` | `#CBD4E1` | Stronger borders, focus outer |
| `--overlay` | `rgba(5,7,11,.62)` | `rgba(30,40,55,.32)` | Scrim behind modals/drawers |

### 2.2 Ink (text)

| Token | Dark | Light | Role |
|---|---|---|---|
| `--ink-1` | `#EAEEF6` | `#141922` | Primary text, headings |
| `--ink-2` | `#AEB8CC` | `#47536A` | Secondary text, values |
| `--ink-3` | `#727E93` | `#6C7891` | Muted, captions, labels |
| `--ink-4` | `#4B5567` | `#98A2B4` | Faint, disabled, placeholder |

### 2.3 Brand accent — "Shade signal" (cyan-teal)

One accent, used sparingly: primary buttons, focus rings, the active/in-review gate, key links, selection.

| Token | Dark | Light |
|---|---|---|
| `--accent` | `#37CFBD` | `#12A594` |
| `--accent-hover` | `#4ADED0` | `#159A8B` |
| `--accent-press` | `#28B4A3` | `#0E8577` |
| `--accent-fg` | `#04120F` | `#FFFFFF` |
| `--accent-weak` | `rgba(55,207,189,.14)` | `rgba(18,165,148,.12)` |
| `--accent-line` | `rgba(55,207,189,.38)` | `rgba(18,165,148,.34)` |

### 2.4 Spectral signature (the one bold motif)

Reserved for the **Prism coordinator badge** and the **traceability spine rail** only. Never a full-page hero gradient (that is the AI cliché we avoid).

```
--spectral: linear-gradient(90deg, #8B7CF0 0%, #4EC5E0 52%, #37CFBD 100%);
--spectral-soft: linear-gradient(90deg, rgba(139,124,240,.16), rgba(78,197,224,.14), rgba(55,207,189,.16));
```

### 2.5 Agent identities

Each agent chip **always** shows a monogram + name, so color is secondary encoding (colorblind-safe by construction).

| Token | Dark | Weak tint | Agent |
|---|---|---|---|
| `--prism` | `#8B7CF0` (iris) | `rgba(139,124,240,.14)` | **Prism** — local OSS coordinator |
| `--claude` | `#E0785B` (clay) | `rgba(224,120,91,.14)` | **Claude** — engineering (subscription CLI) |
| `--gemini` | `#5B9DF9` (azure) | `rgba(91,157,249,.14)` | **Gemini** — design / multimodal (MCP) |
| `--human` | `#AEB8CC` (steel) | `rgba(174,184,204,.12)` | **Human** — expert / reviewer / approver |

Light-mode agent hues: prism `#6D57E0`, claude `#C15A3B`, gemini `#2E6FD6`, human `#5A6478`.

### 2.6 Status ramp (reserved — never reused as an agent/series color)

Always paired with an icon **and** a text label; never color-alone.

| Token | Dark | Weak | Meaning |
|---|---|---|---|
| `--ok` | `#46C98A` | `rgba(70,201,138,.14)` | Passed · approved · effective · green tests |
| `--warn` | `#E7B54B` | `rgba(231,181,75,.14)` | Awaiting sign-off · pending · needs human |
| `--risk` | `#E8894A` | `rgba(232,137,74,.14)` | At-risk · stale · partial |
| `--crit` | `#E86A6A` | `rgba(232,106,106,.14)` | Failed · rejected · blocked |
| `--info` | `#5B9DF9` | `rgba(91,157,249,.14)` | Running · neutral in-progress |

### 2.7 Gate-state mapping

| Gate state | Token | Chip |
|---|---|---|
| Approved / passed | `--ok` | ● Passed |
| In review (current focus) | `--accent` | ◆ In review |
| Awaiting human sign-off | `--warn` | ◐ Awaiting |
| Rejected / changes requested | `--crit` | ✕ Rejected |
| Locked / not started | `--ink-3` | ○ Locked |

---

## 3 · Typography

CSP / offline `file://` constraint: prototypes use the **native system stack** (no webfont fetch, no multi-MB data-URI embeds). Character comes from the scale, weights, spacing, and the monospace-for-identity rule — not from a novelty face. When the real console builds, a licensed grotesque (e.g. a variable sans) may be embedded via `@font-face`; the token names stay.

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI Variable Display",
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code",
             "Roboto Mono", Menlo, Consolas, monospace;
```

### Type scale

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `--fs-display` | 26 / 32 | 600 | -0.01em | Screen title (rare) |
| `--fs-h1` | 20 / 26 | 600 | -0.005em | Panel / section title |
| `--fs-h2` | 16 / 22 | 600 | 0 | Card title, gate name |
| `--fs-h3` | 14 / 20 | 600 | 0 | Sub-head, list group |
| `--fs-body` | 13.5 / 20 | 400 | 0 | Default UI text |
| `--fs-sm` | 12.5 / 18 | 400 | 0 | Secondary / dense |
| `--fs-label` | 11 / 14 | 600 | 0.07em, UPPERCASE | Eyebrows, column heads, chip labels |
| `--fs-mono` | 12.5 / 18 | 450 | 0 | **IDs, hashes, timestamps, code, evidence** |
| `--fs-mono-sm` | 11.5 / 16 | 450 | 0 | Dense mono (ledger, diff gutter) |

**Rules.** Headings get `text-wrap: balance`. Any column of digits gets `font-variant-numeric: tabular-nums`. Uppercase labels always carry ≥0.07em tracking. Every object ID (`REQ-014`, `G-DESIGN`, `a1b9f3c`, ISO timestamps) is `--font-mono`.

---

## 4 · Spacing, radius, elevation

```css
/* 4px base spacing scale */
--sp-1:2px; --sp-2:4px; --sp-3:6px; --sp-4:8px; --sp-5:12px;
--sp-6:16px; --sp-7:20px; --sp-8:24px; --sp-9:32px; --sp-10:40px; --sp-11:48px;

/* radii */
--r-1:6px;   /* chips, inputs, buttons */
--r-2:10px;  /* cards */
--r-3:14px;  /* panels, drawers */
--r-pill:999px;

/* elevation — instrument-grade: prefer surface-step + hairline over heavy shadow */
--shadow-1: 0 1px 2px rgba(0,0,0,.40);
--shadow-2: 0 8px 28px -10px rgba(0,0,0,.62);
--shadow-pop: 0 16px 48px -14px rgba(0,0,0,.72);

/* focus ring (accessibility — visible in both themes) */
--focus: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
```

Layout uses flex/grid + `gap`, never per-element margins for sibling spacing. Wide content (diffs, tables, the traceability spine) lives in an `overflow-x:auto` container so the page body never scrolls sideways.

---

## 5 · App shell (chrome common to every screen)

```
┌──────────────────────────────────────────────────────────────┐
│  Top context bar  ·  workspace switcher · breadcrumb · gate    │  48px
│                      ribbon · global search · actor menu       │
├───────┬──────────────────────────────────────────┬────────────┤
│ Left  │              Main work area               │  Inspector │
│ rail  │  (fleet board / gate cockpit / intake)    │  drawer    │
│ 60/   │                                           │  (context, │
│ 232px │                                           │  artifact) │
└───────┴──────────────────────────────────────────┴────────────┘
```

- **Left rail** — collapsible (icon-only 60px ↔ labelled 232px). Groups: **Console** (Fleet, Gates, Second Brain, Activity) above the hairline; **Backbone** (Tracker, Documents, Specs/QMS, Test Mgmt) below — the backbone group is the Huly apps under a Shade overlay.
- **Top context bar** — workspace switcher (`<Org> Shade`), breadcrumb, a compact **gate ribbon** (5 gate dots showing global state), search, actor/agent menu. `--surface-1`, hairline bottom border.
- **Inspector drawer** — right, `--surface-1`, opens on selection to show the artifact / provenance / audit context. This is where *artifact-first review* happens.

---

## 6 · Component specs (the differentiating pieces)

### 6.1 Agent-thread card (`.agent-card`)
The unit of the fleet board. `--surface-2`, `--r-2`, 1px `--border`; left **2px identity stripe** in the agent color.
- **Header:** agent monogram avatar (agent-color weak bg, agent-color ring) · agent name · a monospace **thread id** (`TH-2043`) · a status chip.
- **Body:** the work-item title + linked `REQ`/issue id (mono) · a one-line current-activity string.
- **Artifact row (artifact-first):** up to 3 artifact chips — `◫ Plan`, `⌥ Diff +142/−31`, `✓ Tests 18/18` — each opens that artifact in the inspector. Counts in tabular mono.
- **Footer:** elapsed time · model/tier tag · a "needs review" flag when awaiting a gate.
- **States:** hover raises to `--surface-3`; selected gets `--accent-line` ring + `--accent-weak` wash.

### 6.2 Fleet column (`.fleet-col`)
Kanban-style column grouped by **thread state**: Planning · Working · Awaiting review · Blocked · Done. Column header = uppercase `--fs-label` + a count. A thread awaiting a human gate shows a `--warn` left edge on its column header.

### 6.3 Gate object (`.gate`)
A gate is a first-class object, not a checkbox. Card or ribbon-node form.
- **Identity:** gate id in mono (`G-DESIGN`) + human name ("Design approved before build").
- **State chip** (§2.7) + progress ("3 of 4 items signed").
- **Required approvers:** stacked actor avatars incl. a **domain-expert** slot (`--human`).
- **Wired to review:** clicking a gate opens the items awaiting it + their traceability + the sign-off action. Gates never auto-pass; a gate stores *who / when / what-hash*.

### 6.4 Traceability node + edge (`.trace-node`, `.trace-edge`)
The requirement ↔ spec ↔ code ↔ test ↔ deploy spine.
- **Node:** pill with a stage glyph, a stage label (`--fs-label`), and the object id in mono. Node border encodes coverage: solid `--accent-line` = linked & fresh; dashed `--risk` = stale/partial; `--crit` = missing/broken link.
- **Edge:** 2px connector painted with `--spectral` when the whole chain is intact (the one place the spectral motif earns its keep); greyed `--border-2` where the chain is broken. Hovering a node highlights its in/out edges.
- **Node detail:** clicking expands the node inline — source excerpt, author (agent or human), timestamp, content hash — the evidence.

### 6.5 Artifact-review panel (`.artifact-panel`) — inspector drawer content
Tabbed: **Plan · Diff · Tests · Provenance**.
- **Plan:** rendered markdown of the agent's plan; approve/request-changes footer.
- **Diff:** unified diff, mono, `--ok`/`--crit` gutter tints for +/−, file tree on the left.
- **Tests:** pass/fail summary tiles + a run log; a small pass-rate bar.
- **Provenance:** the mini traceability chain for this artifact + the audit trail of who touched it.
- **Footer action bar:** `Approve` (accent), `Request changes` (ghost, `--crit` text), `Reassign`. Every action writes to the audit ledger.

### 6.6 Audit-ledger row (`.ledger-row`)
Immutable "who-approved-what". Monospace-forward: `timestamp · actor · action · object-id · content-hash`. Rows are append-only, hash-chained (each row shows a truncated `prev←` hash). Expandable to reveal the full signed payload. Icon + label for the action type; `--ok`/`--crit`/`--warn` accent on the action verb only.

### 6.7 Provenance / citation card (`.cite-card`) — second brain
Links an extracted work-item back to its origin conversation span.
- **Extracted object:** type badge (Requirement / Work-item / Spec / Risk) + generated id (mono) + one-line statement.
- **Cited source:** a quoted span with speaker + timestamp + source (call / doc), and a **confidence** meter. A "view in conversation" jump scrolls the transcript to the highlighted span.
- **Grounding:** which domain-knowledge nodes this drew on (chips).

### 6.8 Shared atoms
- **Chip / pill** — `--r-pill`, `--fs-label`, weak-tint bg + full-color text/glyph. Variants: status, agent, gate-state, artifact.
- **Button** — primary (accent bg, `--accent-fg`), ghost (transparent, `--border` ring), danger-ghost (`--crit` text). 32px default height, `--r-1`, `--fs-body` 600.
- **Stat tile** — big tabular number + `--fs-label` caption + optional inline sparkline; used in the fleet summary strip.
- **Meter / bar** — 6px track `--surface-3`, fill in status or accent; pass-rate, confidence, gate progress.

---

## 7 · Data-visualization rules (from the `dataviz` method)

- **One axis, ever.** No dual-scale charts.
- **Categorical = fixed agent order** (Prism, Claude, Gemini, Human) — never cycled; a colored mark always sits beside a text label.
- **Sequential** (e.g. coverage heat): single hue, light→dark off the accent ramp.
- **Status colors are reserved** (§2.6) and never used as a data series.
- Charts stay small and inline (fleet throughput sparkline, pass-rate bar, gate-progress meter). Grid/axes recessive; endpoints emphasized; text wears ink tokens, not the series color.

---

## 8 · Accessibility & motion

- Contrast: body text ≥ 4.5:1 on its surface; large text/labels ≥ 3:1. Accent text (`--accent-fg` on `--accent`) verified for buttons.
- Never color-alone: status, agent, and gate identity always carry an icon/monogram + label.
- Visible keyboard focus (`--focus`) on every interactive element.
- Respect `prefers-reduced-motion`: no non-essential transitions; the spectral motif is static (no animated gradient) under reduced-motion.
- Motion budget is tiny by design — hover elevation, drawer slide, expand/collapse. No ambient animation (this is an instrument).

---

## 9 · Open design questions for G-DESIGN

- **OQ-1 — Light mode in v1?** The prototypes commit to dark (the *Shade* thesis). Tokens support light. Decide: dark-only v1, or ship both? (Recommendation: dark-primary, light as fast-follow.)
- **OQ-2 — Rail scope.** How many backbone apps surface in the rail by default vs. under a "more" affordance? (Ties to the Track-B lean-down set.)
- **OQ-3 — Single-chat-over-fleet (Prism front).** Roadmap says Prism eventually fronts one chat UI over the whole fleet. Do we design that conversational surface now, or keep the board-first model for v1?
- **OQ-4 — Gate rigidity.** Are all 5 gates mandatory per work-item, or configurable per workspace/project? Affects whether the gate ribbon is fixed or authored.
- **OQ-5 — Embedded font.** Ship a licensed variable grotesque via `@font-face` for the real build, or stay on the native stack? (Prototypes stay native for offline fidelity.)

---

*Token source of truth for the prototypes: this file. If a prototype and this file disagree, this file wins and the prototype is the bug.*
