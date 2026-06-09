# PRAUT ERP dokumentace

Tento adresar obsahuje provozni Markdown balicek pro zalozeni dokumentace v ERP/Huly PRAUT. Vznikl z lokalnich ceskych prepisu tutorialovych videi Huly a z metodiky PRAUT pro rozumne pouziti automatizace, AI a lidske kontroly.

## Kde zacit

1. **`PRAUT_PROSTREDI.md`** — precti nejdrive. Popisuje, jak ma hotove prostredi vypadat: 8 prostoru, 22 typu karet, vazby, procesy a acceptance kriteria.
2. **`IMPORT_CHECKLIST.md`** — prakticky postup krok za krokem. Kolega muze pouzit Huly Import Tool, vlastni importer nebo rucni setup podle dostupnosti.
3. **`PROCESY_PRO_PREDANI.md`** — detailni mapa procesu po zalozeni dokumentu a karet.

## Jak balicek pouzit
- `00_index.md` je hlavni katalog vsech 80 dokumentu.
- `IMPORT_CHECKLIST.md` je prakticky postup pro zalozeni workspace, dokumentu, Cards, vazeb a kontrolnich scenaru v Huly.
- `PROCESY_PRO_PREDANI.md` je mapa hlavnich procesu, ktere ma kolega rucne poskladat v Huly po zalozeni dokumentu a Cards.
- `zamestnanecke_navody/` je samostatna vrstva praktickych navodu pro bezne zamestnance. Nejde o importni ani instalacni dokumentaci.
- `huly_unified_import/` je primarni balicek pro oficialni Huly Import Tool.
- `copy_paste_import/00-import-order.md` je fallback pro rucni import do Huly.
- `copy_paste_import/11-cards-setup-guide.md` je prakticky navod pro nastaveni Cards, poli, workflow a pohledu.
- `copy_paste_import/12-automation-rules.md` je seznam 7 konkretnich alert-only automation pravidel.
- Dokumenty jsou rozdelene podle provoznich oblasti.
- `99_sources/source-map.md` vysvetluje, ktere prepisy byly pouzitelne a ktere slouzi jen jako tema podle metadat.

## Pro koho je ktera cast
- Kolega, ktery zaklada Praut prostredi v Huly, pouziva hlavne `IMPORT_CHECKLIST.md`, `PROCESY_PRO_PREDANI.md`, `copy_paste_import/` a `huly_unified_import/`.
- Zamestnanci, kteri budou v hotovem prostredi denne pracovat, pouzivaji hlavne `zamestnanecke_navody/`.
- Puvodnich 80 dokumentu v oblastech `01_system/` az `08_management_reporting/` zustava jako metodicka a setup reference.

## Zakladni pravidlo
Karty pouzivat pro strukturovana data, vztahy a reporting. Dokumenty pouzivat pro metodiky, pravidla, sablony a delsi text. Ukoly a akcni polozky pouzivat pro praci, ktera ma vlastnika, termin a stav. AI je poradce a pripravna vrstva, ne autorita pro rizikova rozhodnuti.
