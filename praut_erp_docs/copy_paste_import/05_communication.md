# Komunikace a spoluprace

**Huly space:** `05_communication`

V tomto souboru jsou dokumenty pro jeden Huly prostor. Kazdy dokument zaloz samostatne a zkopiruj jen obsah mezi `COPY START` a `COPY END`.

---

## HULY DOCUMENT TITLE: 39. Pravidla interni komunikace
**SOURCE FILE:** `../05_communication/39-pravidla-interni-komunikace.md`

COPY START

# 39. Pravidla interni komunikace

**Oblast:** Komunikace a spoluprace
**Soubor:** `05_communication/39-pravidla-interni-komunikace.md`

## Ucel
Pravidla interni komunikace popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym, PM, externiste.

## Doporuceny objekt v Huly
KB dokument + komunikacni pravidla.

## Povinna pole / atributy
- kanal
- ucel
- reakcni cas
- vlastnik
- vyjimky

## Stavovy proces
- navrh
- schvaleno
- aktivni
- revize

## Vazby na jine dokumenty a karty
- 3. Pravidla pouzivani ERP
- 40. Chat kanaly vlakna a prime zpravy
- 41. Inbox a notifikace
- 43. Zapisy ze schuzek
- 44. Pravidla pro asynchronni spolupraci
- 45. Eskalace problemu a vyjimek

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
Dulezita rozhodnuti nesmi zustat jen v chatu; musi byt zapsana do dokumentu/ticketu/karty.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- rozhodnuti bez vazby
- doba odpovedi
- eskalace kvuli komunikaci

## Zdrojove prepisy
- `04_p-1vKjn9gaU.cs.txt` - Huly in Action - How a successful CTO found the secret to team productivity with Huly. Adopce Huly v tymu, nahrada Notion/Slack/Linear/Jira, asynchronni spoluprace a GitHub workflow.
- `12_izc0qWrhGhk.cs.txt` - Huly in Action - Inside look at how our team uses Huly for remote collaboration. Interni pouziti Huly pro remote spolupraci, zdroje, workflow a kazdodenni provoz.
- `14_2R6FLlDDMLk.cs.txt` - Huly in Action - A conversation with Ryan Luttrell from Outside the Box. Agenturni/klientske pouziti Huly, projektova a marketingova spoluprace.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 40. Chat kanaly vlakna a prime zpravy
**SOURCE FILE:** `../05_communication/40-chat-kanaly-vlakna-a-prime-zpravy.md`

COPY START

# 40. Chat kanaly vlakna a prime zpravy

**Oblast:** Komunikace a spoluprace
**Soubor:** `05_communication/40-chat-kanaly-vlakna-a-prime-zpravy.md`

## Ucel
Chat kanaly vlakna a prime zpravy popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym.

## Doporuceny objekt v Huly
dokument + karty Komunikacni kanal.

## Povinna pole / atributy
- nazev kanalu
- ucel
- vlastnik
- viditelnost
- SLA
- navazane projekty

## Stavovy proces
- navrh
- aktivni
- sloucit
- archiv

## Vazby na jine dokumenty a karty
- 39. Pravidla interni komunikace
- 41. Inbox a notifikace
- 45. Eskalace problemu a vyjimek
- 52. Evidence zakaznickych pozadavku

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
Clovek rozhoduje, co je zavazny vystup z diskuze.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- chaty prevedene na tickety
- reakcni doba
- nezarazene diskuze

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `12_izc0qWrhGhk.cs.txt` - Huly in Action - Inside look at how our team uses Huly for remote collaboration. Interni pouziti Huly pro remote spolupraci, zdroje, workflow a kazdodenni provoz.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `27_I_ABiXcgMNw.cs.txt` - Chat meet with teammates on Huly. Slaby zdroj: chat/meet podle metadat/nazvu.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 41. Inbox a notifikace
**SOURCE FILE:** `../05_communication/41-inbox-a-notifikace.md`

COPY START

# 41. Inbox a notifikace

**Oblast:** Komunikace a spoluprace
**Soubor:** `05_communication/41-inbox-a-notifikace.md`

## Ucel
Inbox a notifikace popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym.

## Doporuceny objekt v Huly
KB dokument + onboarding checklist.

## Povinna pole / atributy
- typ notifikace
- priorita
- zdroj
- ocekavana reakce
- odpovedna osoba

## Stavovy proces
- nove
- precteno
- vyreseno
- odlozeno

## Vazby na jine dokumenty a karty
- 23. Prace s ukoly podukoly a prirazenim
- 26. Planovani prace v osobnim planovaci
- 34. Akcni polozky v dokumentech
- 40. Chat kanaly vlakna a prime zpravy
- 65. GitHub integrace
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
Kazdy uzivatel odpovida za denni vycisteni inboxu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- notifikace starsi nez 24h
- zmeskane zmineni
- doba od prirazeni k planovani

## Zdrojove prepisy
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `13_1_bb3N2UT04.cs.txt` - Quick Tip - Add collaborators to issues. Spolupracovnici na issues a notifikace pri zmenach.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 42. Virtualni kancelar a schuzky
**SOURCE FILE:** `../05_communication/42-virtualni-kancelar-a-schuzky.md`

COPY START

# 42. Virtualni kancelar a schuzky

**Oblast:** Komunikace a spoluprace
**Soubor:** `05_communication/42-virtualni-kancelar-a-schuzky.md`

## Ucel
Virtualni kancelar a schuzky popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym, remote tym, PM.

## Doporuceny objekt v Huly
KB dokument + karta Schuzka.

## Povinna pole / atributy
- ucel schuzky
- vlastnik
- ucastnici
- frekvence
- mistnost
- agenda

## Stavovy proces
- navrh
- naplanovana
- probehla
- zapis potvrzen

## Vazby na jine dokumenty a karty
- 27. Tymovy planovac a kapacity
- 39. Pravidla interni komunikace
- 43. Zapisy ze schuzek
- 59. AI asistent v ERP

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
AI prepisy meetingu pouzivat jen podle pravidel soukromi a opravneni.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- schuzky bez zapisu
- nenaplanovana preruseni
- pomer rychlych hovoru

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 43. Zapisy ze schuzek
**SOURCE FILE:** `../05_communication/43-zapisy-ze-schuzek.md`

COPY START

# 43. Zapisy ze schuzek

**Oblast:** Komunikace a spoluprace
**Soubor:** `05_communication/43-zapisy-ze-schuzek.md`

## Ucel
Zapisy ze schuzek popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
vedouci schuzek, PM, tym.

## Doporuceny objekt v Huly
karta Zapis ze schuzky + sablona.

## Povinna pole / atributy
- datum
- vlastnik
- ucastnici
- projekt
- rozhodnuti
- akcni polozky
- citlivost

## Stavovy proces
- draft
- ke kontrole
- potvrzeno
- akcni kroky otevrene
- uzavreno

## Vazby na jine dokumenty a karty
- 18. Evidence obchodnich schuzek
- 34. Akcni polozky v dokumentech
- 42. Virtualni kancelar a schuzky
- 45. Eskalace problemu a vyjimek
- 59. AI asistent v ERP

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
Vlastnik schuzky potvrzuje rozhodnuti a prirazeni.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- zapisy do 24h
- splnene akcni polozky
- neuzavrena rozhodnuti

## Zdrojove prepisy
- `07_1c7wi_RMKJY.cs.txt` - Meet Hulia Huly s first AI assistant. AI asistent Julia: prepisy meetingu, shrnuti, akcni polozky, dokumenty, soukromi a limity.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END

---

## HULY DOCUMENT TITLE: 44. Pravidla pro asynchronni spolupraci
**SOURCE FILE:** `../05_communication/44-pravidla-pro-asynchronni-spolupraci.md`

COPY START

# 44. Pravidla pro asynchronni spolupraci

**Oblast:** Komunikace a spoluprace
**Soubor:** `05_communication/44-pravidla-pro-asynchronni-spolupraci.md`

## Ucel
Pravidla pro asynchronni spolupraci popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
remote tym, PM, vedeni.

## Doporuceny objekt v Huly
KB dokument / pracovni pravidlo.

## Povinna pole / atributy
- typ prace
- vystup
- deadline
- priorita
- vlastnik
- vazba na projekt

## Stavovy proces
- aktivni
- vyjimka
- eskalace

## Vazby na jine dokumenty a karty
- 23. Prace s ukoly podukoly a prirazenim
- 26. Planovani prace v osobnim planovaci
- 39. Pravidla interni komunikace
- 40. Chat kanaly vlakna a prime zpravy
- 41. Inbox a notifikace
- 45. Eskalace problemu a vyjimek

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
Vyjimky, konflikty a nejasne priority resi clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- ukoly bez vlastnika
- doba od prirazeni k planovani
- zbytecne schuzky

## Zdrojove prepisy
- `04_p-1vKjn9gaU.cs.txt` - Huly in Action - How a successful CTO found the secret to team productivity with Huly. Adopce Huly v tymu, nahrada Notion/Slack/Linear/Jira, asynchronni spoluprace a GitHub workflow.
- `12_izc0qWrhGhk.cs.txt` - Huly in Action - Inside look at how our team uses Huly for remote collaboration. Interni pouziti Huly pro remote spolupraci, zdroje, workflow a kazdodenni provoz.
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

## HULY DOCUMENT TITLE: 45. Eskalace problemu a vyjimek
**SOURCE FILE:** `../05_communication/45-eskalace-problemu-a-vyjimek.md`

COPY START

# 45. Eskalace problemu a vyjimek

**Oblast:** Komunikace a spoluprace
**Soubor:** `05_communication/45-eskalace-problemu-a-vyjimek.md`

## Ucel
Eskalace problemu a vyjimek popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym, PM, obchod, podpora, vedeni.

## Doporuceny objekt v Huly
pravidlo + karta/ticket Eskalace.

## Povinna pole / atributy
- typ problemu
- priorita
- dopad
- klient
- vlastnik
- schvalovatel
- deadline reakce

## Stavovy proces
- nahlaseno
- triage
- eskalovano
- rozhodnuto
- uzavreno

## Vazby na jine dokumenty a karty
- 5. Role odpovednosti a opravneni
- 9. Auditni stopa a evidence rozhodnuti
- 39. Pravidla interni komunikace
- 41. Inbox a notifikace
- 43. Zapisy ze schuzek
- 54. Eskalace zakaznickych problemu
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
Klientskou odpoved, cenu, termin a pravne citlivy krok schvaluje clovek.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- cas do prvni reakce
- cas do rozhodnuti
- opakovane eskalace

## Zdrojove prepisy
- `13_1_bb3N2UT04.cs.txt` - Quick Tip - Add collaborators to issues. Spolupracovnici na issues a notifikace pri zmenach.
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.

COPY END
