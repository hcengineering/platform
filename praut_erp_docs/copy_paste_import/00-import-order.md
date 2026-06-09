# Copy-paste import do Huly

Tento adresar je fallback pro rucni zalozeni dokumentace v Huly. Primarni podklad pro strukturovany import je `../huly_unified_import/`; kolega muze pouzit Huly Import Tool, vlastni importer nebo rucni copy-paste podle dostupnosti.

## Poradi importu
1. V Huly otevri cast pro prostory nebo dokumenty.
2. Zaloz 8 prostoru podle seznamu nize.
3. Otevri prislusny soubor v tomto adresari.
4. Pro kazdy blok `HULY DOCUMENT TITLE` zaloz v danem prostoru novy dokument.
5. Do tela dokumentu vloz obsah mezi radkem `COPY START` a `COPY END`.
6. Po importu dokumentu zaloz Cards podle `11-cards-setup-guide.md`.
7. Schema a vazby kontroluj podle `09-cards-schema.md`.
8. Automation pravidla zaloz podle `12-automation-rules.md`.
9. Nakonec projdi scenare v `10-control-scenarios.md`.

## Prostory
- [ ] V Huly vytvorit prostor `01_system` - Zaklad systemu; potom kopirovat dokumenty ze souboru `01_system.md`.
- [ ] V Huly vytvorit prostor `02_sales_crm` - Obchod a CRM; potom kopirovat dokumenty ze souboru `02_sales_crm.md`.
- [ ] V Huly vytvorit prostor `03_projects_tasks` - Zakazky, projekty a ukoly; potom kopirovat dokumenty ze souboru `03_projects_tasks.md`.
- [ ] V Huly vytvorit prostor `04_knowledge_docs` - Dokumenty a znalostni baze; potom kopirovat dokumenty ze souboru `04_knowledge_docs.md`.
- [ ] V Huly vytvorit prostor `05_communication` - Komunikace a spoluprace; potom kopirovat dokumenty ze souboru `05_communication.md`.
- [ ] V Huly vytvorit prostor `06_marketing_support` - Marketing a zakaznicka pece; potom kopirovat dokumenty ze souboru `06_marketing_support.md`.
- [ ] V Huly vytvorit prostor `07_automation_ai_integrations` - Automatizace, AI a integrace; potom kopirovat dokumenty ze souboru `07_automation_ai_integrations.md`.
- [ ] V Huly vytvorit prostor `08_management_reporting` - Rizeni firmy a reporting; potom kopirovat dokumenty ze souboru `08_management_reporting.md`.

## Dalsi soubory
- `09-cards-schema.md` - typy Cards, pole, stavy a vazby.
- `11-cards-setup-guide.md` - prakticky navod pro zalozeni Cards, poli, stavu a pohledu.
- `12-automation-rules.md` - sedm konkretnich alert-only automation pravidel.
- `10-control-scenarios.md` - kontrolni scenare po importu.
- `../IMPORT_CHECKLIST.md` - podrobny checklist pro schvaleni celeho workspace.
