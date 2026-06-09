# Huly Cards import report

Generated: 2026-06-09T11:39:07.442Z

Source of truth:
- PRAUT_PROSTREDI.md
- IMPORT_CHECKLIST.md
- copy_paste_import/09-cards-schema.md
- copy_paste_import/11-cards-setup-guide.md

Generated artifacts:
- 22 Card type YAML files
- 30 enum YAML files
- 24 association YAML files

Card types:
- Firma: 7 fields
- Kontakt: 7 fields
- Lead/Poptavka: 9 fields
- Obchodni prilezitost: 6 fields
- Nabidka: 8 fields
- Zakazka: 10 fields
- Faktura: 9 fields
- Projekt: 7 fields
- Zakaznicky pozadavek: 8 fields
- Milnik: 6 fields
- Predani: 7 fields
- Zapis ze schuzky: 7 fields
- Kampan: 8 fields
- Obsahova polozka: 7 fields
- Znalostni clanek: 6 fields
- Automatizace: 9 fields
- AI funkce: 7 fields
- Integrace: 8 fields
- Incident: 8 fields
- Change request: 8 fields
- Riziko: 7 fields
- KPI: 7 fields

Importer limitations / manual follow-up:
- Unified importer supports Card type properties, enums, references and associations.
- Required-field enforcement is not represented in this Unified import schema and must be checked in Huly Settings -> TYPES after import.
- Saved Card views are not represented in this Unified import schema and must be configured manually: Aktivni, Bez vlastnika, Ke schvaleni, Riziko, Obnovy do 60 dni, Moje.
- Workflow/status values are imported as enum-backed attributes where the source schema exposes stav/faze/stav vztahu/health/trend.
- Person/date/url/email/phone fields are represented as strings because this importer schema accepts only TypeString, TypeNumber, TypeBoolean, enumOf and refTo.

Validation checklist after actual Huly import:
- 8 document teamspaces exist.
- 80 documents are present.
- 22 Card types exist under Settings -> TYPES, not as normal Card instances.
- Nabidka has schvalovatel and cannot be sent without human approval.
- Predani cannot be completed without potvrzeni prevzeti.
- AI funkce uses povoleno se schvalenim or zakazano for risky decisions.
- Control scenarios in copy_paste_import/10-control-scenarios.md pass end to end.
