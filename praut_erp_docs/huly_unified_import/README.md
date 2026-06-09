# Huly Unified Import Workspace

This folder follows Huly's Unified Import Format for document teamspaces and documents.

Use it as structured input for whichever import path is available to the colleague:

- Huly Import Tool, if available.
- A custom importer maintained by the colleague.
- Manual setup using `../copy_paste_import/00-import-order.md`.

This folder does not cover PRAUT Cards type setup. Cards must be configured separately from `../copy_paste_import/09-cards-schema.md` and `../copy_paste_import/11-cards-setup-guide.md`: 22 types total, with `Faktura` in the first wave and 7 alert-only automation rules from `../copy_paste_import/12-automation-rules.md`.

Configure Cards in Huly `Settings -> TYPES`, not as normal Cards instances.
