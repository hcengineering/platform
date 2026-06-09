# Importni checklist pro Huly

Tento checklist prevadi Markdown balicek `praut_erp_docs/` do prakticke struktury v Huly. Dokumenty importuj podle moznosti kolegy: pres Huly Import Tool, vlastni importer nebo rucne pres copy-paste fallback.

Importni podklady jsou pripravene v `huly_unified_import/`. Typy Cards zakladej oddelene v `Settings -> TYPES`, ne jako bezne instance v seznamu Cards.

## Faze 0: Priprava
- [ ] Otevrit `praut_erp_docs/00_index.md` a zkontrolovat, ze je dostupnych vsech 80 dokumentu.
- [ ] Otevrit `huly_unified_import/README.md` a zvolit konkretni importni cestu: Huly Import Tool, vlastni importer nebo rucni copy-paste.
- [ ] Pred importem overit cil: 8 teamspaces, 80 dokumentu, 22 typu Cards a 8 oblasti.
- [ ] Urcit jednoho vlastnika importu a jednoho schvalovatele struktury.
- [ ] Pred importem potvrdit zakladni pravidlo: dokumenty jsou metodiky, Cards jsou strukturovana evidence, issues jsou operativni prace.
- [ ] Domluvit naming standard podle [7. Standard nazvu stitku atributu a vztahu](01_system/07-standard-nazvu-stitku-atributu-a-vztahu.md).
- [ ] Domluvit lidske schvalovani podle [5. Role odpovednosti a opravneni](01_system/05-role-odpovednosti-a-opravneni.md), [9. Auditni stopa a evidence rozhodnuti](01_system/09-auditni-stopa-a-evidence-rozhodnuti.md) a [61. Schvalovaci matice pro cloveka](07_automation_ai_integrations/61-schvalovaci-matice-pro-cloveka.md).

## Faze 1: Workspace a prostory
- [ ] Vytvorit prostor `01_system` - Zaklad systemu.
- [ ] Vytvorit prostor `02_sales_crm` - Obchod a CRM.
- [ ] Vytvorit prostor `03_projects_tasks` - Zakazky, projekty a ukoly.
- [ ] Vytvorit prostor `04_knowledge_docs` - Dokumenty a znalostni baze.
- [ ] Vytvorit prostor `05_communication` - Komunikace a spoluprace.
- [ ] Vytvorit prostor `06_marketing_support` - Marketing a zakaznicka pece.
- [ ] Vytvorit prostor `07_automation_ai_integrations` - Automatizace, AI a integrace.
- [ ] Vytvorit prostor `08_management_reporting` - Rizeni firmy a reporting.
- [ ] Prostory vytvaret podle `huly_unified_import/*.yaml`; rucne jen pokud se nepouzije importni nastroj.
- [ ] Nastavit vlastnika prostoru a zakladni viditelnost.
- [ ] Citlive oblasti jako obchod, klienti, integrace, incidenty a rizika nezverejnovat bez schvaleni.

## Faze 2: Import dokumentu
- [ ] Importovat dokumenty z `huly_unified_import/` zvolenym nastrojem nebo vlastnim importerem.
- [ ] Pokud automatizovany import neni prakticky dostupny, pouzit fallback `copy_paste_import/00-import-order.md`.
- [ ] Po importu nahodne zkontrolovat 2 dokumenty z kazde oblasti, ze maji obsah.

### 2.1 Governance a zaklad systemu
- [ ] Importovat [1. Uvod do ERP PRAUT](01_system/01-uvod-do-erp-praut.md)
- [ ] Importovat [2. Struktura pracovniho prostoru PRAUT](01_system/02-struktura-pracovniho-prostoru-praut.md)
- [ ] Importovat [3. Pravidla pouzivani ERP](01_system/03-pravidla-pouzivani-erp.md)
- [ ] Importovat [4. Slovnik pojmu ERP](01_system/04-slovnik-pojmu-erp.md)
- [ ] Importovat [5. Role odpovednosti a opravneni](01_system/05-role-odpovednosti-a-opravneni.md)
- [ ] Importovat [6. Kdy pouzit dokument a kdy kartu](01_system/06-kdy-pouzit-dokument-a-kdy-kartu.md)
- [ ] Importovat [7. Standard nazvu stitku atributu a vztahu](01_system/07-standard-nazvu-stitku-atributu-a-vztahu.md)
- [ ] Importovat [8. Datovy model PRAUT](01_system/08-datovy-model-praut.md)
- [ ] Importovat [9. Auditni stopa a evidence rozhodnuti](01_system/09-auditni-stopa-a-evidence-rozhodnuti.md)
- [ ] Importovat [10. Bezpecnost dat a prace s citlivymi informacemi](01_system/10-bezpecnost-dat-a-prace-s-citlivymi-informacemi.md)

### 2.2 Znalostni baze a dokumentacni standard
- [ ] Importovat [31. Firemni znalostni baze](04_knowledge_docs/31-firemni-znalostni-baze.md)
- [ ] Importovat [32. Pravidla tvorby dokumentace](04_knowledge_docs/32-pravidla-tvorby-dokumentace.md)
- [ ] Importovat [33. Prace s dokumenty v realnem case](04_knowledge_docs/33-prace-s-dokumenty-v-realnem-case.md)
- [ ] Importovat [34. Akcni polozky v dokumentech](04_knowledge_docs/34-akcni-polozky-v-dokumentech.md)
- [ ] Importovat [35. Prace se soubory a Drive](04_knowledge_docs/35-prace-se-soubory-a-drive.md)
- [ ] Importovat [36. Struktura sablon dokumentu](04_knowledge_docs/36-struktura-sablon-dokumentu.md)
- [ ] Importovat [37. Interni procesni dokumentace](04_knowledge_docs/37-interni-procesni-dokumentace.md)
- [ ] Importovat [38. Klientska dokumentace a predavaci materialy](04_knowledge_docs/38-klientska-dokumentace-a-predavaci-materialy.md)

### 2.3 Obchod, CRM, zakazky a projekty
- [ ] Importovat [11. Sprava kontaktu a firem](02_sales_crm/11-sprava-kontaktu-a-firem.md)
- [ ] Importovat [12. Evidence leadu a poptavek](02_sales_crm/12-evidence-leadu-a-poptavek.md)
- [ ] Importovat [13. Obchodni pipeline](02_sales_crm/13-obchodni-pipeline.md)
- [ ] Importovat [14. Kvalifikace a scoring leadu](02_sales_crm/14-kvalifikace-a-scoring-leadu.md)
- [ ] Importovat [15. Obchodni follow-up proces](02_sales_crm/15-obchodni-follow-up-proces.md)
- [ ] Importovat [16. Priprava nabidek](02_sales_crm/16-priprava-nabidek.md)
- [ ] Importovat [17. Schvalovani cen a obchodnich podminek](02_sales_crm/17-schvalovani-cen-a-obchodnich-podminek.md)
- [ ] Importovat [18. Evidence obchodnich schuzek](02_sales_crm/18-evidence-obchodnich-schuzek.md)
- [ ] Importovat [19. Sablony obchodni komunikace](02_sales_crm/19-sablony-obchodni-komunikace.md)
- [ ] Importovat [20. Prechod z obchodu do realizace](02_sales_crm/20-prechod-z-obchodu-do-realizace.md)
- [ ] Importovat [21. Zalozeni nove zakazky](03_projects_tasks/21-zalozeni-nove-zakazky.md)
- [ ] Importovat [22. Projektove rizeni v PRAUT](03_projects_tasks/22-projektove-rizeni-v-praut.md)
- [ ] Importovat [23. Prace s ukoly podukoly a prirazenim](03_projects_tasks/23-prace-s-ukoly-podukoly-a-prirazenim.md)
- [ ] Importovat [24. Stavove procesy ukolu](03_projects_tasks/24-stavove-procesy-ukolu.md)
- [ ] Importovat [25. Milniky projektu](03_projects_tasks/25-milniky-projektu.md)
- [ ] Importovat [26. Planovani prace v osobnim planovaci](03_projects_tasks/26-planovani-prace-v-osobnim-planovaci.md)
- [ ] Importovat [27. Tymovy planovac a kapacity](03_projects_tasks/27-tymovy-planovac-a-kapacity.md)
- [ ] Importovat [28. Casove odhady a casove reporty](03_projects_tasks/28-casove-odhady-a-casove-reporty.md)
- [ ] Importovat [29. Predavani prace mezi rolemi](03_projects_tasks/29-predavani-prace-mezi-rolemi.md)
- [ ] Importovat [30. Kontrola dokonceni zakazky](03_projects_tasks/30-kontrola-dokonceni-zakazky.md)

### 2.4 Komunikace, marketing, podpora, AI, integrace a reporting
- [ ] Importovat [39. Pravidla interni komunikace](05_communication/39-pravidla-interni-komunikace.md)
- [ ] Importovat [40. Chat kanaly vlakna a prime zpravy](05_communication/40-chat-kanaly-vlakna-a-prime-zpravy.md)
- [ ] Importovat [41. Inbox a notifikace](05_communication/41-inbox-a-notifikace.md)
- [ ] Importovat [42. Virtualni kancelar a schuzky](05_communication/42-virtualni-kancelar-a-schuzky.md)
- [ ] Importovat [43. Zapisy ze schuzek](05_communication/43-zapisy-ze-schuzek.md)
- [ ] Importovat [44. Pravidla pro asynchronni spolupraci](05_communication/44-pravidla-pro-asynchronni-spolupraci.md)
- [ ] Importovat [45. Eskalace problemu a vyjimek](05_communication/45-eskalace-problemu-a-vyjimek.md)
- [ ] Importovat [46. Marketingovy plan PRAUT](06_marketing_support/46-marketingovy-plan-praut.md)
- [ ] Importovat [47. Sprava kampani](06_marketing_support/47-sprava-kampani.md)
- [ ] Importovat [48. Obsahovy kalendar](06_marketing_support/48-obsahovy-kalendar.md)
- [ ] Importovat [49. Tvorba a schvalovani obsahu](06_marketing_support/49-tvorba-a-schvalovani-obsahu.md)
- [ ] Importovat [50. Evidence marketingovych vystupu](06_marketing_support/50-evidence-marketingovych-vystupu.md)
- [ ] Importovat [51. Vyhodnoceni kampani](06_marketing_support/51-vyhodnoceni-kampani.md)
- [ ] Importovat [52. Evidence zakaznickych pozadavku](06_marketing_support/52-evidence-zakaznickych-pozadavku.md)
- [ ] Importovat [53. Helpdesk proces](06_marketing_support/53-helpdesk-proces.md)
- [ ] Importovat [54. Eskalace zakaznickych problemu](06_marketing_support/54-eskalace-zakaznickych-problemu.md)
- [ ] Importovat [55. Znalostni baze pro zakaznickou podporu](06_marketing_support/55-znalostni-baze-pro-zakaznickou-podporu.md)
- [ ] Importovat [56. Mereni spokojenosti zakazniku](06_marketing_support/56-mereni-spokojenosti-zakazniku.md)
- [ ] Importovat [57. Katalog automatizaci PRAUT](07_automation_ai_integrations/57-katalog-automatizaci-praut.md)
- [ ] Importovat [58. Pravidla pro navrh automatizaci](07_automation_ai_integrations/58-pravidla-pro-navrh-automatizaci.md)
- [ ] Importovat [59. AI asistent v ERP](07_automation_ai_integrations/59-ai-asistent-v-erp.md)
- [ ] Importovat [60. AI funkce a jejich limity](07_automation_ai_integrations/60-ai-funkce-a-jejich-limity.md)
- [ ] Importovat [61. Schvalovaci matice pro cloveka](07_automation_ai_integrations/61-schvalovaci-matice-pro-cloveka.md)
- [ ] Importovat [62. Kontrola vystupu AI](07_automation_ai_integrations/62-kontrola-vystupu-ai.md)
- [ ] Importovat [63. Fallback postupy pri chybe systemu](07_automation_ai_integrations/63-fallback-postupy-pri-chybe-systemu.md)
- [ ] Importovat [64. Prehled integraci](07_automation_ai_integrations/64-prehled-integraci.md)
- [ ] Importovat [65. GitHub integrace](07_automation_ai_integrations/65-github-integrace.md)
- [ ] Importovat [66. Test management](07_automation_ai_integrations/66-test-management.md)
- [ ] Importovat [67. Sablony ukolu a tiketu](07_automation_ai_integrations/67-sablony-ukolu-a-tiketu.md)
- [ ] Importovat [68. Sprava zmenovych pozadavku](07_automation_ai_integrations/68-sprava-zmenovych-pozadavku.md)
- [ ] Importovat [69. Incidenty a provozni chyby](07_automation_ai_integrations/69-incidenty-a-provozni-chyby.md)
- [ ] Importovat [70. Administrace ERP](07_automation_ai_integrations/70-administrace-erp.md)
- [ ] Importovat [71. Onboarding noveho uzivatele](07_automation_ai_integrations/71-onboarding-noveho-uzivatele.md)
- [ ] Importovat [72. Skoleni tymu](07_automation_ai_integrations/72-skoleni-tymu.md)
- [ ] Importovat [73. Manazersky dashboard](08_management_reporting/73-manazersky-dashboard.md)
- [ ] Importovat [74. KPI a metriky uspechu](08_management_reporting/74-kpi-a-metriky-uspechu.md)
- [ ] Importovat [75. Reporting obchodnich aktivit](08_management_reporting/75-reporting-obchodnich-aktivit.md)
- [ ] Importovat [76. Reporting projektu a kapacit](08_management_reporting/76-reporting-projektu-a-kapacit.md)
- [ ] Importovat [77. Financni a casova efektivita zakazek](08_management_reporting/77-financni-a-casova-efektivita-zakazek.md)
- [ ] Importovat [78. Rizikovy registr](08_management_reporting/78-rizikovy-registr.md)
- [ ] Importovat [79. Pravidelny audit systemu](08_management_reporting/79-pravidelny-audit-systemu.md)
- [ ] Importovat [80. Roadmapa rozvoje ERP PRAUT](08_management_reporting/80-roadmapa-rozvoje-erp-praut.md)

## Faze 3: Typy Cards
Typy Cards zakladej v `Settings -> TYPES`, ne v hlavnim seznamu Cards. Nejdrive zaloz a over testovaci typ `Firma`; plny setup ostatnich typu delej az po overeni, ze pole, stavy a pohledy v Huly funguji podle ocekavani.

- [ ] Otevrit Huly `Settings -> TYPES` a overit, kde se zakladaji typy Cards.
- [ ] Zalozit testovaci typ `Firma` s poli `ICO` a `citlivost`.
- [ ] Po overeni zalozit prvni vlnu 9 typu Cards podle `copy_paste_import/11-cards-setup-guide.md`.
- [ ] Druhou vlnu zalozit az po otestovani obchodniho toku.
- [ ] Omylem vytvorene Cards instance nemazat automaticky; zapsat je jako manual cleanup.

### Firma
- **Ucel:** Centralni evidence organizace, klienta nebo partnera.
- **Povinna pole:** nazev, ICO, web, segment, stav vztahu, vlastnik, citlivost
- **Stavy:** novy, aktivni, strategicky, neaktivni, archiv
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Kontakt
- **Ucel:** Evidence osoby a jeji role ve firme nebo zakazce.
- **Povinna pole:** jmeno, firma, role, email, telefon, GDPR souhlas, vlastnik
- **Stavy:** novy, aktivni, neaktivni, archiv
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Lead/Poptavka
- **Ucel:** Zachyceni nove obchodni poptavky a jeji kvalifikace.
- **Povinna pole:** zdroj, firma, kontakt, potreba, rozpocet, termin, priorita, stav, dalsi krok
- **Stavy:** novy, kontaktovat, kvalifikace, prevedeno, odmitnuto, archiv
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Obchodni prilezitost
- **Ucel:** Rizeni obchodu od kvalifikace po vyhru nebo prohru.
- **Povinna pole:** faze, hodnota, pravdepodobnost, ocekavane uzavreni, riziko, vlastnik
- **Stavy:** kvalifikace, analyza, nabidka, vyjednavani, vyhrano, prohrano
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Nabidka
- **Ucel:** Kontrolovana priprava, schvaleni a historie nabidky.
- **Povinna pole:** klient, prilezitost, rozsah, cena, platnost, verze, schvalovatel, stav
- **Stavy:** draft, interni kontrola, ke schvaleni, odeslano, vyhrano, prohrano
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Zakazka
- **Ucel:** Rizeny prevod vyhrane prilezitosti do realizace.
- **Povinna pole:** klient, nabidka, PM, start, cilovy termin, rozpocet hodin, datum obnovy, typ spoluprace, health, stav
- **Stavy:** navrh, pripraveno, aktivni, pozastaveno, dokonceno, archiv
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Faktura
- **Ucel:** Evidence vystaveni, odeslani, splatnosti, zaplaceni a storna faktury navazane na zakazku, firmu a projekt.
- **Povinna pole:** cislo faktury, zakazka, klient, vyse, datum vystaveni, datum splatnosti, datum zaplaceni, stav, vlastnik
- **Stavy:** draft, vystavena, odeslano, zaplaceno, po splatnosti, storno
- **Kontrola:** Odeslani, upominku a storno potvrzuje odpovedny clovek.

### Projekt
- **Ucel:** Realizacni vrstva zakazky, ukolu, kapacit a reportingu.
- **Povinna pole:** zakazka, PM, faze, deadline, skutecny cas, blokery, rizika
- **Stavy:** priprava, aktivni realizace, revize, klientske schvaleni, dokonceno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Milnik
- **Ucel:** Kontrolni bod projektu s vystupem a akceptaci.
- **Povinna pole:** projekt, vlastnik, termin, stav, vystupy, akceptacni kriterium
- **Stavy:** navrh, planovany, aktivni, v riziku, dodany, akceptovany
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Predani
- **Ucel:** Auditovatelne predani prace mezi rolemi nebo fazemi.
- **Povinna pole:** from role, to role, projekt, deadline, otevrene otazky, potvrzeni prevzeti
- **Stavy:** vyzadano, pripravuje se, ke kontrole, prijato, vraceno, dokonceno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Zapis ze schuzky
- **Ucel:** Evidence rozhodnuti, akcnich polozek a navaznych ukolu ze schuzky.
- **Povinna pole:** datum, ucastnici, projekt/klient, rozhodnuti, akcni polozky, citlivost
- **Stavy:** draft, ke kontrole, potvrzeno, akcni kroky otevrene, uzavreno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Kampan
- **Ucel:** Planovani a vyhodnoceni marketingove kampane.
- **Povinna pole:** cil, segment, platformy, start, konec, rozpocet, stav, KPI
- **Stavy:** navrh, priprava, aktivni, vyhodnoceni, uzavreno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Obsahova polozka
- **Ucel:** Planovani, tvorba a publikace marketingoveho vystupu.
- **Povinna pole:** kampan, format, platforma, autor, termin, stav, publikovana URL
- **Stavy:** napad, draft, kontrola, schvaleno, publikovano, archiv
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Zakaznicky pozadavek
- **Ucel:** Evidence pozadavku klienta a rizene reseni v helpdesku.
- **Povinna pole:** klient, kontakt, typ, priorita, SLA, vlastnik, stav, dopad
- **Stavy:** novy, triage, reseni, ceka na klienta, vyreseno, uzavreno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Znalostni clanek
- **Ucel:** Overeny postup nebo odpoved pro podporu a interni znalostni bazi.
- **Povinna pole:** tema, kategorie, stav, vlastnik, posledni revize, souvisejici pozadavky
- **Stavy:** draft, overeno, publikovano, zastarale, archiv
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Automatizace
- **Ucel:** Evidence automatizace, jeji autonomie, rizik a fallbacku.
- **Povinna pole:** spoustec, vstup, akce, vystup, autonomie, riziko, fallback, vlastnik
- **Stavy:** navrh, schvaleno, aktivni, pozastaveno, vyrazeno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### AI funkce
- **Ucel:** Vymezeni povoleneho pouziti AI a lidske kontroly.
- **Povinna pole:** vstup, vystup, autonomie, kontrolor, citlivost, omezeni, stav
- **Stavy:** povoleno, povoleno se schvalenim, zakazano, pozastaveno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Integrace
- **Ucel:** Evidence napojeneho systemu, datoveho toku a opravneni.
- **Povinna pole:** system, ucel, data, smer synchronizace, vlastnik, opravneni, riziko
- **Stavy:** navrh, test, aktivni, pozastaveno, vyrazeno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Incident
- **Ucel:** Evidence provozni chyby nebo bezpecnostniho/procesniho incidentu.
- **Povinna pole:** zavaznost, dopad, system, vlastnik, workaround, pricina, napravna akce
- **Stavy:** detekovano, triage, reseni, obnova, postmortem, uzavreno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Change request
- **Ucel:** Rizeni zmeny procesu, systemu, integrace nebo automatizace.
- **Povinna pole:** duvod, dopad, riziko, schvalovatel, test, nasazeni, rollback
- **Stavy:** navrh, analyza, schvaleno, implementace, test, nasazeno, rollback
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Riziko
- **Ucel:** Evidence rizika, dopadu, mitigace a pravidelne kontroly.
- **Povinna pole:** oblast, pravdepodobnost, dopad, vlastnik, mitigace, stav, termin kontroly
- **Stavy:** nove, vyhodnoceno, mitigace, monitoring, uzavreno
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### KPI
- **Ucel:** Metrika pro rizeni vykonu ERP, obchodu, projektu a provozu.
- **Povinna pole:** definice, zdroj dat, vlastnik, frekvence, cil, trend, akce pri odchylce
- **Stavy:** navrh, schvaleno, mereno, odchylka, revize
- **Kontrola:** Pokud ma zaznam dopad na cenu, klienta, opravneni, reputaci, data nebo audit, musi ho potvrdit odpovedny clovek.

### Povinne pohledy pro kazdy typ
- [ ] `Aktivni` - vyloucit archiv, uzavreno, prohrano a vyrazeno.
- [ ] `Bez vlastnika` - vlastnik, PM, schvalovatel nebo kontrolor je prazdny.
- [ ] `Ke schvaleni` - stav je ke schvaleni nebo ceka na schvaleni.
- [ ] `Riziko` - riziko je vysoke nebo citlivost je citliva.
- [ ] `Obnovy do 60 dni` - datum obnovy do 60 dni a stav neni archiv ani dokonceno.
- [ ] `Moje` - vlastnik, assignee, PM, kontrolor nebo schvalovatel je prihlaseny uzivatel.

## Faze 4: Vazby mezi kartami
- [ ] Firma ma Kontakty, Leady, Prilezitosti, Zakazky a Zakaznicke pozadavky.
- [ ] Lead/Poptavka se po kvalifikaci prevadi na Obchodni prilezitost.
- [ ] Obchodni prilezitost ma Schuzky, Nabidky a Follow-up ukoly.
- [ ] Nabidka se po schvaleni a vyhre prevadi na Zakazku.
- [ ] Zakazka ma Projekt, Milniky, Predani, Faktury, Casove reporty a Klientskou dokumentaci.
- [ ] Faktura se vaze na Zakazku, Firmu a Projekt.
- [ ] Projekt ma Ukoly, Milniky, Rizika, Incidenty a Reporty.
- [ ] Kampan ma Obsahove polozky, Leady a Vyhodnoceni.
- [ ] Zakaznicky pozadavek muze vytvorit Incident, Znalostni clanek nebo Eskalaci.
- [ ] Automatizace, AI funkce, Integrace, Incident a Change request se vazi na Riziko a Audit.

## Faze 5: Stavove procesy
- [ ] Pro obchod pouzit tok `novy -> kvalifikace -> nabidka -> vyjednavani -> vyhrano/prohrano`.
- [ ] Pro zakazky pouzit tok `navrh -> pripraveno -> aktivni -> pozastaveno -> dokonceno -> archiv`.
- [ ] Pro ukoly pouzit tok `backlog -> to do -> in progress -> under review -> blocked -> done/cancelled`.
- [ ] Pro podporu pouzit tok `novy -> triage -> reseni -> ceka na klienta -> vyreseno -> uzavreno`.
- [ ] Pro rizika pouzit tok `nove -> vyhodnoceno -> mitigace -> monitoring -> uzavreno`.
- [ ] Pro zmeny pouzit tok `navrh -> analyza -> schvaleno -> implementace -> test -> nasazeno/rollback`.

## Faze 6: Sablony a povinne checklisty
- [ ] Vytvorit sablonu `Nabidka` podle [16. Priprava nabidek](02_sales_crm/16-priprava-nabidek.md).
- [ ] Vytvorit sablonu `Predani zakazky` podle [20. Prechod z obchodu do realizace](02_sales_crm/20-prechod-z-obchodu-do-realizace.md) a [29. Predavani prace mezi rolemi](03_projects_tasks/29-predavani-prace-mezi-rolemi.md).
- [ ] Vytvorit sablonu `Zapis ze schuzky` podle [43. Zapisy ze schuzek](05_communication/43-zapisy-ze-schuzek.md).
- [ ] Vytvorit sablonu `Zakaznicky pozadavek` podle [52. Evidence zakaznickych pozadavku](06_marketing_support/52-evidence-zakaznickych-pozadavku.md).
- [ ] Vytvorit sablonu `Incident` podle [69. Incidenty a provozni chyby](07_automation_ai_integrations/69-incidenty-a-provozni-chyby.md).
- [ ] Vytvorit sablonu `Change request` podle [68. Sprava zmenovych pozadavku](07_automation_ai_integrations/68-sprava-zmenovych-pozadavku.md).
- [ ] Vytvorit sablonu `Kontrola AI vystupu` podle [62. Kontrola vystupu AI](07_automation_ai_integrations/62-kontrola-vystupu-ai.md).

## Faze 7: Automatizace az po stabilizaci dat
- [ ] Automatizovat jen kroky popsane v [57. Katalog automatizaci PRAUT](07_automation_ai_integrations/57-katalog-automatizaci-praut.md) a [58. Pravidla pro navrh automatizaci](07_automation_ai_integrations/58-pravidla-pro-navrh-automatizaci.md).
- [ ] Zalozit 7 alert-only pravidel podle [Pravidla automatizaci pro Huly](copy_paste_import/12-automation-rules.md).
- [ ] Pred kazdou automatizaci vyplnit spoustec, vstup, akci, vystup, riziko, fallback, vlastnika a metriku.
- [ ] U kazde automatizace nastavit uroven autonomie a schvalovatele.
- [ ] Zakazat plne automaticke kroky pro ceny, smlouvy, klientskou komunikaci, opravneni, incidenty a AI rozhodnuti.

## Faze 8: Kontrolni scenare
### Lead -> zakazka -> projekt
- [ ] Zalozit testovaci Firmu a Kontakt.
- [ ] Zalozit Lead/Poptavku s vazbou na Firmu a Kontakt.
- [ ] Prevest Lead na Obchodni prilezitost.
- [ ] Vytvorit Nabidku a overit, ze cena a odeslani vyzaduji schvaleni.
- [ ] Po vyhre zalozit Zakazku s datumem obnovy a typem spoluprace.
- [ ] Zalozit Fakturu navazanou na Zakazku, Firmu a Projekt a overit stavy odeslano, zaplaceno a po splatnosti.
- [ ] Zalozit Projekt, prvni Milnik a Predani.

### Zakaznicky pozadavek -> incident -> znalostni clanek
- [ ] Zalozit Zakaznicky pozadavek s prioritou a SLA.
- [ ] Eskalovat problem podle [54. Eskalace zakaznickych problemu](06_marketing_support/54-eskalace-zakaznickych-problemu.md).
- [ ] Pokud ma provozni dopad, zalozit Incident.
- [ ] Po vyreseni vytvorit Znalostni clanek a navazat ho na puvodni pozadavek.

### Meeting -> ukoly -> casovy report
- [ ] Zalozit Zapis ze schuzky.
- [ ] Doplnit rozhodnuti a akcni polozky.
- [ ] Prevest akcni polozky na ukoly.
- [ ] Naplanovat ukol v osobnim planovaci.
- [ ] Po dokonceni overit casovy report a vazbu na projekt.

### Obnovy a automatizace
- [ ] Zalozit Zakazku s datumem obnovy do 30 dni a overit alert obchodnikovi.
- [ ] Overit vsech 7 alert pravidel z `copy_paste_import/12-automation-rules.md`.
- [ ] Overit, ze automation pravidla pouze upozorni odpovednou osobu a neprovedou rizikove rozhodnuti.

## Faze 9: Akceptace importu
- [ ] Existuje 8 hlavnich prostoru.
- [ ] Je importovano vsech 80 dokumentu.
- [ ] Je zalozeno vsech 22 typu Cards z tohoto checklistu.
- [ ] Kazdy typ ma povinna pole, stavy, vlastnika a sest povinnych pohledu.
- [ ] Faktura je navazana na Zakazku, Firmu a Projekt.
- [ ] Zakazka ma pole datum obnovy a typ spoluprace.
- [ ] Sedm automation pravidel je zalozeno jako alert-only.
- [ ] Kriticke kroky maji lidske schvaleni.
- [ ] AI je nastavena jako podpora, ne jako autorita.
- [ ] Tri kontrolni scenare prosly bez ztraty vazeb a bez rozhodnuti zustavajiciho jen v chatu.
