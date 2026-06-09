# Jak má vypadat prostředí PRAUT v Huly

Tento dokument popisuje cílový stav ERP prostředí PRAUT v Huly. Slouží jako referenční specifikace pro kolegu, který prostředí zakládá — říká, CO má existovat a jak má vypadat hotový výsledek. Jak data do Huly dostat (skripty, import, ruční kopírování) je popsáno v ostatních souborech tohoto balíčku.

**Základní pravidlo systému:**
- Karty = strukturovaná data, vztahy a reporting
- Dokumenty = metodiky, pravidla, šablony a delší text
- Úkoly a akční položky = práce s vlastníkem, termínem a stavem
- AI = poradce a přípravná vrstva, ne autorita pro riziková rozhodnutí

---

## 1. Pracovní prostory

V Huly existuje 8 pracovních prostorů (teamspaces). Každý prostor obsahuje dokumenty pro svoji oblast.

| Prostor | Název v Huly | Účel | Dokumentů |
|---|---|---|---|
| `01_system` | Základ systému | Pravidla ERP, datový model, role a oprávnění, audit, bezpečnost dat | 10 |
| `02_sales_crm` | Obchod a CRM | Správa kontaktů a firem, leady, pipeline, nabídky, schůzky | 10 |
| `03_projects_tasks` | Zakázky, projekty a úkoly | Realizace zakázek, projektové řízení, milníky, kapacity, časové výkazy | 10 |
| `04_knowledge_docs` | Dokumenty a znalostní báze | Šablony dokumentů, procesní dokumentace, klientské předávací materiály | 8 |
| `05_communication` | Komunikace a spolupráce | Chat kanály, záznamy ze schůzek, inbox, virtuální kancelář, eskalace | 7 |
| `06_marketing_support` | Marketing a zákaznická péče | Kampaně, obsahový kalendář, helpdesk, zákaznické požadavky, spokojenost | 11 |
| `07_automation_ai` | Automatizace, AI a integrace | Katalog automatizací, AI funkce a jejich limity, integrace, incidenty, onboarding | 16 |
| `08_management` | Řízení firmy a reporting | Manažerský dashboard, KPI, reporting, rizikový registr, audit systému | 8 |

**Celkem: 80 dokumentů ve 8 prostorech.**

Dokumenty jsou připraveny ve složce `huly_unified_import/` v Huly Unified Import formátu (8 YAML souborů + 80 MD souborů). Fallback pro ruční import je v `copy_paste_import/`.

---

## 2. Typy karet (Cards)

V Huly existuje 22 typů karet. Zakládej je v `Settings → TYPES`, ne jako instance v kartách. Zavádět ve dvou vlnách — nejprve ověř obchod a zakázky, pak přidej zbytek.

### První vlna — obchod, zakázky, zákaznická péče

| Typ karty | Povinná pole | Stavy |
|---|---|---|
| **Firma** | název, IČO, web, segment, stav vztahu, vlastník, citlivost | nový → aktivní → strategický → neaktivní → archiv |
| **Kontakt** | jméno, firma, role, email, telefon, GDPR souhlas, vlastník | nový → aktivní → neaktivní → archiv |
| **Lead/Poptávka** | zdroj, firma, kontakt, potřeba, rozpočet, termín, priorita, stav, další krok | nový → kontaktovat → kvalifikace → převedeno → odmítnuto → archiv |
| **Obchodní příležitost** | fáze, hodnota, pravděpodobnost, očekávané uzavření, riziko, vlastník | kvalifikace → analýza → nabídka → vyjednávání → vyhráno → prohráno |
| **Nabídka** | klient, příležitost, rozsah, cena, platnost, verze, schvalovatel, stav | draft → interní kontrola → ke schválení → odesláno → vyhráno → prohráno |
| **Zakázka** | klient, nabídka, PM, start, cílový termín, rozpočet hodin, datum obnovy, typ spolupráce, health, stav | návrh → připraveno → aktivní → pozastaveno → dokončeno → archiv |
| **Faktura** | číslo faktury, zakázka, klient, výše, datum vystavení, datum splatnosti, datum zaplacení, stav, vlastník | draft → vystavená → odesláno → zaplaceno → po splatnosti → storno |
| **Projekt** | zakázka, PM, fáze, deadline, skutečný čas, blokery, rizika | příprava → aktivní realizace → revize → klientské schválení → dokončeno |
| **Zákaznický požadavek** | klient, kontakt, typ, priorita, SLA, vlastník, stav, dopad | nový → triage → řešení → čeká na klienta → vyřešeno → uzavřeno |

Po zavedení první vlny vytvoř jeden testovací záznam pro každý typ a ověř, že vazby mezi kartami fungují (viz sekce 3).

### Druhá vlna — procesy, marketing, AI, reporting

| Typ karty | Povinná pole | Stavy |
|---|---|---|
| **Milník** | projekt, vlastník, termín, stav, výstupy, akceptační kritérium | návrh → plánovaný → aktivní → v riziku → dodaný → akceptovaný |
| **Předání** | from role, to role, projekt, deadline, otevřené otázky, potvrzení převzetí | vyžádáno → připravuje se → ke kontrole → přijato → vráceno → dokončeno |
| **Zápis ze schůzky** | datum, účastníci, projekt/klient, rozhodnutí, akční položky, citlivost | draft → ke kontrole → potvrzeno → akční kroky otevřené → uzavřeno |
| **Kampaň** | cíl, segment, platformy, start, konec, rozpočet, stav, KPI | návrh → příprava → aktivní → vyhodnocení → uzavřeno |
| **Obsahová položka** | kampaň, formát, platforma, autor, termín, stav, publikovaná URL | nápad → draft → kontrola → schváleno → publikováno → archiv |
| **Znalostní článek** | téma, kategorie, stav, vlastník, poslední revize, související požadavky | draft → ověřeno → publikováno → zastaralé → archiv |
| **Automatizace** | spouštěč, vstup, akce, výstup, autonomie, riziko, fallback, vlastník | návrh → schváleno → aktivní → pozastaveno → vyřazeno |
| **AI funkce** | vstup, výstup, autonomie, kontrolor, citlivost, omezení, stav | povoleno → povoleno se schválením → zakázáno → pozastaveno |
| **Integrace** | systém, účel, data, směr synchronizace, vlastník, oprávnění, riziko | návrh → test → aktivní → pozastaveno → vyřazeno |
| **Incident** | závažnost, dopad, systém, vlastník, workaround, příčina, nápravná akce | detekováno → triage → řešení → obnova → postmortem → uzavřeno |
| **Change request** | důvod, dopad, riziko, schvalovatel, test, nasazení, rollback | návrh → analýza → schváleno → implementace → test → nasazeno → rollback |
| **Riziko** | oblast, pravděpodobnost, dopad, vlastník, mitigace, stav, termín kontroly | nové → vyhodnoceno → mitigace → monitoring → uzavřeno |
| **KPI** | definice, zdroj dat, vlastník, frekvence, cíl, trend, akce při odchylce | návrh → schváleno → měřeno → odchylka → revize |

---

## 3. Vazby mezi kartami

Toto jsou povinné vztahy — bez nich procesní toky nefungují:

- **Firma** má → Kontakty, Leady, Příležitosti, Zakázky, Zákaznické požadavky
- **Lead/Poptávka** → po kvalifikaci se převádí na **Obchodní příležitost**
- **Obchodní příležitost** má → Schůzky (Zápisy), Nabídky, Follow-up úkoly
- **Nabídka** → po schválení a výhře se převádí na **Zakázku**
- **Zakázka** má → Projekt, Milníky, Předání, Faktury, Časové reporty, Klientskou dokumentaci
- **Faktura** se váže na → Zakázku, Firmu, Projekt
- **Projekt** má → Úkoly, Milníky, Rizika, Incidenty, Reporty
- **Kampaň** má → Obsahové položky, Leady, Vyhodnocení
- **Zákaznický požadavek** může vytvořit → Incident, Znalostní článek, Eskalaci
- **Automatizace / AI funkce / Integrace / Incident / Change request** se váže na → Riziko, Audit

---

## 4. Hlavní procesní toky

9 klíčových procesů, které musí v prostředí fungovat end-to-end:

| # | Název | Tok karet | Kontrolní bod |
|---|---|---|---|
| 1 | Obchod | Firma → Lead → Příležitost → Nabídka → Zakázka | Nabídka vyžaduje schvalovatele před odesláním |
| 2 | Realizace zakázky | Zakázka → Projekt → Úkoly → Milníky → Předání → Uzavření | Předání musí potvrdit přijímající role |
| 3 | Zákaznická péče | Požadavek → Triage → Řešení → Incident → Znalostní článek | Uzavření a klientská komunikace = člověk |
| 4 | Schůzky a rozhodnutí | Schůzka → Zápis → Rozhodnutí → Akční položky → Úkoly | Rozhodnutí nesmí zůstat jen v chatu |
| 5 | Marketing | Plán → Kampaň → Obsahová položka → Schválení → Publikace → Vyhodnocení | Externí obsah má autora a schválení |
| 6 | Incidenty | Detekce → Triage → Workaround → Řešení → Postmortem → Nápravná akce | Incident s dopadem na klienta = schválení komunikace |
| 7 | Změnové požadavky | Návrh → Analýza → Schválení → Implementace → Test → Nasazení/Rollback | Změna oprávnění nebo integrace = schválení člověkem |
| 8 | Automatizace a AI | Návrh → Posouzení rizika → Schválení → Pilot → Provoz → Audit | Každá aktivní automatizace má metriku a fallback |
| 9 | Reporting a KPI | KPI → Sběr dat → Report → Odchylka → Akce → Audit | Reporty se neopírají o informace ponechané jen v chatu |

Detailní popis každého procesu (které karty, které dokumenty, která rozhodnutí) je v `PROCESY_PRO_PREDANI.md`.

---

## 5. Kritická pravidla — musí být implementována

Tato pravidla nejsou volitelná. Bez nich prostředí neplní svůj účel:

1. **Nabídka má schvalovatele.** Cena, sleva a obchodní podmínky nesmí zůstat jen v chatu nebo v e-mailu — musí být jako pole v kartě Nabídka a schválení musí být evidováno.

2. **AI nesmí sama rozhodovat.** AI funkce může připravit návrh, ale nesmí sama odesílat klientskou komunikaci, měnit ceny, upravovat oprávnění ani uzavírat zakázky nebo incidenty.

3. **Incident s dopadem na klienta = lidské schválení komunikace.** Každá zpráva směrem ke klientovi při aktivním incidentu prochází schválením odpovědné osoby.

4. **Předání práce musí být potvrzeno.** Karta Předání se nepřesouvá do stavu „dokončeno" automaticky — vyžaduje potvrzení přijímající role.

5. **Důležitá rozhodnutí ze schůzek mají záznam.** Zápis ze schůzky musí mít vyplněná pole Rozhodnutí a Akční položky. Akční položka, která nemá vlastníka a termín, není akční položka.

---

## 6. Povinné pohledy (views) v kartách

Každý typ karty musí mít tyto filtry/pohledy nastaveny:

| Pohled | Filtr | Účel |
|---|---|---|
| `Aktivní` | vyloučit: archiv, uzavřeno, prohráno, vyřazeno | Výchozí provozní pohled |
| `Bez vlastníka` | vlastník / PM / schvalovatel = prázdný | Detekce nezařazené práce |
| `Ke schválení` | stav = ke schválení / čeká na schválení | Fronta pro lidskou kontrolu |
| `Riziko` | riziko = vysoké NEBO citlivost = citlivé | Přehled exponovaných záznamů |
| `Obnovy do 60 dní` | datum obnovy do 60 dní A stav není archiv/dokončeno | Přehled blížících se obnov a retainerů |
| `Moje` | vlastník / assignee / PM / kontrolor = přihlášený uživatel | Osobní fronta práce |

---

## 7. Hotovo — acceptance kritéria

Prostředí je hotové, když projdou všechny tyto body:

**Struktura:**
- [ ] Existuje 8 pracovních prostorů s odpovídajícími názvy
- [ ] Je importováno všech 80 dokumentů (alespoň jeden namátkový check obsahu z každého prostoru)
- [ ] Existuje všech 22 typů karet s povinnými poli, stavy a šesti pohledy

**Procesy:**
- [ ] Nabídka nelze odeslat bez schvalovatele (pole je povinné)
- [ ] Předání se nedá uzavřít bez potvrzení přijímající role
- [ ] AI funkce má stav `povoleno se schválením` nebo `zakázáno` pro riziková rozhodnutí

**Tři kontrolní scénáře end-to-end (projít ručně):**
- [ ] **Scénář 1:** Lead → Příležitost → Nabídka (se schválením) → Zakázka → Projekt → první Milník
- [ ] **Scénář 2:** Zákaznický požadavek → Eskalace → Incident → Znalostní článek (navázaný na původní požadavek)
- [ ] **Scénář 3:** Zápis ze schůzky → Akční položky → Úkoly s vlastníkem a termínem → Časový report navázaný na projekt

Každý scénář musí projít bez ztráty vazeb a bez rozhodnutí, které zůstane jen v chatu nebo komentáři.

---

## 8. Kde najít podklady

| Potřeba | Soubor |
|---|---|
| Obsah všech 80 dokumentů | `01_system/` až `08_management_reporting/` |
| Importní podklady do Huly | `huly_unified_import/` + `huly_unified_import/README.md` |
| Fallback — ruční import copy-paste | `copy_paste_import/00-import-order.md` |
| Typy karet — pole, stavy, vazby | `copy_paste_import/09-cards-schema.md` |
| Automation pravidla (7 konkrétních triggerů) | `copy_paste_import/12-automation-rules.md` |
| Nastavení karet krok za krokem | `copy_paste_import/11-cards-setup-guide.md` |
| Procesní mapa — detailní karty a dokumenty | `PROCESY_PRO_PREDANI.md` |
| Kontrolní scénáře pro testování | `copy_paste_import/10-control-scenarios.md` |
| Podrobný 9fázový importní checklist | `IMPORT_CHECKLIST.md` |
| Návody pro zaměstnance po spuštění | `zamestnanecke_navody/` (14 souborů) |
