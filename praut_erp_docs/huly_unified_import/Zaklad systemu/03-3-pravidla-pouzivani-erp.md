---
class: document:class:Document
title: "3. Pravidla pouzivani ERP"
---
# 3. Pravidla pouzivani ERP

**Oblast:** Zaklad systemu

## Ucel
Pravidla pouzivani ERP popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cela firma.

## Doporuceny objekt v Huly
KB dokument / governance pravidlo.

## Povinna pole / atributy
- pravidlo
- povinnost
- role
- vyjimka
- riziko
- revize

## Stavovy proces
- navrh
- schvaleno
- platne
- prepracovat

## Vazby na jine dokumenty a karty
- 5. Role odpovednosti a opravneni
- 6. Kdy pouzit dokument a kdy kartu
- 7. Standard nazvu stitku atributu a vztahu
- 9. Auditni stopa a evidence rozhodnuti
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
Vyjimky a verejne odkazy schvaluje admin nebo vlastnik oblasti.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- objekty bez vlastnika
- zastarale dokumenty
- poruseni pravidel

## Zdrojove prepisy
- `01_PCFyqa7738E.cs.txt` - Huly Cards - A Deep Dive The future of collaboration is here. Cards vs dokumenty, typy, atributy, tagy, vztahy, filtrovani, prilohy a audit aktivit.
- `20_cspdJ5TjFNQ.cs.txt` - How to use documents in Huly Huly Tutorials. Dokumenty: tymove prostory, markdown, @zmineni, akcni polozky, realtime editace, historie, sdileni.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.
