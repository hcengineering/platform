# 4C Shade — v1 Vision Brief

*by 4C Digital · consolidation draft (review-and-build)*

---

## 1 · One-liner

**4C Shade is an owned, self-hosted, QMS-gated, agent-native software-delivery platform for verticals.** Autonomous agents build the software; every deliverable carries an immutable, auditable **conversation → requirement → spec → code → test → deploy** trail with human sign-off gates as first-class objects. It runs on flat-rate economics (subscription CLI agents + a local OSS coordinator), and each customer gets a branded instance (`<Org> Shade`). Built by **4C Digital**, taken to market through **FutureBuild**, first proven on the **HardscapeOS** ERP (HH Shade).

## 2 · Why now

- **Origin:** the Dibbits ERP engagement produced the "ShadeOS" command-center (agent crew ops, gates, a conversation-driven second brain). 4C Shade productizes that into an owned delivery OS.
- **Market timing:** generation is solved; **verification / "review debt" is the industry's unsolved bottleneck** (studies show AI ships ~2× the security bugs it fixes). Regulation is arriving — **EU AI Act high-risk enforcement (Aug 2, 2026)** and **ISO 42001** mandate immutable audit logs + "blocking approval gates." 4C Shade's gated, traceable model is early to exactly where the market is being pushed.

## 3 · Positioning

**"Autonomous delivery you can prove and stand behind"** — not "delivery, faster." Compete on **provable, accountable, domain-correct** delivery; **ride** the commoditizing agent architecture (Claude/Gemini), **own** the governance + vertical layer.

## 4 · The moat — a four-legged flywheel

| Leg | What it is | Why it's defensible |
|---|---|---|
| **Second brain** | Expert conversations (client/prospect calls) → cited scope/work-items/specs + domain grounding for agents | Owns the *upstream* of the loop; compounds with every conversation; extends traceability to origin |
| **QMS-gated delivery** | Controlled-doc specs + 5 gates-as-objects + requirement→…→deploy traceability | Uncontested white space; regulatory tailwind |
| **Owned · vertical · brandable** | Self-hosted per-org `<Org> Shade` instances; domain expertise encoded | Combination uncontested; "vertical *delivery* OS" is empty space |
| **Flat economics** | Subscription CLI agents (Claude Max) + local OSS coordinator (Prism); ~nothing metered | Structurally uncopyable by SaaS (ToS blocks 3rd-party subscription use) |

**The loop:** conversations → domain knowledge → domain-correct specs → gated autonomous build → traceable delivery → (outcomes + new conversations) → richer knowledge. *Each turn makes the agents more expert and the delivery more provable — on flat cost.*

## 5 · What's in the product

- **Backbone (EPL-Huly, self-hosted):** tracker/PM + docs knowledge base + **controlled-documents QMS** (spec lifecycle) + gates-as-objects + multi-workspace. System of record.
- **Console (custom):** agent-native cockpit — fleet view, artifact-first review, and the differentiating surface: **gates + requirement↔spec↔code↔test↔deploy traceability + audit "who-approved-what" ledger + domain-expert sign-off.**
- **Agents:** **Claude CLI** (subscription) for engineering; **Gemini** via MCP for design/planning/multimodal; **Prism** — a local OSS coordinator for always-on PM/scheduling/doc-upkeep.
- **Second brain:** the `intake` / `ingest` / knowledge-graph engine turning conversations into structured, cited work + agent grounding.
- **5 gates:** G-DESIGN, G-LOCK, G-PUSH, G-CLIENT, G-MONEY — human sign-offs as first-class, ISO-42001-aligned objects.
- **Integration (MCP):** GitHub, Infisical (runtime secrets), Stitch + Miro (design / G-DESIGN), Google Workspace/Drive (ingestion + drafts), Xero/Mercury (billing / G-MONEY).

## 6 · Architecture — two-tier model economy

- **Prism (local OSS, owned hardware):** always-on coordinator/router — cheap, flat, does run-of-the-mill PM/oversight and (eventually) fronts a single chat UI over the fleet.
- **Claude CLI (subscription):** on-demand heavy engineering, real CLI in a terminal (subscription-billed, not metered).
- **Gemini / product tools (MCP):** design, multimodal, and SaaS tools as needed.
- **Coordination bus = the backbone (Shade/Huly):** agents meet in Shade, not via fragile in-IDE plumbing.
- **Hardware:** a ≤$5k Linux box runs Prism's OSS model — validated via cloud API first, then self-hosted; **doubles as a managed-inference revenue line.**

## 7 · Entity, IP & commercial model

- **4C Digital** builds and **owns** 4C Shade (the IP).
- **FutureBuild** = commercial partner: **free perpetual license** for its client-facing work; the delivery channel.
- **Revenue:** **license-as-a-service** (customize + implement + maintain) on downstream `<Org> Shade` deployments + **managed inference**. Platform free to the partner; money in services.
- **Permissive-inputs discipline** (EPL-Huly + Apache/MIT models) is what lets 4C own, license, and resell cleanly.
- **White-label native:** every deployment is `<Org> Shade` — the customer's name is on it.

*(Detail in `LICENSING-AND-ENTITY.md`.)*

## 8 · Identity stack

**4C Digital** (owner) · **Shade** (platform) · **4C Shade** (product / reference build) · **`<Org> Shade`** (FB Shade, HH Shade, Dibbits Shade…) · **Prism** (coordinator agent) · **ShadeOS** (doctrine) · **4CDAI** (optional AI-division banner).

## 9 · Rollout

1. **Demo project** — prove the flywheel on a small throwaway (de-risk the console).
2. **HH Shade (alpha)** — run the live **Dibbits/HardscapeOS build** on it; the flagship reference instance.
3. **FB Shade** — FutureBuild's branded instance; migrate FutureBuild's projects.
4. **Dealer / other-vertical instances** — the commercial product.

- **Interim:** keep the current setup (Obsidian + lean-terminal + Plane) until HH Shade is ready; single clean cutover.

## 10 · v1 scope vs roadmap

- **v1 (build first):** self-hosted Shade backbone (PM/KB/QMS-specs/gates) + MCP integration + a lean cockpit (Claude CLI + MCP, Zed-hosted) + second-brain intake + the demo project → then the Dibbits migration. **Prism v1 = light** (scheduled routines + doc-upkeep, possibly on a cloud OSS API).
- **Roadmap (not v1):** the forked **custom console** (embedded terminal/browser); **Prism** as full fleet-conduit / single-chat-UI; local self-hosted inference on the $5k box; multi-instance productization + brandable provisioning; the managed-inference offering; commercial GTM to dealers/verticals.

> **Build guardrail — agent skills = quality over quantity.** Do NOT overbloat the Claude-facing agent tooling. The 26 crew ops are *source material, not a port list* — curate a lean set of high-value skills and add capabilities deliberately/incrementally as each earns its place.

## 11 · Key decisions locked

- Backbone = **EPL-Huly self-hosted** (validated as the most-permissive *capable* option).
- Cockpit (interim) = **Claude CLI + MCP, hosted in Zed**; permissive components for anything shipped.
- **Console + backbone both** in scope (console is the product's face); demo-first, single cutover.
- **Most-permissive licensing** driver: permissive inputs, 4C-owned controlled output.
- Model path: **gpt-oss-120b or Qwen3-30B-A3B (Apache-2.0)**, test-via-API → self-host; ≤$5k Linux.
- Old `dibbits_workspace` = **harvest-then-archive** (productized into Shade).

*(Full decision log in `DECISION-LOG.md`.)*

## 12 · Open questions to resolve

- **For counsel:** free-perpetual-license scope (does it cover the HH JV?); HH Shade's license path; **IP assignment** into 4C (incl. Dibbits-engagement work); **channel exclusivity** (FutureBuild-only downstream, or 4C direct / other channels too).
- **Product/technical:** "ready to migrate" = backbone-ready vs full-console-ready; hardware pick (DGX Spark + gpt-oss-120b vs RTX 5090 + Qwen3); the **demo project** definition; internal-only vs eventual client access to instances.
- **Not yet specced:** crew-ops → skills (concrete build requirements for what Shade must implement); GTM / pricing math.
