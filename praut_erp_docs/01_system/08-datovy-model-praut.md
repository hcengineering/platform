# 8. Datovy model PRAUT

**Oblast:** Zaklad systemu
**Soubor:** `01_system/08-datovy-model-praut.md`

## Ucel
Datovy model PRAUT popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
admin, architekt systemu, vedouci oblasti.

## Doporuceny objekt v Huly
KB dokument + karty Typ objektu, Atribut, Vztah.

## Povinna pole / atributy
- typ
- nadrazeny typ
- povinna pole
- povolene vztahy
- citlivost

## Stavovy proces
- navrh
- schvaleno
- aktivni
- deprecated

## Vazby na jine dokumenty a karty
- 6. Kdy pouzit dokument a kdy kartu
- 7. Standard nazvu stitku atributu a vztahu
- 9. Auditni stopa a evidence rozhodnuti
- 10. Bezpecnost dat a prace s citlivymi informacemi
- 57. Katalog automatizaci PRAUT
- 64. Prehled integraci

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
Zmeny modelu schvaluje admin a vlastnik dotcene oblasti.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- typy bez vlastnika
- nepouzivane atributy
- vazby bez definice

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `02_XVdIMinYV0k.cs.txt` - How to use Cards for knowledge management Huly Tutorials. Prakticke nastaveni Cards pro znalostni management, kampane, obsah, typy, enumy, reference a vazby.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.
