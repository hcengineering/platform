# Automatizace, AI a integrace

**Huly space:** `07_automation_ai_integrations`

V tomto souboru jsou dokumenty pro jeden Huly prostor. Kazdy dokument zaloz samostatne a zkopiruj jen obsah mezi `COPY START` a `COPY END`.

---

## HULY DOCUMENT TITLE: 57. Katalog automatizaci PRAUT
**SOURCE FILE:** `../07_automation_ai_integrations/57-katalog-automatizaci-praut.md`

COPY START

# 57. Katalog automatizaci PRAUT

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/57-katalog-automatizaci-praut.md`

## Ucel
Katalog automatizaci PRAUT popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
provozni manazer, admin, vlastnici procesu.

## Doporuceny objekt v Huly
dokument + karty Automatizace.

## Povinna pole / atributy
- ID
- nazev
- modul
- spoustec
- vstup
- akce
- vystup
- autonomie
- vlastnik
- fallback

## Stavovy proces
- navrh
- schvaleno
- aktivni
- pozastaveno
- vyrazeno

## Vazby na jine dokumenty a karty
- 58. Pravidla pro navrh automatizaci
- 61. Schvalovaci matice pro cloveka
- 63. Fallback postupy pri chybe systemu
- 64. Prehled integraci
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
Spusteni automatizace schvaluje vlastnik procesu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- aktivni automatizace
- uspora casu
- vyjimky
- chybovost

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 58. Pravidla pro navrh automatizaci
**SOURCE FILE:** `../07_automation_ai_integrations/58-pravidla-pro-navrh-automatizaci.md`

COPY START

# 58. Pravidla pro navrh automatizaci

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/58-pravidla-pro-navrh-automatizaci.md`

## Ucel
Pravidla pro navrh automatizaci popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
navrhovatele procesu, admin, vedeni.

## Doporuceny objekt v Huly
metodicky dokument.

## Povinna pole / atributy
- problem
- prinos
- typ rozhodnuti
- riziko
- data
- schvaleni
- audit

## Stavovy proces
- navrh
- posouzeni
- schvaleno
- zamitnuto

## Vazby na jine dokumenty a karty
- 57. Katalog automatizaci PRAUT
- 61. Schvalovaci matice pro cloveka
- 63. Fallback postupy pri chybe systemu
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
Hodnotu, riziko a odpovednost potvrzuje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- schvalene navrhy
- zamitnute kvuli riziku
- uspora po zavedeni

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 59. AI asistent v ERP
**SOURCE FILE:** `../07_automation_ai_integrations/59-ai-asistent-v-erp.md`

COPY START

# 59. AI asistent v ERP

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/59-ai-asistent-v-erp.md`

## Ucel
AI asistent v ERP popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym, PM, obchod, podpora, vedeni.

## Doporuceny objekt v Huly
uzivatelsky dokument + karta AI asistent.

## Povinna pole / atributy
- zdroj dat
- typ vystupu
- kontrolor
- autonomie
- citlivost
- stav schvaleni

## Stavovy proces
- povoleno
- povoleno se schvalenim
- zakazano
- pozastaveno

## Vazby na jine dokumenty a karty
- 42. Virtualni kancelar a schuzky
- 43. Zapisy ze schuzek
- 60. AI funkce a jejich limity
- 61. Schvalovaci matice pro cloveka
- 62. Kontrola vystupu AI
- 63. Fallback postupy pri chybe systemu

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
Ukoly a dokumenty s dopadem potvrzuje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- pouzita shrnuti
- prijate akcni polozky
- opravy AI vystupu

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 60. AI funkce a jejich limity
**SOURCE FILE:** `../07_automation_ai_integrations/60-ai-funkce-a-jejich-limity.md`

COPY START

# 60. AI funkce a jejich limity

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/60-ai-funkce-a-jejich-limity.md`

## Ucel
AI funkce a jejich limity popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, admin, vlastnici procesu, uzivatele AI.

## Doporuceny objekt v Huly
pravidlovy dokument.

## Povinna pole / atributy
- AI funkce
- vstup
- vystup
- riziko
- autonomie
- kontrolor
- fallback

## Stavovy proces
- povoleno
- podminene
- zakazano
- revize

## Vazby na jine dokumenty a karty
- 10. Bezpecnost dat a prace s citlivymi informacemi
- 59. AI asistent v ERP
- 61. Schvalovaci matice pro cloveka
- 62. Kontrola vystupu AI
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
AI je poradce; cenove, pravni, reputacni a strategicke vystupy schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- pouziti podle typu
- chybovost
- eskalace
- zamitnute vystupy

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `08_-MTR7fIsrig.cs.txt` - Beyond the Cloud - How Huly is Building the First Blockchain-Powered Global Collaboration Network. Architektura spoluprace, cloud/self-hosting, bezpecnost, globalni sit a strategicke riziko.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 61. Schvalovaci matice pro cloveka
**SOURCE FILE:** `../07_automation_ai_integrations/61-schvalovaci-matice-pro-cloveka.md`

COPY START

# 61. Schvalovaci matice pro cloveka

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/61-schvalovaci-matice-pro-cloveka.md`

## Ucel
Schvalovaci matice pro cloveka popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, admin, vlastnici procesu, PM.

## Doporuceny objekt v Huly
dokument + tabulka/matice roli.

## Povinna pole / atributy
- rozhodnuti
- riziko
- schvalovatel
- zastupce
- SLA
- povinny komentar

## Stavovy proces
- navrh
- ceka na schvaleni
- schvaleno
- vyjimka

## Vazby na jine dokumenty a karty
- 5. Role odpovednosti a opravneni
- 17. Schvalovani cen a obchodnich podminek
- 45. Eskalace problemu a vyjimek
- 57. Katalog automatizaci PRAUT
- 58. Pravidla pro navrh automatizaci
- 60. AI funkce a jejich limity
- 68. Sprava zmenovych pozadavku
- 69. Incidenty a provozni chyby

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
Schvaleni je vzdy lidske; system jen zaklada ukol.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- doba schvaleni
- vyjimky
- neschvalene akce

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 62. Kontrola vystupu AI
**SOURCE FILE:** `../07_automation_ai_integrations/62-kontrola-vystupu-ai.md`

COPY START

# 62. Kontrola vystupu AI

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/62-kontrola-vystupu-ai.md`

## Ucel
Kontrola vystupu AI popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
kazdy uzivatel AI.

## Doporuceny objekt v Huly
checklistovy dokument + sablona kontroly.

## Povinna pole / atributy
- AI vystup
- zdroj
- kontrolor
- oprava
- riziko
- schvaleno

## Stavovy proces
- ke kontrole
- schvaleno
- opraveno
- odmitnuto

## Vazby na jine dokumenty a karty
- 59. AI asistent v ERP
- 60. AI funkce a jejich limity
- 61. Schvalovaci matice pro cloveka
- 63. Fallback postupy pri chybe systemu
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
Clovek odpovida za finalni pouziti AI vystupu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- pocet kontrol
- pocet oprav
- typy chyb
- pomer schvalenych vystupu

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 63. Fallback postupy pri chybe systemu
**SOURCE FILE:** `../07_automation_ai_integrations/63-fallback-postupy-pri-chybe-systemu.md`

COPY START

# 63. Fallback postupy pri chybe systemu

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/63-fallback-postupy-pri-chybe-systemu.md`

## Ucel
Fallback postupy pri chybe systemu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
admin, technicky tym, vlastnici procesu, podpora.

## Doporuceny objekt v Huly
runbook + incidentove sablony.

## Povinna pole / atributy
- chyba
- dopad
- priorita
- vlastnik
- workaround
- rollback
- cas obnovy

## Stavovy proces
- detekovano
- triage
- workaround
- obnova
- postmortem
- uzavreno

## Vazby na jine dokumenty a karty
- 57. Katalog automatizaci PRAUT
- 58. Pravidla pro navrh automatizaci
- 61. Schvalovaci matice pro cloveka
- 64. Prehled integraci
- 68. Sprava zmenovych pozadavku
- 69. Incidenty a provozni chyby

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
Zasah a rollback potvrzuje odpovedny clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- MTTA
- MTTR
- opakovane chyby
- rucni workaroundy

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

## HULY DOCUMENT TITLE: 64. Prehled integraci
**SOURCE FILE:** `../07_automation_ai_integrations/64-prehled-integraci.md`

COPY START

# 64. Prehled integraci

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/64-prehled-integraci.md`

## Ucel
Prehled integraci popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
admin, technicky tym, vedeni.

## Doporuceny objekt v Huly
dokument + karty Integrace.

## Povinna pole / atributy
- system
- ucel
- data
- smer synchronizace
- vlastnik
- opravneni
- riziko
- SLA

## Stavovy proces
- navrh
- test
- aktivni
- pozastaveno
- vyrazeno

## Vazby na jine dokumenty a karty
- 10. Bezpecnost dat a prace s citlivymi informacemi
- 57. Katalog automatizaci PRAUT
- 63. Fallback postupy pri chybe systemu
- 65. GitHub integrace
- 70. Administrace ERP
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
Opravneni a datove toky integraci schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- dostupnost
- sync chyby
- stari posledni synchronizace

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

## HULY DOCUMENT TITLE: 65. GitHub integrace
**SOURCE FILE:** `../07_automation_ai_integrations/65-github-integrace.md`

COPY START

# 65. GitHub integrace

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/65-github-integrace.md`

## Ucel
GitHub integrace popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vyvojari, PM, QA, admin.

## Doporuceny objekt v Huly
technicko-procesni dokument.

## Povinna pole / atributy
- repo
- Huly projekt
- issue typ
- PR stav
- reviewer
- assignee
- diff
- merge time

## Stavovy proces
- autorizace
- sync aktivni
- under review
- ready to merge
- merged
- cancelled

## Vazby na jine dokumenty a karty
- 18. Evidence obchodnich schuzek
- 23. Prace s ukoly podukoly a prirazenim
- 24. Stavove procesy ukolu
- 64. Prehled integraci
- 66. Test management
- 67. Sablony ukolu a tiketu
- 68. Sprava zmenovych pozadavku
- 69. Incidenty a provozni chyby

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
Review, merge a rizikove zmeny schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- sync issue/PR
- doba review
- PR bez review
- sync chyby

## Zdrojove prepisy
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `19_osTXB_KMPNk.cs.txt` - Sync your Huly projects with GitHub. Slaby zdroj: synchronizace Huly projektu s GitHubem podle metadat/nazvu.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 66. Test management
**SOURCE FILE:** `../07_automation_ai_integrations/66-test-management.md`

COPY START

# 66. Test management

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/66-test-management.md`

## Ucel
Test management popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
QA, vyvojari, PM.

## Doporuceny objekt v Huly
modul Test Management + karty Test case, Test run, Defect.

## Povinna pole / atributy
- test ID
- scenar
- kroky
- ocekavany vysledek
- stav
- release
- tester

## Stavovy proces
- draft
- ready
- running
- passed
- failed
- blocked

## Vazby na jine dokumenty a karty
- 65. GitHub integrace
- 67. Sablony ukolu a tiketu
- 68. Sprava zmenovych pozadavku
- 69. Incidenty a provozni chyby
- 74. KPI a metriky uspechu

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
AI muze navrhnout testy; tester potvrzuje validitu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- pass rate
- regrese
- pokryti kritickych procesu
- cas opravy defektu

## Zdrojove prepisy
- `06_-p39H4jOSjI.cs.txt` - Create organize and run your tests with Huly Open source test management. Slaby zdroj: test management podle metadat/nazvu, textovy prepis je neucelny.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `22_EVmZr1Ybi8c.cs.txt` - Customize your Huly task tracker with task types templates. Slaby zdroj: custom task types/templates podle metadat/nazvu.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 67. Sablony ukolu a tiketu
**SOURCE FILE:** `../07_automation_ai_integrations/67-sablony-ukolu-a-tiketu.md`

COPY START

# 67. Sablony ukolu a tiketu

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/67-sablony-ukolu-a-tiketu.md`

## Ucel
Sablony ukolu a tiketu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym.

## Doporuceny objekt v Huly
sada Huly sablon pro task tracker.

## Povinna pole / atributy
- typ
- popis
- dopad
- priorita
- dukazy
- ocekavany vysledek
- vlastnik

## Stavovy proces
- draft
- schvaleno
- aktivni
- zastarale

## Vazby na jine dokumenty a karty
- 23. Prace s ukoly podukoly a prirazenim
- 52. Evidence zakaznickych pozadavku
- 57. Katalog automatizaci PRAUT
- 65. GitHub integrace
- 66. Test management
- 68. Sprava zmenovych pozadavku
- 69. Incidenty a provozni chyby

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
Clovek potvrzuje zadani a prioritu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- uplnost tiketu
- vracena zadani
- doba triage
- pouziti sablon

## Zdrojove prepisy
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `22_EVmZr1Ybi8c.cs.txt` - Customize your Huly task tracker with task types templates. Slaby zdroj: custom task types/templates podle metadat/nazvu.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 68. Sprava zmenovych pozadavku
**SOURCE FILE:** `../07_automation_ai_integrations/68-sprava-zmenovych-pozadavku.md`

COPY START

# 68. Sprava zmenovych pozadavku

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/68-sprava-zmenovych-pozadavku.md`

## Ucel
Sprava zmenovych pozadavku popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, admin, technicky tym, vlastnici procesu.

## Doporuceny objekt v Huly
procesni dokument + karty Change request.

## Povinna pole / atributy
- zmena
- duvod
- dopad
- riziko
- vlastnik
- schvalovatel
- PR/test/incident

## Stavovy proces
- navrh
- analyza
- schvaleno
- implementace
- test
- nasazeno
- rollback

## Vazby na jine dokumenty a karty
- 57. Katalog automatizaci PRAUT
- 61. Schvalovaci matice pro cloveka
- 65. GitHub integrace
- 66. Test management
- 69. Incidenty a provozni chyby
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
Dopad a nasazeni schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- lead time zmeny
- rollbacky
- zmeny bez testu
- urgentni zmeny

## Zdrojove prepisy
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 69. Incidenty a provozni chyby
**SOURCE FILE:** `../07_automation_ai_integrations/69-incidenty-a-provozni-chyby.md`

COPY START

# 69. Incidenty a provozni chyby

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/69-incidenty-a-provozni-chyby.md`

## Ucel
Incidenty a provozni chyby popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
admin, technicky tym, podpora, vedeni.

## Doporuceny objekt v Huly
incidentovy projekt + runbook.

## Povinna pole / atributy
- incident ID
- zavaznost
- dopad
- system
- vlastnik
- cas detekce
- workaround
- pricina

## Stavovy proces
- detekovano
- triage
- reseni
- obnova
- postmortem
- uzavreno

## Vazby na jine dokumenty a karty
- 45. Eskalace problemu a vyjimek
- 52. Evidence zakaznickych pozadavku
- 63. Fallback postupy pri chybe systemu
- 64. Prehled integraci
- 65. GitHub integrace
- 66. Test management
- 68. Sprava zmenovych pozadavku
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
Zakaznickou komunikaci a obnovu potvrzuje odpovedny clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- MTTA
- MTTR
- incidenty podle priciny
- opakovane incidenty

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

## HULY DOCUMENT TITLE: 70. Administrace ERP
**SOURCE FILE:** `../07_automation_ai_integrations/70-administrace-erp.md`

COPY START

# 70. Administrace ERP

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/70-administrace-erp.md`

## Ucel
Administrace ERP popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
ERP admin, vedeni, tymovi spravci.

## Doporuceny objekt v Huly
administratorsky manual.

## Povinna pole / atributy
- role
- pristup
- projekt
- vlastnik
- sablona
- workflow
- integrace
- datum kontroly

## Stavovy proces
- standard
- zmena
- ke schvaleni
- provedeno
- audit

## Vazby na jine dokumenty a karty
- 2. Struktura pracovniho prostoru PRAUT
- 5. Role odpovednosti a opravneni
- 64. Prehled integraci
- 65. GitHub integrace
- 67. Sablony ukolu a tiketu
- 71. Onboarding noveho uzivatele
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
Zmeny opravneni a integraci schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- aktivni uzivatele
- neaktivni ucty
- zmeny opravneni
- auditni nalezy

## Zdrojove prepisy
- `08_-MTR7fIsrig.cs.txt` - Beyond the Cloud - How Huly is Building the First Blockchain-Powered Global Collaboration Network. Architektura spoluprace, cloud/self-hosting, bezpecnost, globalni sit a strategicke riziko.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 71. Onboarding noveho uzivatele
**SOURCE FILE:** `../07_automation_ai_integrations/71-onboarding-noveho-uzivatele.md`

COPY START

# 71. Onboarding noveho uzivatele

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/71-onboarding-noveho-uzivatele.md`

## Ucel
Onboarding noveho uzivatele popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
novacci, manazeri, admin, HR.

## Doporuceny objekt v Huly
checklist + onboarding projekt/ticket sablona.

## Povinna pole / atributy
- jmeno
- role
- mentor
- datum nastupu
- pristupy
- tymy
- stav onboardingu

## Stavovy proces
- pozvan
- pristupy zalozeny
- skoleni
- prvni ukoly
- dokonceno

## Vazby na jine dokumenty a karty
- 1. Uvod do ERP PRAUT
- 3. Pravidla pouzivani ERP
- 5. Role odpovednosti a opravneni
- 39. Pravidla interni komunikace
- 41. Inbox a notifikace
- 72. Skoleni tymu

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
Pristupy a dokonceni onboardingu potvrzuje mentor/admin.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- cas do prvniho ukolu
- splneni checklistu
- chyby v opravnenich

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 72. Skoleni tymu
**SOURCE FILE:** `../07_automation_ai_integrations/72-skoleni-tymu.md`

COPY START

# 72. Skoleni tymu

**Oblast:** Automatizace, AI a integrace
**Soubor:** `07_automation_ai_integrations/72-skoleni-tymu.md`

## Ucel
Skoleni tymu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym, novacci, vedouci tymu.

## Doporuceny objekt v Huly
dokument osnovy + karty Skolici modul.

## Povinna pole / atributy
- modul
- cilova role
- uroven
- povinne
- garant
- revize
- stav absolvovani

## Stavovy proces
- navrh
- aktivni
- absolvovano
- revize

## Vazby na jine dokumenty a karty
- 3. Pravidla pouzivani ERP
- 5. Role odpovednosti a opravneni
- 39. Pravidla interni komunikace
- 71. Onboarding noveho uzivatele

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
Vedouci potvrzuje absolvovani a schopnost samostatne pracovat.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- dokonceni skoleni
- chyby po skoleni
- opakovane dotazy
- adopce planovace

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END
