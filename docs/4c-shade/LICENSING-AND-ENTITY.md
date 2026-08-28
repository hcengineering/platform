# 4C Shade — Licensing Framework & Entity / IP Structure

*Companion to `VISION-BRIEF.md`. Two parts: (A) the permissive-licensing framework that governs component selection, and (B) the entity/IP/commercial structure.*

---

## A · Permissive-licensing framework

**Core rule:** licensing obligations attach to what you **distribute / fork / host-for-others** — NOT to what you merely **use** to build your own, separately-licensed product.

Three buckets:

1. **Dependencies you fork / embed / ship / host-for-dealers** → want most-permissive (MIT/Apache/BSD). Copyleft bites here. **The Shade backbone + custom MCP live here.**
2. **Your own product** (4C Shade, the ShadeOS kit) → your choice; owner-controlled. Goal = **permissive inputs, controlled output.**
3. **Tools you only run** (editor, Claude CLI, terminal, orchestrator) → license ~irrelevant; using GPL/AGPL tools to build never touches your product.

**Ladder (most → least permissive for a closed commercial product):** MIT/Apache/BSD → MPL/EPL/LGPL (weak, file-level) → GPL (on distribution) → **AGPL (on network use — disqualifying for anything forked/hosted-for-others).**

### Verdict: keep EPL-Huly

A more-permissive *and* genuinely-capable backbone does not exist. Every all-in-one alternative is *less* permissive for the fork-and-host model (Plane/Taiga/AppFlowy/Twenty/Docmost/Cal.com = **AGPL**; Outline/NocoDB/Planka/AFFiNE-server = **source-available with host-for-others bars**). The genuinely permissive options (Wekan/Kanboard/Baserow, all MIT) aren't backbones. **Huly's controlled-docs/QMS is ~unique.** EPL fits perfectly: fork + host for dealers = zero disclosure; ship a modified build = release only modified EPL files; proprietary customizations/MCP/config stay yours.

### Component license map (action items)

| Component | License | Note for the fork-and-host build |
|---|---|---|
| Huly platform / `@hcengineering/api-client` | **EPL-2.0** | Host for others = no disclosure. Importing api-client does NOT make your MCP EPL. |
| Custom MCP base | prefer **MIT** community servers (`dearlordylord/huly-mcp`, `oculairmedia/huly-mcp-server`) | Avoid the EPL one (`varaprasadreddy9676`) → copyleft-free MCP layer. |
| Infisical | **MIT core** (EE features proprietary) | Self-host core safe; EE = dynamic secrets, approval workflows, SSO-beyond-Google/GitHub. |
| Coordinator model | **gpt-oss (Apache-2.0), Qwen3 (Apache-2.0), GLM-4.5/4.6 (MIT)** | Unconditional — resell inference cleanly. Avoid Gemma/Llama (use-restrictions). |
| Console editor component (if embedded/shipped) | use **Neovim/Lapce (Apache), Ghostty (MIT), tmux (ISC), Terminus (MIT)** | Avoid embedding GPL Zed / AGPL Zed-collab into a *shipped* console. Zed as a *tool you use* is fine. |
| Orchestrators (if embedded/shipped) | **opencode (MIT), Vibe Kanban (Apache)** OK | Claude Squad (AGPL) + Crush (FSL) = use-only; Conductor = proprietary, use-only. |
| SaaS (Stitch, Miro, Workspace, Xero, Mercury, Antigravity) | ToS, not code license | Sharpest: **Xero prohibits training AI/ML on its API data** → design hours→invoice as read-and-act only. |

---

## B · Entity / IP / commercial structure

**Pattern:** IP-lab + commercial-partner, services-led ("commercial open-source / open-core + services").

| Entity | Role | License / revenue |
|---|---|---|
| **4C Digital** (AI/systems R&D lab + dev co) | **Builds + OWNS 4C Shade (the IP)** | Grants FutureBuild a **free perpetual license**; monetizes **license-as-a-service** (customize + implement + maintain) downstream + optional managed-inference tier |
| **FutureBuild** | Commercial / client-facing partner (delivery channel) | Free perpetual Shade license for its own client work |
| **Hardscape House** | Vertical JV (FutureBuild + Dibbits) | Runs **HH Shade** (alpha instance) — license path TBD (via FB's license vs its own from 4C) |
| **Dibbits / dealers / clients** | End customers | Licensed + serviced `<Org> Shade` instances |

- **Revenue model:** platform **free to the partner (FutureBuild)**; 4C earns from **services** (customization/implementation/maintenance) on end-client deployments + **managed inference**. Not platform-license fees to FB.
- **Reconciles with the framework:** permissive inputs (EPL-Huly + Apache/MIT models) are *why* 4C can own + freely license + resell with no upstream copyleft snag.
- **Branding:** the `Shade` line = "4C Shade by 4C Digital"; FutureBuild = commercial partner; each deployment = `<Org> Shade`.

### Open items (for Colton + counsel — flags, not decisions)

1. **Free-perpetual-license scope** — does "FutureBuild's client work" cover the **Hardscape House JV** (separate entity)? Define HH Shade's license path.
2. **License-as-a-service contract** terms (4C-charged vs FB-bundled).
3. **IP assignment** — everything built (incl. during the Dibbits engagement / HH JV) lands in 4C cleanly.
4. **Channel exclusivity** — Shade downstream **only via FutureBuild**, or can 4C also license direct / to other verticals & channels?
