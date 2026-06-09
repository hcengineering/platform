# Huly import runbook

Tento soubor popisuje prakticky spustitelny import pro aktualni balicek.

## Zdroj pravdy

- `PRAUT_PROSTREDI.md`
- `IMPORT_CHECKLIST.md`
- `copy_paste_import/09-cards-schema.md`
- `copy_paste_import/11-cards-setup-guide.md`

## Importovatelny balicek

Pouzij adresar:

```bash
huly_unified_import/
```

Obsahuje:

- 8 document teamspace YAML konfiguraci
- 80 dokumentu
- 22 Cards typu jako `card:class:MasterTag`
- enumy pro stavova/select pole
- asociace pro hlavni vazby mezi kartami

## Spusteni pres Huly import tool

Import tool v lokalnim checkoutu `HulyPrautplatform` ocekava:

- `FRONT_URL` - napr. `https://huly.app` nebo URL selfhost instance
- `--workspace` - workspace slug z URL `/workbench/<workspace>`
- `--user` - prihlasovaci email
- `--password` - heslo

Priklad:

```bash
cd /Users/bobbysixkiller/HulyPrautplatform/dev/import-tool
FRONT_URL="https://huly.app" npm run run -- import /Users/bobbysixkiller/Downloads/praut_erp_docs/huly_unified_import --user "user@example.com" --password "..." --workspace "workspace-slug"
```

## Manualni dotazeni po importu

Unified importer umi zalozit typy, pole, enumy, reference a asociace. Nasledujici veci je nutne zkontrolovat nebo dotahnout v Huly UI:

- Cards musi byt v `Settings -> TYPES`, ne jako bezne instance.
- Povinna pole nastav podle `copy_paste_import/09-cards-schema.md`.
- Pohledy nastav podle `copy_paste_import/11-cards-setup-guide.md`: `Aktivni`, `Bez vlastnika`, `Ke schvaleni`, `Riziko`, `Obnovy do 60 dni`, `Moje`.
- `Nabidka` nesmi jit odeslat bez `schvalovatel`.
- `Predani` nesmi jit dokoncit bez `potvrzeni prevzeti`.
- Rizikove `AI funkce` nastav na `povoleno se schvalenim` nebo `zakazano`.
- Automation pravidla z `copy_paste_import/12-automation-rules.md` nastav jako alert-only.

## Overeni

Po importu projdi:

- `copy_paste_import/10-control-scenarios.md`
- acceptance kriteria v `PRAUT_PROSTREDI.md`
- report `huly_cards_import_report.md`
