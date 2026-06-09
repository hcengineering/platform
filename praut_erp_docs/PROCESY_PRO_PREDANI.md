# Procesy pro rucni pripravu Praut prostredi v Huly

Tento dokument je predavaci mapa pro kolegu, ktery bude v Huly rucne skladat procesy Praut prostredi. Nejde o automaticky installer. Cilem je vedet, jake procesy maji po zalozeni dokumentu a Cards existovat, z jakych karet se skladaji a podle kterych dokumentu se maji nastavit.

## Jak s tim pracovat

1. Nejdriv zaloz prostory a dokumenty podle `IMPORT_CHECKLIST.md`.
2. Potom zaloz typy Cards podle `copy_paste_import/11-cards-setup-guide.md`.
3. Procesy pripravuj postupne: obchod, zakazky, fakturace, podpora, incidenty, zmeny, reporting.
4. U kazdeho procesu nastav minimalne vlastnika, stavy, povinna pole, vazby a kontrolni pohledy.
5. Po nastaveni projdi kontrolni scenare v `copy_paste_import/10-control-scenarios.md`.

## 1. Obchodni proces

**Tok:** `Firma/Kontakt -> Lead/Poptavka -> Obchodni prilezitost -> Nabidka -> Zakazka -> Faktura`

**Cards:**
- Firma
- Kontakt
- Lead/Poptavka
- Obchodni prilezitost
- Nabidka
- Zakazka
- Faktura
- Zapis ze schuzky
- Predani

**Dokumenty:**
- `02_sales_crm/11-sprava-kontaktu-a-firem.md`
- `02_sales_crm/12-evidence-leadu-a-poptavek.md`
- `02_sales_crm/13-obchodni-pipeline.md`
- `02_sales_crm/14-kvalifikace-a-scoring-leadu.md`
- `02_sales_crm/15-obchodni-follow-up-proces.md`
- `02_sales_crm/16-priprava-nabidek.md`
- `02_sales_crm/17-schvalovani-cen-a-obchodnich-podminek.md`
- `02_sales_crm/20-prechod-z-obchodu-do-realizace.md`

**Dulezite kontroly:**
- Nabidka musi mit schvalovatele.
- Cena, sleva a obchodni podminky nesmi zustat jen v chatu.
- Vyhrana nabidka musi mit vazbu na Zakazku.
- Zakazka musi mit datum obnovy a typ spoluprace, pokud jde o retainer nebo opakovanou spolupraci.
- Faktura musi byt navazana na Zakazku, Firmu a Projekt.

## 2. Realizace zakazky a projektovy proces

**Tok:** `Zakazka -> Projekt -> Ukoly -> Milniky -> Predani -> Faktury -> Uzavreni zakazky`

**Cards a objekty:**
- Zakazka
- Projekt
- Milnik
- Predani
- Faktura
- Riziko
- Incident
- ukoly / action items

**Dokumenty:**
- `03_projects_tasks/21-zalozeni-nove-zakazky.md`
- `03_projects_tasks/22-projektove-rizeni-v-praut.md`
- `03_projects_tasks/23-prace-s-ukoly-podukoly-a-prirazenim.md`
- `03_projects_tasks/24-stavove-procesy-ukolu.md`
- `03_projects_tasks/25-milniky-projektu.md`
- `03_projects_tasks/28-casove-odhady-a-casove-reporty.md`
- `03_projects_tasks/29-predavani-prace-mezi-rolemi.md`
- `03_projects_tasks/30-kontrola-dokonceni-zakazky.md`

**Dulezite kontroly:**
- Kazda Zakazka ma PM, termin, datum obnovy, typ spoluprace, stav a vazbu na klienta.
- Projekt ma vlastnika, aktivni ukoly a alespon zakladni milniky.
- Predani prace musi byt potvrzene prijimajici roli.
- Fakturacni stav nesmi zustat jen v komentari nebo chatu.

## 3. Zakaznicka pece a helpdesk

**Tok:** `Zakaznicky pozadavek -> Triage -> Reseni -> Eskalace/Incident -> Znalostni clanek -> Uzavreni`

**Cards:**
- Zakaznicky pozadavek
- Incident
- Znalostni clanek
- Firma
- Kontakt
- Projekt

**Dokumenty:**
- `06_marketing_support/52-evidence-zakaznickych-pozadavku.md`
- `06_marketing_support/53-helpdesk-proces.md`
- `06_marketing_support/54-eskalace-zakaznickych-problemu.md`
- `06_marketing_support/55-znalostni-baze-pro-zakaznickou-podporu.md`
- `06_marketing_support/56-mereni-spokojenosti-zakazniku.md`

**Dulezite kontroly:**
- Pozadavek ma klienta, kontakt, prioritu, SLA, vlastnika a stav.
- Klientskou komunikaci a uzavreni potvrzuje clovek.
- Opakovany problem se prevadi do znalostniho clanku nebo incidentu.

## 4. Komunikace, schuzky a rozhodnuti

**Tok:** `Schuzka -> Zapis -> Rozhodnuti -> Akcni polozky -> Ukoly -> Kontrola`

**Cards a objekty:**
- Zapis ze schuzky
- Predani
- ukoly / action items
- souvisejici Firma, Zakazka nebo Projekt

**Dokumenty:**
- `05_communication/39-pravidla-interni-komunikace.md`
- `05_communication/40-chat-kanaly-vlakna-a-prime-zpravy.md`
- `05_communication/43-zapisy-ze-schuzek.md`
- `05_communication/44-pravidla-pro-asynchronni-spolupraci.md`
- `05_communication/45-eskalace-problemu-a-vyjimek.md`
- `01_system/09-auditni-stopa-a-evidence-rozhodnuti.md`

**Dulezite kontroly:**
- Dulezite rozhodnuti nesmi zustat pouze v chatu.
- Akcni polozka ma vlastnika, termin a stav.
- Zapis ze schuzky je navazany na klienta, projekt nebo zakazku.

## 5. Marketingovy proces

**Tok:** `Marketingovy plan -> Kampan -> Obsahova polozka -> Schvaleni -> Publikace -> Vyhodnoceni`

**Cards:**
- Kampan
- Obsahova polozka
- KPI
- Lead/Poptavka

**Dokumenty:**
- `06_marketing_support/46-marketingovy-plan-praut.md`
- `06_marketing_support/47-sprava-kampani.md`
- `06_marketing_support/48-obsahovy-kalendar.md`
- `06_marketing_support/49-tvorba-a-schvalovani-obsahu.md`
- `06_marketing_support/50-evidence-marketingovych-vystupu.md`
- `06_marketing_support/51-vyhodnoceni-kampani.md`

**Dulezite kontroly:**
- Kampan ma cil, segment, rozpocet, stav a KPI.
- Externi obsah ma autora a schvaleni.
- Vyhodnoceni kampane se vaze na puvodni cil.

## 6. Incidenty a provozni chyby

**Tok:** `Detekce -> Triage -> Workaround -> Reseni -> Postmortem -> Napravna akce`

**Cards:**
- Incident
- Riziko
- Change request
- Zakaznicky pozadavek
- Integrace

**Dokumenty:**
- `07_automation_ai_integrations/63-fallback-postupy-pri-chybe-systemu.md`
- `07_automation_ai_integrations/69-incidenty-a-provozni-chyby.md`
- `05_communication/45-eskalace-problemu-a-vyjimek.md`
- `08_management_reporting/78-rizikovy-registr.md`

**Dulezite kontroly:**
- Incident ma zavaznost, dopad, vlastnika, workaround a napravnou akci.
- Incident s dopadem na klienta vyzaduje lidske schvaleni komunikace.
- Po uzavreni vznikne postmortem nebo znalostni clanek, pokud dava smysl.

## 7. Zmenove pozadavky

**Tok:** `Navrh -> Analyza -> Schvaleni -> Implementace -> Test -> Nasazeni/Rollback`

**Cards:**
- Change request
- Riziko
- Integrace
- Automatizace
- AI funkce
- KPI

**Dokumenty:**
- `07_automation_ai_integrations/68-sprava-zmenovych-pozadavku.md`
- `07_automation_ai_integrations/66-test-management.md`
- `07_automation_ai_integrations/64-prehled-integraci.md`
- `07_automation_ai_integrations/58-pravidla-pro-navrh-automatizaci.md`
- `08_management_reporting/80-roadmapa-rozvoje-erp-praut.md`

**Dulezite kontroly:**
- Zmena ma duvod, dopad, riziko, test, schvalovatele a rollback.
- Zmeny opravneni, cen, klientskych dat a integraci schvaluje clovek.
- Nasazena zmena ma zaznam v historii a vazbu na roadmapu nebo incident.

## 8. Automatizace a AI

**Tok:** `Navrh -> Posouzeni rizika -> Schvaleni -> Pilot -> Aktivni provoz -> Audit`

**Cards:**
- Automatizace
- AI funkce
- Integrace
- Riziko
- KPI
- Incident

**Dokumenty:**
- `07_automation_ai_integrations/57-katalog-automatizaci-praut.md`
- `07_automation_ai_integrations/58-pravidla-pro-navrh-automatizaci.md`
- `07_automation_ai_integrations/59-ai-asistent-v-erp.md`
- `07_automation_ai_integrations/60-ai-funkce-a-jejich-limity.md`
- `07_automation_ai_integrations/61-schvalovaci-matice-pro-cloveka.md`
- `07_automation_ai_integrations/62-kontrola-vystupu-ai.md`
- `copy_paste_import/12-automation-rules.md`

**Dulezite kontroly:**
- Automatizace ma spoustec, vstup, akci, vystup, uroven autonomie, vlastnika a fallback.
- AI nesmi sama menit cenu, opravneni, klientskou komunikaci ani finalni rizikove rozhodnuti.
- Kazda aktivni automatizace ma metriku a auditni kontrolu.
- Sedm zakladnich automation pravidel je alert-only a posila upozorneni odpovedne osobe.

## 9. Reporting, KPI a rizika

**Tok:** `KPI -> Sber dat -> Report -> Odchylka -> Akce -> Audit`

**Cards:**
- KPI
- Riziko
- Projekt
- Zakazka
- Faktura
- Obchodni prilezitost
- Change request

**Dokumenty:**
- `08_management_reporting/73-manazersky-dashboard.md`
- `08_management_reporting/74-kpi-a-metriky-uspechu.md`
- `08_management_reporting/75-reporting-obchodnich-aktivit.md`
- `08_management_reporting/76-reporting-projektu-a-kapacit.md`
- `08_management_reporting/77-financni-a-casova-efektivita-zakazek.md`
- `08_management_reporting/78-rizikovy-registr.md`
- `08_management_reporting/79-pravidelny-audit-systemu.md`

**Dulezite kontroly:**
- KPI ma definici, zdroj dat, vlastnika, frekvenci, cil a akci pri odchylce.
- Riziko ma pravdepodobnost, dopad, mitigaci a termin kontroly.
- Reporty musi umet filtrovat faktury podle stavu, splatnosti, zakazky, firmy a projektu.
- Pohled `Obnovy do 60 dni` hlida zakazky s blizici se obnovou nebo retainerem.
- Reporty se neopiraji o informace ponechane jen v chatu.

## Minimalni akceptace procesu

Po rucnim nastaveni ma kolega overit tyto scenare:

- Lead se da prevest na prilezitost, nabidku, zakazku, fakturu a projekt.
- Zakazka s datumem obnovy do 30 dni posle alert obchodnikovi.
- Zakaznicky pozadavek se da eskalovat na incident a znalostni clanek.
- Ze zapisu ze schuzky vzniknou ukoly s vlastnikem a terminem.
- Sedm automation pravidel z `copy_paste_import/12-automation-rules.md` funguje jako alert-only.
- Zmena projde pres schvaleni, test a rollback informaci.
- Rizikove kroky maji lidske schvaleni.
- Reporty dokazou filtrovat podle vlastnika, stavu, klienta/projektu a rizika.
