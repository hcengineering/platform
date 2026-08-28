# CLAUDE.md — HH Shade (project memory)

Guidance for Claude Code sessions working in this repository.

> **▶ CURRENT WORK — start here:** [`docs/4c-shade/HANDOFF.md`](docs/4c-shade/HANDOFF.md). Two active tracks: (A, primary) map + prototype the **4C Shade console UI/UX** (design-first, via Stitch/Miro/local HTML); (B, parallel) **Huly fork cleanup** (baseline + branding + runtime-hide). Read the handoff before starting.

## What this repo is

This is **HH Shade** — the **Hardscape House** deployment of **4C Shade**, an owned, self-hosted, QMS-gated, agent-native software-delivery platform built by **4C Digital**. The repo currently holds an upstream **Huly platform fork** being repurposed into the Shade backbone (alpha).

- **Product docs:** [`docs/4c-shade/`](docs/4c-shade/) — start with [`VISION-BRIEF.md`](docs/4c-shade/VISION-BRIEF.md).
- **This instance's context:** [`docs/hh-shade/CONTEXT.md`](docs/hh-shade/CONTEXT.md).
- **Note:** the existing root `AGENTS.md` is upstream Huly's, not Shade's — this `CLAUDE.md` is the Shade project memory and takes precedence for Shade work.

## Identity stack

**4C Digital** (owner) · **Shade** (platform) · **4C Shade** (product) · **`<Org> Shade`** (this = **HH Shade**; also FB Shade, Dibbits Shade…) · **Prism** (native OSS coordinator agent) · **ShadeOS** (doctrine/heritage) · **4CDAI** (optional AI-division banner).

## Development

- **Branch:** develop on `claude/dibbits-workspace-consolidation-69sqj8`. Commit with clear messages; push with `git push -u origin <branch>`. Do **not** push to other branches without explicit permission.
- **Repo rename:** slated to become `hh-shade` (GitHub slugs can't contain spaces; display "HH Shade"). Done via GitHub Settings.

## Build guardrails (from the vision brief)

- **Agent skills = quality over quantity.** The 26 ShadeOS crew ops are *source material, not a port list*. Curate a lean, high-value skill set; add capabilities deliberately as each earns its place. Do **not** overbloat the Claude-facing agent tooling.
- **Most-permissive licensing.** Prefer MIT/Apache/BSD for anything forked/embedded/shipped/hosted-for-others; EPL/MPL acceptable (weak, file-level); **avoid AGPL** for shipped/hosted components. Tools you merely *run* are unconstrained. See [`docs/4c-shade/LICENSING-AND-ENTITY.md`](docs/4c-shade/LICENSING-AND-ENTITY.md).
- **Subscription-first agents.** Run the official `claude` CLI on the subscription (interactive in a terminal, or headless via `CLAUDE_CODE_OAUTH_TOKEN`); avoid `ANTHROPIC_API_KEY`/`--bare` metered paths except for deliberate bursts.
- **The 5 gates** (human sign-offs, first-class): G-DESIGN, G-LOCK, G-PUSH, G-CLIENT, G-MONEY.

## Scope discipline

The full plan spans a **product build** (4C Shade: backbone + console) and the **Dibbits consolidation** (running the Dibbits/HardscapeOS build on this HH Shade instance). Confirm which layer a task belongs to before large changes. Deferred (not current): fork-source archival, the custom MCP server, migration scripts, the custom console — unless a task explicitly calls for them.
