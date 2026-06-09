# Zakazky, projekty a ukoly

**Huly space:** `03_projects_tasks`

V tomto souboru jsou dokumenty pro jeden Huly prostor. Kazdy dokument zaloz samostatne a zkopiruj jen obsah mezi `COPY START` a `COPY END`.

---

## HULY DOCUMENT TITLE: 21. Zalozeni nove zakazky
**SOURCE FILE:** `../03_projects_tasks/21-zalozeni-nove-zakazky.md`

COPY START

# 21. Zalozeni nove zakazky

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/21-zalozeni-nove-zakazky.md`

## Ucel
Zalozeni nove zakazky popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
obchod, PM, delivery lead, finance.

## Doporuceny objekt v Huly
karta Zakazka + projektovy prostor.

## Povinna pole / atributy
- klient
- obchodni vlastnik
- PM
- typ sluzby
- start
- cilovy termin
- rozpocet hodin

## Stavovy proces
- navrh
- pripraveno
- aktivni
- pozastaveno
- dokonceno
- archiv

## Vazby na jine dokumenty a karty
- 20. Prechod z obchodu do realizace
- 22. Projektove rizeni v PRAUT
- 25. Milniky projektu
- 29. Predavani prace mezi rolemi
- 30. Kontrola dokonceni zakazky
- 77. Financni a casova efektivita zakazek

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
Rozsah, cenu, opravneni a prvni plan schvaluje PM nebo vedeni.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- cas zalozeni
- uplnost poli
- cas k prvnimu ukolu

## Zdrojove prepisy
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 22. Projektove rizeni v PRAUT
**SOURCE FILE:** `../03_projects_tasks/22-projektove-rizeni-v-praut.md`

COPY START

# 22. Projektove rizeni v PRAUT

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/22-projektove-rizeni-v-praut.md`

## Ucel
Projektove rizeni v PRAUT popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, delivery tym, vedeni.

## Doporuceny objekt v Huly
projektovy tracker + karta Projekt.

## Povinna pole / atributy
- projekt
- klient
- PM
- faze
- health
- deadline
- rozpocet hodin
- rizika

## Stavovy proces
- priprava
- aktivni realizace
- revize
- klientske schvaleni
- dokonceno

## Vazby na jine dokumenty a karty
- 21. Zalozeni nove zakazky
- 23. Prace s ukoly podukoly a prirazenim
- 24. Stavove procesy ukolu
- 25. Milniky projektu
- 28. Casove odhady a casove reporty
- 76. Reporting projektu a kapacit

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
PM rozhoduje priority, rozsah, eskalace a rozpoctove zmeny.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- overdue ukoly
- blokery
- odhad vs realita
- cyklovy cas

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `12_izc0qWrhGhk.cs.txt` - Huly in Action - Inside look at how our team uses Huly for remote collaboration. Interni pouziti Huly pro remote spolupraci, zdroje, workflow a kazdodenni provoz.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 23. Prace s ukoly podukoly a prirazenim
**SOURCE FILE:** `../03_projects_tasks/23-prace-s-ukoly-podukoly-a-prirazenim.md`

COPY START

# 23. Prace s ukoly podukoly a prirazenim

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/23-prace-s-ukoly-podukoly-a-prirazenim.md`

## Ucel
Prace s ukoly podukoly a prirazenim popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym, PM, QA.

## Doporuceny objekt v Huly
Huly issue/task + sub-issue.

## Povinna pole / atributy
- nazev
- popis
- projekt
- assignee
- collaborators
- priorita
- stitky
- termin
- odhad

## Stavovy proces
- backlog
- to do
- in progress
- under review
- blocked
- done
- cancelled

## Vazby na jine dokumenty a karty
- 22. Projektove rizeni v PRAUT
- 24. Stavove procesy ukolu
- 25. Milniky projektu
- 26. Planovani prace v osobnim planovaci
- 28. Casove odhady a casove reporty
- 65. GitHub integrace

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
Kriticke ukoly, blokace a finalni revizi kontroluje PM.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- ukoly bez vlastnika
- blokovane ukoly
- reopen rate
- prumerny cas dokonceni

## Zdrojove prepisy
- `13_1_bb3N2UT04.cs.txt` - Quick Tip - Add collaborators to issues. Spolupracovnici na issues a notifikace pri zmenach.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 24. Stavove procesy ukolu
**SOURCE FILE:** `../03_projects_tasks/24-stavove-procesy-ukolu.md`

COPY START

# 24. Stavove procesy ukolu

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/24-stavove-procesy-ukolu.md`

## Ucel
Stavove procesy ukolu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, tym, admin.

## Doporuceny objekt v Huly
nastaveni workflow + pravidlovy dokument.

## Povinna pole / atributy
- stav
- kategorie
- vstupni kriterium
- vystupni kriterium
- odpovedna role

## Stavovy proces
- navrh
- schvaleno
- aktivni
- zmeneno

## Vazby na jine dokumenty a karty
- 23. Prace s ukoly podukoly a prirazenim
- 28. Casove odhady a casove reporty
- 30. Kontrola dokonceni zakazky
- 65. GitHub integrace
- 67. Sablony ukolu a tiketu

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
Stavy Under review, Blocked, Cancelled a Done u kritickych ukolu vyzaduji lidskou kontrolu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- stari ve stavu
- WIP
- blokace
- preskocene revize

## Zdrojove prepisy
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 25. Milniky projektu
**SOURCE FILE:** `../03_projects_tasks/25-milniky-projektu.md`

COPY START

# 25. Milniky projektu

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/25-milniky-projektu.md`

## Ucel
Milniky projektu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, delivery lead, vedeni.

## Doporuceny objekt v Huly
karta Milnik + milnik v trackeru.

## Povinna pole / atributy
- projekt
- vlastnik
- termin
- stav
- ocekavane hodiny
- skutecne hodiny
- vystupy

## Stavovy proces
- navrh
- planovany
- aktivni
- v riziku
- dodany
- akceptovany

## Vazby na jine dokumenty a karty
- 21. Zalozeni nove zakazky
- 22. Projektove rizeni v PRAUT
- 23. Prace s ukoly podukoly a prirazenim
- 30. Kontrola dokonceni zakazky
- 76. Reporting projektu a kapacit

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
Dodani a akceptaci milniku potvrzuje PM nebo klientsky vlastnik.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- plneni terminu
- zmeny terminu
- odhad vs skutecnost

## Zdrojove prepisy
- `17_lfVgwL0hWNs.cs.txt` - Organize your Huly workflows with Milestones. Slaby zdroj: milestones podle metadat/nazvu.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 26. Planovani prace v osobnim planovaci
**SOURCE FILE:** `../03_projects_tasks/26-planovani-prace-v-osobnim-planovaci.md`

COPY START

# 26. Planovani prace v osobnim planovaci

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/26-planovani-prace-v-osobnim-planovaci.md`

## Ucel
Planovani prace v osobnim planovaci popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
kazdy clen tymu, PM.

## Doporuceny objekt v Huly
osobni planovac + akcni polozka.

## Povinna pole / atributy
- zdrojovy ukol
- planovany slot
- delka
- soukrome poznamky
- skutecny cas

## Stavovy proces
- neplanovano
- naplanovano
- probiha
- dokonceno

## Vazby na jine dokumenty a karty
- 23. Prace s ukoly podukoly a prirazenim
- 27. Tymovy planovac a kapacity
- 28. Casove odhady a casove reporty
- 41. Inbox a notifikace

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
Clovek zustava vlastnikem sveho casoveho zavazku.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- planovane vs dokoncene
- preplanovani
- neodreportovany cas

## Zdrojove prepisy
- `15_VsM_VuYh2YA.cs.txt` - How to use time reports Huly Tutorials. Odhady, planovac, skutecny cas, automaticky a rucni time report.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 27. Tymovy planovac a kapacity
**SOURCE FILE:** `../03_projects_tasks/27-tymovy-planovac-a-kapacity.md`

COPY START

# 27. Tymovy planovac a kapacity

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/27-tymovy-planovac-a-kapacity.md`

## Ucel
Tymovy planovac a kapacity popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, tymleadi, vedeni.

## Doporuceny objekt v Huly
tymovy planovac + kapacitni report.

## Povinna pole / atributy
- osoba
- role
- projekt
- planovane hodiny
- dostupnost
- vytizeni

## Stavovy proces
- volno
- busy
- soukrome
- nepritomnost
- pretizeno

## Vazby na jine dokumenty a karty
- 22. Projektove rizeni v PRAUT
- 26. Planovani prace v osobnim planovaci
- 28. Casove odhady a casove reporty
- 76. Reporting projektu a kapacit

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
PM rozhoduje zmeny prirazeni a resi pretizeni.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- volna kapacita
- pretizeni
- konflikty
- urgentni neplanovana prace

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `12_izc0qWrhGhk.cs.txt` - Huly in Action - Inside look at how our team uses Huly for remote collaboration. Interni pouziti Huly pro remote spolupraci, zdroje, workflow a kazdodenni provoz.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 28. Casove odhady a casove reporty
**SOURCE FILE:** `../03_projects_tasks/28-casove-odhady-a-casove-reporty.md`

COPY START

# 28. Casove odhady a casove reporty

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/28-casove-odhady-a-casove-reporty.md`

## Ucel
Casove odhady a casove reporty popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, resitele, finance, vedeni.

## Doporuceny objekt v Huly
pole na ukolu + casovy report.

## Povinna pole / atributy
- odhad
- skutecny cas
- reporter
- datum
- billable
- projekt
- milnik

## Stavovy proces
- odhad chybi
- odhad zadan
- report pending
- reportovano
- schvaleno

## Vazby na jine dokumenty a karty
- 23. Prace s ukoly podukoly a prirazenim
- 26. Planovani prace v osobnim planovaci
- 27. Tymovy planovac a kapacity
- 77. Financni a casova efektivita zakazek

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
Uctovatelny cas a vyrazne odchylky schvaluje PM/finance.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- presnost odhadu
- billable ratio
- nevyplnene reporty
- nejdrazsi ukoly

## Zdrojove prepisy
- `15_VsM_VuYh2YA.cs.txt` - How to use time reports Huly Tutorials. Odhady, planovac, skutecny cas, automaticky a rucni time report.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 29. Predavani prace mezi rolemi
**SOURCE FILE:** `../03_projects_tasks/29-predavani-prace-mezi-rolemi.md`

COPY START

# 29. Predavani prace mezi rolemi

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/29-predavani-prace-mezi-rolemi.md`

## Ucel
Predavani prace mezi rolemi popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
obchod, PM, delivery, QA, support.

## Doporuceny objekt v Huly
karta Predani + checklist.

## Povinna pole / atributy
- from role
- to role
- projekt
- klient
- deadline
- rizika
- otevrene otazky

## Stavovy proces
- vyzadano
- pripravuje se
- ke kontrole
- prijato
- vraceno
- dokonceno

## Vazby na jine dokumenty a karty
- 20. Prechod z obchodu do realizace
- 21. Zalozeni nove zakazky
- 22. Projektove rizeni v PRAUT
- 30. Kontrola dokonceni zakazky
- 43. Zapisy ze schuzek

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
Prebirajici role musi predani explicitne prijmout.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- vracena predani
- chybejici informace
- rework po predani

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 30. Kontrola dokonceni zakazky
**SOURCE FILE:** `../03_projects_tasks/30-kontrola-dokonceni-zakazky.md`

COPY START

# 30. Kontrola dokonceni zakazky

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/30-kontrola-dokonceni-zakazky.md`

## Ucel
Kontrola dokonceni zakazky popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, QA, finance, vedeni.

## Doporuceny objekt v Huly
karta Uzaverka zakazky + closure checklist.

## Povinna pole / atributy
- projekt
- PM
- reviewer
- klientsky schvalovatel
- otevrene blokery
- fakturacni stav

## Stavovy proces
- pripraveno ke kontrole
- interni revize
- klientske schvaleni
- dokonceno
- archiv
- znovu otevreno

## Vazby na jine dokumenty a karty
- 21. Zalozeni nove zakazky
- 22. Projektove rizeni v PRAUT
- 25. Milniky projektu
- 28. Casove odhady a casove reporty
- 38. Klientska dokumentace a predavaci materialy
- 77. Financni a casova efektivita zakazek

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
Kvalitu, klientsky vystup a fakturacni pripravenost potvrzuje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- reopen rate
- doba uzaverky
- chybejici reporty
- odchylka rozpoctu

## Zdrojove prepisy
- `15_VsM_VuYh2YA.cs.txt` - How to use time reports Huly Tutorials. Odhady, planovac, skutecny cas, automaticky a rucni time report.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END
