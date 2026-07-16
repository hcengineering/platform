# 4C Shade — Decision Log

*Condensed record of decisions made during the 4C Shade discovery/vision sessions. Newest context wins; this is the reference companion to `VISION-BRIEF.md`.*

---

## Locked decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Backbone = self-hosted Huly (EPL-2.0)** | Licensing-validated as the most-permissive *genuinely-capable* PM+KB+QMS+multi-workspace platform; every all-in-one alternative is AGPL or source-available. Unique controlled-docs/QMS. |
| D2 | **Product = "4C Shade"** (by 4C Digital) | Keeps the `Shade` family (ShadeOS heritage, `<Org> Shade` instances); leaves "Prism" free as the coordinator agent. |
| D3 | **Naming = `<Org> Shade` convention** | White-label native — every deployment carries the customer's name (FB Shade, HH Shade, Dibbits Shade…). |
| D4 | **Cockpit (interim) = standard Claude CLI + MCP, hosted in Zed** | Minimum complexity; subscription-preserving; MCP is the integration bus. Orchestrators (Conductor/Claude Squad) deferred, no rework to adopt later. |
| D5 | **Console + backbone BOTH in scope** | Console (embedded terminal/browser, agent-manager) is the product's face; built demo-first, single cutover. |
| D6 | **"Most permissive possible" licensing driver** | Permissive inputs (EPL-Huly + Apache/MIT models), 4C-owned controlled output. AGPL disqualifying for anything forked/hosted-for-others. |
| D7 | **Local coordinator model = gpt-oss-120b or Qwen3-30B-A3B (Apache-2.0)** | Best tool-calling per VRAM-dollar; permissive; test-via-API (OpenRouter) → self-host on ≤$5k Linux box. |
| D8 | **`dibbits_workspace` = harvest-then-archive** | Its machinery (crew ops, gates, second-brain) productizes into 4C Shade; repo freezes read-only. |
| D9 | **Entity structure: 4C Digital owns; FutureBuild commercializes** | 4C builds/owns the IP; FutureBuild gets a free perpetual license + is the channel; revenue = license-as-a-service + managed inference. |
| D10 | **Rollout: demo → HH Shade alpha (Dibbits build) → FB Shade → dealers** | De-risk on a throwaway before migrating the live client build. |
| D11 | **Agent skills = quality over quantity** | The 26 crew ops are source material, not a port list. Curate; add incrementally. |
| D12 | **Sequencing: build the customized platform, keep current setup until ready, migrate once** | Avoids a throwaway interim + double migration. |

## The moat (four-legged flywheel)

1. **Second brain** — conversations → cited scope/work-items + domain grounding.
2. **QMS-gated, auditable delivery** — controlled-docs + gates-as-objects + full traceability (regulatory tailwind: EU AI Act Aug 2026, ISO 42001).
3. **Owned + vertical + brandable** — self-hosted `<Org> Shade` instances.
4. **Flat economics** — subscription CLI + local OSS Prism; ~nothing metered (SaaS structurally can't copy).

## The 5 gates

G-DESIGN (UI/UX approved before build) · G-LOCK (spec → Effective) · G-PUSH (push/deploy) · G-CLIENT (client-visible) · G-MONEY (hours/invoice/payments).

## Auth / billing rule (load-bearing)

- **Subscription:** the interactive `claude` CLI in a real terminal, or headless via `CLAUDE_CODE_OAUTH_TOKEN` (draws from subscription limits; watch the `-p` misbilling bug #43333). Rate-limit is the ceiling → subscription-first, API-burst.
- **Metered API:** explicit `ANTHROPIC_API_KEY` / `--bare`, or third-party API-key tools.
- **Gemini/OSS models:** own auth/harness; reached as peers or tools via MCP.

## Open questions

**For counsel:** free-perpetual-license scope (does it cover the HH JV?); HH Shade's license path; IP assignment into 4C (incl. Dibbits-engagement work); channel exclusivity (FutureBuild-only vs 4C direct/other channels).

**Product/technical:** "ready to migrate" = backbone-ready vs full-console-ready; hardware pick (DGX Spark + gpt-oss-120b vs RTX 5090 + Qwen3); demo-project definition; internal-only vs eventual client access.

**Not yet specced:** crew-ops → skills build spec; GTM / pricing math.
