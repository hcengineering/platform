# HH Shade — Instance Context

Instance-specific memory for **HH Shade**, the **Hardscape House** deployment of **4C Shade**. For the product itself, see [`../4c-shade/`](../4c-shade/).

---

## What HH Shade is

- **The alpha deployment of 4C Shade** — the flagship reference instance that proves the platform.
- **Owner/operator:** the **Hardscape House** joint venture (FutureBuild + Dibbits). License path is an open item (via FutureBuild's perpetual license vs its own from 4C Digital — see `../4c-shade/LICENSING-AND-ENTITY.md`).
- **Current repo state:** an upstream Huly platform fork (EPL-2.0), being repurposed into the Shade backbone. Fork-source archival to an `upstream-mirror` branch is planned but **not yet done**.

## What it delivers

HH Shade is the command center for building **HardscapeOS** — a greenfield ERP for hardscape/landscape supply, first client **Dibbits Landscape Supply** (Trenton + Kingston, Ontario).

## Sibling repositories (the code being delivered)

- **`dibbits`** — React partner portal + project manual + Phase-1 planning/spec library. Railway auto-deploys `master` → `dibbits.gablelbm.com`.
- **`hardscapeos_dibbits`** — the greenfield HardscapeOS ERP (Go modular monolith backend + Lit frontend). CI + staging deploy to a DigitalOcean droplet (`dibbits-staging.gablelbm.com`).
- *(historical)* **`dibbits_workspace`** — the git+Obsidian "ShadeOS" command-center being **harvested-then-archived**; its machinery (crew ops, gates, second-brain) productizes into 4C Shade.

## Migration posture

- **Interim:** work continues on the current setup (Obsidian + lean-terminal + self-hosted Plane at `pm.futurebuild.ai`) until HH Shade is ready.
- **Cutover:** a single clean migration of the live Dibbits build onto HH Shade (no throwaway interim). Open item: define "ready" as **backbone-ready** (sooner) vs **full-console-ready** (later).
- The existing Plane tracker (`DIB` project: 142 issues / 26 cycles / 12 modules) and the `dibbits_workspace` second-brain are the migration source material.

## v1 scope for this instance

Shade backbone (PM/KB + controlled-doc QMS specs + gates-as-objects, multi-workspace) + MCP integration + a lean Claude-CLI/Zed cockpit + the second-brain intake engine → then the Dibbits migration. **Prism** (the native OSS coordinator) starts light: scheduled routines + doc-upkeep. Custom console + local self-hosted inference are roadmap, not v1.

## Key facts

- **Currency/locale:** CAD, HST 13%, Ontario Construction Act / Bill 60 compliance.
- **Design system (ERP):** "Hardscape Dark" (Stone Amber `#E8A74E`, Deep Earth `#0C0D12`).
- **Money/quantity conventions:** integer cents in app code, `DECIMAL(19,4)` in DB; every quantity paired with a UOM.
