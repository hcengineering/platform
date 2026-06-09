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
