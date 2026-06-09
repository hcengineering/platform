# Rizeni firmy a reporting

**Huly space:** `08_management_reporting`

V tomto souboru jsou dokumenty pro jeden Huly prostor. Kazdy dokument zaloz samostatne a zkopiruj jen obsah mezi `COPY START` a `COPY END`.

---

## HULY DOCUMENT TITLE: 73. Manazersky dashboard
**SOURCE FILE:** `../08_management_reporting/73-manazersky-dashboard.md`

COPY START

# 73. Manazersky dashboard

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/73-manazersky-dashboard.md`

## Ucel
Manazersky dashboard popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, PMO, finance, obchodni vlastnik.

## Doporuceny objekt v Huly
dashboard/reportovaci pohled + karty reportu.

## Povinna pole / atributy
- projekt
- klient
- PM
- faze
- health
- deadline
- skutecne hodiny
- blokery
- marze

## Stavovy proces
- zelena
- zluta
- cervena
- ceka na rozhodnuti

## Vazby na jine dokumenty a karty
- 22. Projektove rizeni v PRAUT
- 25. Milniky projektu
- 28. Casove odhady a casove reporty
- 76. Reporting projektu a kapacit
- 77. Financni a casova efektivita zakazek
- 78. Rizikovy registr

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Vedeni rozhoduje priority, rozpocty a eskalace.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- aktivni projekty
- overdue ukoly
- budget burn
- rizikove projekty

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `12_izc0qWrhGhk.cs.txt` - Huly in Action - Inside look at how our team uses Huly for remote collaboration. Interni pouziti Huly pro remote spolupraci, zdroje, workflow a kazdodenni provoz.
- `15_VsM_VuYh2YA.cs.txt` - How to use time reports Huly Tutorials. Odhady, planovac, skutecny cas, automaticky a rucni time report.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 74. KPI a metriky uspechu
**SOURCE FILE:** `../08_management_reporting/74-kpi-a-metriky-uspechu.md`

COPY START

# 74. KPI a metriky uspechu

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/74-kpi-a-metriky-uspechu.md`

## Ucel
KPI a metriky uspechu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, vlastnici procesu, admin.

## Doporuceny objekt v Huly
manazersky dokument + dashboardove karty.

## Povinna pole / atributy
- metrika
- definice
- zdroj dat
- vlastnik
- frekvence
- cil
- trend

## Stavovy proces
- navrh
- schvaleno
- mereno
- odchylka
- revize

## Vazby na jine dokumenty a karty
- 57. Katalog automatizaci PRAUT
- 59. AI asistent v ERP
- 63. Fallback postupy pri chybe systemu
- 64. Prehled integraci
- 66. Test management
- 69. Incidenty a provozni chyby
- 73. Manazersky dashboard
- 78. Rizikovy registr
- 80. Roadmapa rozvoje ERP PRAUT

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
AI muze interpretovat trend; opatreni rozhoduje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- uspora casu
- chybovost
- dostupnost
- MTTR
- plneni roadmapy

## Zdrojove prepisy
- `08_-MTR7fIsrig.cs.txt` - Beyond the Cloud - How Huly is Building the First Blockchain-Powered Global Collaboration Network. Architektura spoluprace, cloud/self-hosting, bezpecnost, globalni sit a strategicke riziko.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 75. Reporting obchodnich aktivit
**SOURCE FILE:** `../08_management_reporting/75-reporting-obchodnich-aktivit.md`

COPY START

# 75. Reporting obchodnich aktivit

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/75-reporting-obchodnich-aktivit.md`

## Ucel
Reporting obchodnich aktivit popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, obchod, marketing.

## Doporuceny objekt v Huly
reportovaci dokument/dashboard + filtry Cards.

## Povinna pole / atributy
- obdobi
- leady
- prilezitosti
- nabidky
- schuzky
- follow-upy
- pipeline

## Stavovy proces
- draft
- odeslano
- zkontrolovano
- akce vytvoreny

## Vazby na jine dokumenty a karty
- 12. Evidence leadu a poptavek
- 13. Obchodni pipeline
- 16. Priprava nabidek
- 18. Evidence obchodnich schuzek
- 46. Marketingovy plan PRAUT
- 51. Vyhodnoceni kampani
- 56. Mereni spokojenosti zakazniku

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Interpretaci a obchodni rozhodnuti potvrzuje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- nove leady
- SQL
- win rate
- delka cyklu
- pipeline forecast

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 76. Reporting projektu a kapacit
**SOURCE FILE:** `../08_management_reporting/76-reporting-projektu-a-kapacit.md`

COPY START

# 76. Reporting projektu a kapacit

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/76-reporting-projektu-a-kapacit.md`

## Ucel
Reporting projektu a kapacit popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, tymleadi, vedeni.

## Doporuceny objekt v Huly
tydenni report + karta Report projektu.

## Povinna pole / atributy
- obdobi
- projekt
- PM
- planned hours
- actual hours
- blokery
- volna kapacita

## Stavovy proces
- draft
- odeslano
- zkontrolovano
- akce vytvoreny
- uzavreno

## Vazby na jine dokumenty a karty
- 22. Projektove rizeni v PRAUT
- 25. Milniky projektu
- 27. Tymovy planovac a kapacity
- 28. Casove odhady a casove reporty
- 73. Manazersky dashboard

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
PM validuje report pred vedenim.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- kompletnost reportu
- vytizeni
- plan vs skutecnost
- projekty v riziku

## Zdrojove prepisy
- `12_izc0qWrhGhk.cs.txt` - Huly in Action - Inside look at how our team uses Huly for remote collaboration. Interni pouziti Huly pro remote spolupraci, zdroje, workflow a kazdodenni provoz.
- `15_VsM_VuYh2YA.cs.txt` - How to use time reports Huly Tutorials. Odhady, planovac, skutecny cas, automaticky a rucni time report.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 77. Financni a casova efektivita zakazek
**SOURCE FILE:** `../08_management_reporting/77-financni-a-casova-efektivita-zakazek.md`

COPY START

# 77. Financni a casova efektivita zakazek

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/77-financni-a-casova-efektivita-zakazek.md`

## Ucel
Financni a casova efektivita zakazek popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, finance, PM, obchod.

## Doporuceny objekt v Huly
karta Efektivita zakazky + report.

## Povinna pole / atributy
- cena
- budget hodin
- skutecne hodiny
- billable
- marze
- variance
- duvod odchylky

## Stavovy proces
- sleduje se
- v norme
- v riziku
- vyzaduje rozhodnuti
- uzavreno

## Vazby na jine dokumenty a karty
- 16. Priprava nabidek
- 17. Schvalovani cen a obchodnich podminek
- 21. Zalozeni nove zakazky
- 28. Casove odhady a casove reporty
- 30. Kontrola dokonceni zakazky
- 73. Manazersky dashboard

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Zmenu ceny, rozsahu a klientskou komunikaci rozhoduje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- marze
- budget burn
- revenue per hour
- neuctovatelny cas

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `15_VsM_VuYh2YA.cs.txt` - How to use time reports Huly Tutorials. Odhady, planovac, skutecny cas, automaticky a rucni time report.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 78. Rizikovy registr
**SOURCE FILE:** `../08_management_reporting/78-rizikovy-registr.md`

COPY START

# 78. Rizikovy registr

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/78-rizikovy-registr.md`

## Ucel
Rizikovy registr popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, admin, vlastnici procesu.

## Doporuceny objekt v Huly
registr + karty Riziko.

## Povinna pole / atributy
- riziko
- oblast
- pravdepodobnost
- dopad
- vlastnik
- mitigace
- termin kontroly

## Stavovy proces
- nove
- vyhodnoceno
- mitigace
- monitoring
- uzavreno

## Vazby na jine dokumenty a karty
- 10. Bezpecnost dat a prace s citlivymi informacemi
- 45. Eskalace problemu a vyjimek
- 57. Katalog automatizaci PRAUT
- 60. AI funkce a jejich limity
- 64. Prehled integraci
- 69. Incidenty a provozni chyby
- 79. Pravidelny audit systemu

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Dopad a mitigaci rizika schvaluje vlastnik oblasti.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- otevrena rizika
- vysoka rizika bez mitigace
- stari rizik

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `08_-MTR7fIsrig.cs.txt` - Beyond the Cloud - How Huly is Building the First Blockchain-Powered Global Collaboration Network. Architektura spoluprace, cloud/self-hosting, bezpecnost, globalni sit a strategicke riziko.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 79. Pravidelny audit systemu
**SOURCE FILE:** `../08_management_reporting/79-pravidelny-audit-systemu.md`

COPY START

# 79. Pravidelny audit systemu

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/79-pravidelny-audit-systemu.md`

## Ucel
Pravidelny audit systemu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, admin, vlastnici procesu.

## Doporuceny objekt v Huly
auditni checklist + opakovane ukoly.

## Povinna pole / atributy
- audit ID
- oblast
- kontrolor
- vysledek
- nalez
- zavaznost
- napravna akce
- termin

## Stavovy proces
- naplanovano
- probiha
- nalezy
- napravy
- uzavreno

## Vazby na jine dokumenty a karty
- 3. Pravidla pouzivani ERP
- 9. Auditni stopa a evidence rozhodnuti
- 57. Katalog automatizaci PRAUT
- 62. Kontrola vystupu AI
- 64. Prehled integraci
- 70. Administrace ERP
- 74. KPI a metriky uspechu
- 78. Rizikovy registr

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Auditni zavery a napravy potvrzuje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- pocet nalezu
- cas uzavreni naprav
- opakovane nalezy
- pokryti auditu

## Zdrojove prepisy
- `08_-MTR7fIsrig.cs.txt` - Beyond the Cloud - How Huly is Building the First Blockchain-Powered Global Collaboration Network. Architektura spoluprace, cloud/self-hosting, bezpecnost, globalni sit a strategicke riziko.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 80. Roadmapa rozvoje ERP PRAUT
**SOURCE FILE:** `../08_management_reporting/80-roadmapa-rozvoje-erp-praut.md`

COPY START

# 80. Roadmapa rozvoje ERP PRAUT

**Oblast:** Rizeni firmy a reporting
**Soubor:** `08_management_reporting/80-roadmapa-rozvoje-erp-praut.md`

## Ucel
Roadmapa rozvoje ERP PRAUT popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, admin, PM, technicky tym.

## Doporuceny objekt v Huly
roadmap dokument + projekt s milniky.

## Povinna pole / atributy
- iniciativa
- hodnota
- riziko
- effort
- vlastnik
- termin
- KPI
- schvaleni

## Stavovy proces
- backlog
- analyza
- schvaleno
- realizace
- dokonceno
- odlozeno

## Vazby na jine dokumenty a karty
- 57. Katalog automatizaci PRAUT
- 64. Prehled integraci
- 68. Sprava zmenovych pozadavku
- 74. KPI a metriky uspechu
- 78. Rizikovy registr
- 79. Pravidelny audit systemu

## Prakticky postup
1. Over, ze informace patri do tohoto typu objektu a neni vhodnejsi pouzit souvisejici dokument nebo kartu.
2. Zaloz nebo aktualizuj objekt v doporucenem Huly typu a vypln povinna pole.
3. Propoj objekt s klientem, projektem, ukolem, dokumentem nebo rozhodnutim podle vazeb vyse.
4. Prirad vlastnika a dalsi odpovedne osoby.
5. Pokud vznikne akce, zaloz ukol nebo akcni polozku a nech ji projit stavovym procesem.
6. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
7. Po dokonceni uloz vysledek, rozhodnuti a pripadne pouceni do auditovatelne historie.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Roadmapu, investice a poradi rozhoduje vedeni.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- dokoncene iniciativy
- dopad na KPI
- skluz
- blokace

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `08_-MTR7fIsrig.cs.txt` - Beyond the Cloud - How Huly is Building the First Blockchain-Powered Global Collaboration Network. Architektura spoluprace, cloud/self-hosting, bezpecnost, globalni sit a strategicke riziko.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END
