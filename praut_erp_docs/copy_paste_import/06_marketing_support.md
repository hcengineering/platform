# Marketing a zakaznicka pece

**Huly space:** `06_marketing_support`

V tomto souboru jsou dokumenty pro jeden Huly prostor. Kazdy dokument zaloz samostatne a zkopiruj jen obsah mezi `COPY START` a `COPY END`.

---

## HULY DOCUMENT TITLE: 46. Marketingovy plan PRAUT
**SOURCE FILE:** `../06_marketing_support/46-marketingovy-plan-praut.md`

COPY START

# 46. Marketingovy plan PRAUT

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/46-marketingovy-plan-praut.md`

## Ucel
Marketingovy plan PRAUT popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
marketing, vedeni, obchod.

## Doporuceny objekt v Huly
Marketingovy plan + vazby na kampane.

## Povinna pole / atributy
- obdobi
- vlastnik
- segmenty
- kanaly
- KPI
- rozpocet

## Stavovy proces
- draft
- ke schvaleni
- aktivni
- vyhodnoceno

## Vazby na jine dokumenty a karty
- 47. Sprava kampani
- 48. Obsahovy kalendar
- 51. Vyhodnoceni kampani
- 75. Reporting obchodnich aktivit

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
Strategii, positioning a rozpocet schvaluje vedeni.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- leady podle kanalu
- CAC
- konverze
- MQL/SQL

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 47. Sprava kampani
**SOURCE FILE:** `../06_marketing_support/47-sprava-kampani.md`

COPY START

# 47. Sprava kampani

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/47-sprava-kampani.md`

## Ucel
Sprava kampani popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
marketing, obchod, vedeni.

## Doporuceny objekt v Huly
karta Kampan.

## Povinna pole / atributy
- nazev
- popis
- start
- konec
- platformy
- vlastnik
- rozpocet
- stav

## Stavovy proces
- navrh
- priprava
- aktivni
- vyhodnoceni
- uzavreno

## Vazby na jine dokumenty a karty
- 12. Evidence leadu a poptavek
- 46. Marketingovy plan PRAUT
- 48. Obsahovy kalendar
- 49. Tvorba a schvalovani obsahu
- 50. Evidence marketingovych vystupu
- 51. Vyhodnoceni kampani

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
Rozpocet, claimy a publikaci schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- leady
- konverze
- naklady
- engagement
- pipeline contribution

## Zdrojove prepisy
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 48. Obsahovy kalendar
**SOURCE FILE:** `../06_marketing_support/48-obsahovy-kalendar.md`

COPY START

# 48. Obsahovy kalendar

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/48-obsahovy-kalendar.md`

## Ucel
Obsahovy kalendar popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
marketing, obchod.

## Doporuceny objekt v Huly
karty Obsahova polozka + planovac.

## Povinna pole / atributy
- tema
- format
- platforma
- autor
- termin
- stav
- kampan

## Stavovy proces
- napad
- draft
- kontrola
- schvaleno
- publikovano
- archiv

## Vazby na jine dokumenty a karty
- 47. Sprava kampani
- 49. Tvorba a schvalovani obsahu
- 50. Evidence marketingovych vystupu

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
Publikaci a citlive claimy schvaluje vlastnik obsahu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- publikace vcas
- polozky podle kanalu
- obsah bez kampane

## Zdrojove prepisy
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 49. Tvorba a schvalovani obsahu
**SOURCE FILE:** `../06_marketing_support/49-tvorba-a-schvalovani-obsahu.md`

COPY START

# 49. Tvorba a schvalovani obsahu

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/49-tvorba-a-schvalovani-obsahu.md`

## Ucel
Tvorba a schvalovani obsahu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
marketing, vedeni, obchodni garant.

## Doporuceny objekt v Huly
procesni dokument + workflow Obsahova polozka.

## Povinna pole / atributy
- autor
- reviewer
- schvalovatel
- stav
- termin
- riziko
- verze

## Stavovy proces
- navrh
- draft
- review
- upravy
- schvaleno
- publikovano

## Vazby na jine dokumenty a karty
- 19. Sablony obchodni komunikace
- 47. Sprava kampani
- 48. Obsahovy kalendar
- 50. Evidence marketingovych vystupu

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
Finalni verzi pred publikaci schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- doba schvaleni
- kola uprav
- chyby po publikaci

## Zdrojove prepisy
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 50. Evidence marketingovych vystupu
**SOURCE FILE:** `../06_marketing_support/50-evidence-marketingovych-vystupu.md`

COPY START

# 50. Evidence marketingovych vystupu

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/50-evidence-marketingovych-vystupu.md`

## Ucel
Evidence marketingovych vystupu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
marketing, obchod, podpora.

## Doporuceny objekt v Huly
karta Obsahova polozka / Marketingovy asset.

## Povinna pole / atributy
- format
- platforma
- autor
- publikovano
- URL
- priloha
- licence
- stav

## Stavovy proces
- draft
- schvaleno
- publikovano
- zastarale
- archiv

## Vazby na jine dokumenty a karty
- 47. Sprava kampani
- 48. Obsahovy kalendar
- 49. Tvorba a schvalovani obsahu
- 51. Vyhodnoceni kampani
- 35. Prace se soubory a Drive

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
Publikovanou finalni verzi potvrzuje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- pocet vystupu
- opakovane pouziti assetu
- chybejici metadata

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 51. Vyhodnoceni kampani
**SOURCE FILE:** `../06_marketing_support/51-vyhodnoceni-kampani.md`

COPY START

# 51. Vyhodnoceni kampani

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/51-vyhodnoceni-kampani.md`

## Ucel
Vyhodnoceni kampani popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
marketing, obchod, vedeni.

## Doporuceny objekt v Huly
dokument Vyhodnoceni kampane + vazba na Kampan.

## Povinna pole / atributy
- obdobi
- naklady
- leady
- MQL
- SQL
- pipeline
- konverze
- doporuceni

## Stavovy proces
- draft
- ke kontrole
- schvaleno
- akce vytvoreny

## Vazby na jine dokumenty a karty
- 46. Marketingovy plan PRAUT
- 47. Sprava kampani
- 50. Evidence marketingovych vystupu
- 75. Reporting obchodnich aktivit

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
Interpretaci a rozpoctova doporuceni schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- ROI/ROAS
- CPL
- pipeline contribution
- win rate z kampane

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 52. Evidence zakaznickych pozadavku
**SOURCE FILE:** `../06_marketing_support/52-evidence-zakaznickych-pozadavku.md`

COPY START

# 52. Evidence zakaznickych pozadavku

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/52-evidence-zakaznickych-pozadavku.md`

## Ucel
Evidence zakaznickych pozadavku popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
podpora, delivery, obchod.

## Doporuceny objekt v Huly
issue/karta Zakaznicky pozadavek.

## Povinna pole / atributy
- klient
- kontakt
- typ pozadavku
- priorita
- stav
- vlastnik
- termin
- dopad

## Stavovy proces
- novy
- triage
- reseni
- ceka na klienta
- vyreseno
- uzavreno

## Vazby na jine dokumenty a karty
- 11. Sprava kontaktu a firem
- 53. Helpdesk proces
- 54. Eskalace zakaznickych problemu
- 55. Znalostni baze pro zakaznickou podporu
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
Prioritu a citlivou odpoved kontroluje odpovedny clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- SLA
- cas reakce
- cas vyreseni
- opakovane problemy

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 53. Helpdesk proces
**SOURCE FILE:** `../06_marketing_support/53-helpdesk-proces.md`

COPY START

# 53. Helpdesk proces

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/53-helpdesk-proces.md`

## Ucel
Helpdesk proces popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
podpora, delivery, technicky tym.

## Doporuceny objekt v Huly
procesni dokument + tracker workflow.

## Povinna pole / atributy
- stav
- priorita
- SLA
- resitel
- klient
- kategorie
- eskalace

## Stavovy proces
- prijato
- triage
- prirazeno
- reseni
- revize
- uzavreno

## Vazby na jine dokumenty a karty
- 52. Evidence zakaznickych pozadavku
- 54. Eskalace zakaznickych problemu
- 55. Znalostni baze pro zakaznickou podporu
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
Odpovedi s reputacnim nebo obchodnim dopadem schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- first response time
- resolution time
- SLA compliance
- reopened tickets

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 54. Eskalace zakaznickych problemu
**SOURCE FILE:** `../06_marketing_support/54-eskalace-zakaznickych-problemu.md`

COPY START

# 54. Eskalace zakaznickych problemu

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/54-eskalace-zakaznickych-problemu.md`

## Ucel
Eskalace zakaznickych problemu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
podpora, delivery lead, vedeni, obchod.

## Doporuceny objekt v Huly
pravidlo + karta Eskalace.

## Povinna pole / atributy
- zavaznost
- dopad
- riziko
- vlastnik
- deadline
- stav
- rozhodnuti

## Stavovy proces
- nahlaseno
- prevzato
- reseni
- rozhodnuti
- komunikovano
- uzavreno

## Vazby na jine dokumenty a karty
- 45. Eskalace problemu a vyjimek
- 52. Evidence zakaznickych pozadavku
- 53. Helpdesk proces
- 56. Mereni spokojenosti zakazniku
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
Kompenzace, zavazky a citliva komunikace jsou lidske rozhodnuti.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- cas do prevzeti
- cas do vyreseni
- opakovane eskalace

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 55. Znalostni baze pro zakaznickou podporu
**SOURCE FILE:** `../06_marketing_support/55-znalostni-baze-pro-zakaznickou-podporu.md`

COPY START

# 55. Znalostni baze pro zakaznickou podporu

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/55-znalostni-baze-pro-zakaznickou-podporu.md`

## Ucel
Znalostni baze pro zakaznickou podporu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
podpora, delivery, obchod.

## Doporuceny objekt v Huly
karta Znalostni clanek + dokument.

## Povinna pole / atributy
- tema
- kategorie
- stav
- vlastnik
- posledni revize
- citlivost
- souvisejici pozadavky

## Stavovy proces
- draft
- overeno
- publikovano
- zastarale
- archiv

## Vazby na jine dokumenty a karty
- 19. Sablony obchodni komunikace
- 31. Firemni znalostni baze
- 52. Evidence zakaznickych pozadavku
- 53. Helpdesk proces

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
AI muze navrhnout clanek; clovek overuje spravnost.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- pouziti clanku
- opakovane dotazy
- clanky po revizi

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 56. Mereni spokojenosti zakazniku
**SOURCE FILE:** `../06_marketing_support/56-mereni-spokojenosti-zakazniku.md`

COPY START

# 56. Mereni spokojenosti zakazniku

**Oblast:** Marketing a zakaznicka pece
**Soubor:** `06_marketing_support/56-mereni-spokojenosti-zakazniku.md`

## Ucel
Mereni spokojenosti zakazniku popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedeni, account management, podpora.

## Doporuceny objekt v Huly
metodika + karta Zpetna vazba/NPS.

## Povinna pole / atributy
- klient
- kontakt
- skore
- komentar
- duvod
- riziko
- nasledna akce

## Stavovy proces
- vyzadano
- obdrzeno
- vyhodnoceno
- akce otevrena
- uzavreno

## Vazby na jine dokumenty a karty
- 11. Sprava kontaktu a firem
- 52. Evidence zakaznickych pozadavku
- 54. Eskalace zakaznickych problemu
- 75. Reporting obchodnich aktivit

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
Negativni nebo citlivou zpetnou vazbu resi clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- NPS/CSAT
- response rate
- rizikovi klienti
- cas reakce

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END
