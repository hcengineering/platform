# @hcengineering/praut-workflow

PRAUT client-side workflow package.

This package is the green-area home for PRAUT user-facing lead-to-project workflow UI. The initial scaffold intentionally exports only stable plugin identifiers and workflow stage types. Business behavior should be added here instead of modifying upstream Huly plugins whenever possible.

Allowed first responsibilities:

- PRAUT pipeline views
- opportunity detail views
- project handoff UI
- manager dashboard wiring
- AI proposal display that still requires human approval

Do not use this package to bypass approval, pricing, legal, or customer communication rules.
