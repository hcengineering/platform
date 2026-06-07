# PRAUT MVP Implementation Plan

**Verze:** 1.0  
**Navazuje na:** `docs/praut-product-manifest.md`  
**Ucel:** prevest produktovy manifest na konkretni implementacni praci pro prvni PRAUT verzi.

## 1. Cil MVP

Prvni PRAUT MVP ma dokazat jeden hlavni tok:

`lead -> kvalifikace -> nabidka -> projekt -> ukoly -> vystup -> report`

Nejde o prepsani Huly. Jde o PRAUT vrstvu nad Huly, ktera vyuzije existujici moduly a prida jen to, co je nutne pro PRAUT workflow.

## 2. Implementacni princip

### Preferovane reseni

- nove PRAUT veci davat do zelene oblasti,
- existujici Huly moduly pouzivat jako podklad,
- zlutou oblast menit jen pro wiring, branding, testy nebo konfiguraci,
- cervenou oblast nemenit bez schvalene vyjimky.

### Zakazane zkratky

- neprejmenovavat Huly core jen kvuli ceskemu slovniku,
- nepridavat logiku do nahodnych existujicich pluginu,
- neodesilat AI vystupy automaticky,
- nemazat Huly moduly jen proto, ze nejsou v MVP,
- nedelat produkcni migraci bez export/import planu.

## 3. MVP moduly

| PRAUT cast | Stav | Primarni cesta | Navazuje na Huly |
| --- | --- | --- | --- |
| PRAUT workflow shell | vytvorit | `plugins/praut-workflow` | workbench, lead, tracker, document |
| PRAUT model | vytvorit | `models/praut-workflow` | lead, contact, tracker, document |
| PRAUT server pravidla | vytvorit | `server-plugins/praut-workflow` | server lead/tracker/contact |
| PRAUT AI asistence | navrhnout, implementovat pozdeji | `plugins/praut-ai` nebo soucast workflow pluginu | ai-bot/openai podle realneho zapojeni |
| PRAUT test scenare | vytvorit | `tests`, `ws-tests`, pripadne `qms-tests` | existing test harness |
| PRAUT branding/menu | pozdeji | `dev/branding*.json`, `dev/prod/public/branding*.json` | frontend config |

## 4. Faze implementace

### Faze 0: potvrzeni zadani

**Owner:** `praut-product-agent`  
**Vystup:** schvaleny rozsah MVP.

Udelat:

- potvrdit, ze prvni workflow je lead-to-project,
- potvrdit, ktere Huly moduly maji byt ve vychozim menu,
- potvrdit role, ktere budou pouzite v MVP,
- rozhodnout, zda MVP je interni PRAUT system, zakaznicky produkt, nebo oboji.

Definition of done:

- otevrene otazky z `docs/praut-product-manifest.md` maji odpoved nebo explicitni docasny predpoklad,
- zadny kodovy zasah.

### Faze 1: scaffold PRAUT workflow vrstvy

**Owner:** `praut-product-agent`  
**Primarni oblast:** zelena.

Vytvorit navrh techto Rush projektu:

- `plugins/praut-workflow`
- `models/praut-workflow`
- `server-plugins/praut-workflow`

Udelat:

- zvolit package names, napr. `@hcengineering/praut-workflow`, `@hcengineering/model-praut-workflow`, `@hcengineering/server-praut-workflow`,
- pridat je do `rush.json` jen pokud bude realny buildable package,
- drzet minimalni dependencies na existujici Huly moduly,
- nepridavat nove externi npm zavislosti bez review.

Pozor:

- `rush.json` je cervena oblast. Pridani PRAUT package je povolene jen jako minimalni schvalena vyjimka podle governance.
- Pokud lze prvni krok udelat jen dokumentacne nebo konfigem, neni nutne hned scaffoldovat vsechny tri projekty.

Definition of done:

- package build pro nove projekty projde,
- `rush check` projde,
- governance `core = 0`, nebo je vyjimka zdokumentovana.

### Faze 2: datovy model workflow

**Owner:** `model-agent`  
**Primarni oblast:** `models/praut-workflow`.

Minimalni PRAUT entity:

| Entita | Ucel | Vazba |
| --- | --- | --- |
| `PrautOpportunity` | obchodni prilezitost po kvalifikaci leadu | lead, organization, person |
| `PrautApproval` | lidske schvaleni nabidky, AI vystupu nebo predani | account/person, timestamp, decision |
| `PrautProjectLink` | vazba mezi obchodni prilezitosti a projektem/ukoly | tracker issue/project |
| `PrautRiskFlag` | oznaceni nejasneho nebo rizikoveho pripadu | lead, message, document |

Pravidla:

- pokud existujici Huly `lead:class:Lead` staci, nerozsirovat zbytecne,
- PRAUT model ma pridavat jen chybejici obchodni stav, schvalovani a vazby,
- model nesmi prepisovat semantiku existujicich Huly trid.

Definition of done:

- je jasne, ktere pole je source of truth,
- migrace je zpetne kompatibilni,
- export/import dopad je popsany.

### Faze 3: UI workflow

**Owner:** `praut-product-agent`  
**Primarni oblast:** `plugins/praut-workflow`.

Prvni obrazovky:

| Obrazovka | Ucel |
| --- | --- |
| PRAUT Pipeline | leady a prilezitosti podle stavu |
| PRAUT Opportunity Detail | kontext klienta, pozadavku, AI navrhu, schvaleni |
| PRAUT Project Handoff | prevod do projektu a zakladnich ukolu |
| PRAUT Manager Dashboard | stav leadu, projektu, rizik a schvaleni |

Minimalni interakce:

- zobrazit leady/prilezitosti,
- zmenit stav prilezitosti,
- pripravit handoff do projektu,
- zobrazit, zda je potreba lidske schvaleni,
- nechat auditni stopu rozhodnuti.

Zakazane v MVP:

- automaticke odeslani nabidky,
- automaticke schvaleni AI vystupu,
- vlastni komplexni UI framework mimo Huly/Svelte patterns.

Definition of done:

- zakladni workflow jde projit manualne,
- texty jsou srozumitelne pro nevyvojare,
- UI nevytvari povinnost sahat do Huly core.

### Faze 4: server pravidla a automatizace

**Owner:** `model-agent` + `praut-product-agent`  
**Primarni oblast:** `server-plugins/praut-workflow`.

Automatizace v MVP:

- pri kvalifikaci leadu vytvorit dalsi krok,
- pri schvaleni opportunity pripravit projektovy handoff,
- oznacit chybejici povinna pole,
- vytvorit interni notifikaci odpovedne osobe,
- zapsat `PrautApproval` pro schvalene lidske rozhodnuti.

Fallback pravidla:

- pokud chybi data, nevytvaret zavazny vystup,
- pokud je AI nejista, eskalovat cloveku,
- pokud se nepodari vytvorit projekt, ulozit chybu a nechat opakovatelny krok.

Definition of done:

- automatizace je idempotentni,
- dulezite kroky maji auditni zaznam,
- zadna automatizace neobchazi lidske schvaleni.

### Faze 5: AI asistent

**Owner:** `praut-product-agent` + `security-agent`  
**Primarni oblast:** zelena nebo schvalena zlutou review.

Prvni AI funkce:

| Funkce | Typ vystupu | Autonomie | Lidska kontrola |
| --- | --- | --- | --- |
| shrnuti leadu | shrnuti | 1 | obchodnik ověří |
| navrh odpovedi | koncept textu | 2 | clovek schvali pred odeslanim |
| scoring leadu | doporuceni | 1 | obchodnik potvrdi |
| kontrola rizika | upozorneni | 1 | odpovedna osoba rozhodne |

AI nesmi:

- sama poslat zpravu klientovi,
- menit cenu,
- slibit termin,
- uzavrit nebo odmitnout prilezitost,
- rozhodnout o citlivych datech.

Definition of done:

- prompt/context je verzovany,
- vystup je oznacen jako navrh,
- je ulozena informace, kdo vystup schvalil nebo odmitl,
- citliva data maji jasny limit pouziti.

### Faze 6: testy

**Owner:** `qa-release-agent`.

Minimalni test scenare:

1. zalozeni leadu,
2. kvalifikace leadu na prilezitost,
3. kontrola chybejicich poli pred nabidkou,
4. zaznam lidskeho schvaleni,
5. prevod na projekt/ukoly,
6. zobrazeni v dashboardu,
7. AI navrh zustane jen navrhem.

Technicke kontroly:

- `node scripts/praut-governance.mjs check --json --ref main`
- `node scripts/praut-apply-overlay.mjs --check`
- `node scripts/praut-smoke.mjs`
- `node common/scripts/install-run-rush.js check`
- relevantni `rush build`
- relevantni `rush validate`
- cilene testy noveho package

Definition of done:

- testy pokryji hlavni happy path a alespon jeden rizikovy pripad,
- CI nema novy flaky krok,
- testy nevynucuji zmenu v Huly core.

## 5. Implementacni backlog

### P0

| ID | Ukol | Owner | Vystup |
| --- | --- | --- | --- |
| MVP-001 | Potvrdit otevrena rozhodnuti v product manifestu | `praut-product-agent` + clovek | aktualizovany manifest |
| MVP-002 | Navrhnout package strukturu `praut-workflow` | `praut-product-agent` | kratky technicky navrh |
| MVP-003 | Navrhnout minimalni datovy model opportunity/approval | `model-agent` | model spec |
| MVP-004 | Navrhnout lead-to-project test scenare | `qa-release-agent` | test plan |

### P1

| ID | Ukol | Owner | Vystup |
| --- | --- | --- | --- |
| MVP-101 | Scaffold `models/praut-workflow` | `model-agent` | buildable package |
| MVP-102 | Scaffold `plugins/praut-workflow` | `praut-product-agent` | buildable package |
| MVP-103 | Scaffold `server-plugins/praut-workflow` | `model-agent` | buildable package |
| MVP-104 | Pridat prvni UI pipeline view | `praut-product-agent` | manualne pruchodny UI |
| MVP-105 | Pridat approval/audit zaznam | `model-agent` | ulozeny lidsky decision |

### P2

| ID | Ukol | Owner | Vystup |
| --- | --- | --- | --- |
| MVP-201 | Pridat AI shrnuti leadu | `praut-product-agent` + `security-agent` | navrh bez automaticke akce |
| MVP-202 | Pridat navrh odpovedi | `praut-product-agent` + `security-agent` | koncept ke schvaleni |
| MVP-203 | Pridat manager dashboard | `praut-product-agent` | prvni metriky |
| MVP-204 | Pripravit import/export mapovani | `data-migration-agent` | datovy mapping |

## 6. Soubory a oblasti

| Typ prace | Preferovana oblast | Poznamka |
| --- | --- | --- |
| produktove UI | `plugins/praut-workflow` | zelena |
| model | `models/praut-workflow` | zelena |
| server pravidla | `server-plugins/praut-workflow` | zelena |
| sdilene helpery | `packages/praut-*` | zelena |
| dokumentace | `docs/praut-*` | zelena |
| testy | `tests`, `ws-tests` | zluta, review QA |
| menu/branding | `dev/branding*.json` | zluta, review branding |
| Rush registrace | `rush.json` | cervena, jen minimalni package entry |
| lockfile | `common/config/rush/pnpm-lock.yaml` | cervena vyjimka, jen dusledek dependency zmen |

## 7. Co musi schvalit clovek

Pred implementaci kodu:

- jestli prvni produkt je interni PRAUT CRM, zakaznicky produkt, nebo oboji,
- ktere moduly budou viditelne v menu,
- kdo je obchodni schvalovatel,
- jestli se realna data smi pouzit v testech,
- jestli AI funkce muze pouzivat realne klientské texty.

Pred produkci:

- finalni branding,
- produkcni deployment,
- data retention,
- backup/restore postup,
- pravni texty a pravidla pro osobni data,
- limity AI a audit log.

## 8. Prvni konkretni implementacni PR

Prvni kodovy PR nema resit celou aplikaci.

Navrh prvniho PR:

1. pridat skeleton `models/praut-workflow`,
2. pridat skeleton `plugins/praut-workflow`,
3. pridat skeleton `server-plugins/praut-workflow`,
4. zaregistrovat minimalne v Rush,
5. nepridavat zadnou business logiku, ktera by menila Huly chovani,
6. pridat README v kazdem package s ucelem,
7. spustit `rush check`, relevantni build a governance.

Smysl prvniho PR je otevrit zelenou technickou cestu. Business workflow muze prijit az v dalsim PR.

## 9. Rizika

| Riziko | Dopad | Mitigace |
| --- | --- | --- |
| Prilis brzy sahneme do Huly core | horsi upstream update | drzet overlay a governance `core = 0` |
| MVP bude moc siroke | nikdy nebude hotovo | drzet se lead-to-project |
| AI zacne rozhodovat | obchodni/reputacni riziko | AI jen navrh, clovek schvaluje |
| Data nebudou jasne namapovana | spatne importy/reporty | nejdriv mapping, potom import |
| UI bude jen preznacena Huly | nizka hodnota pro PRAUT | stavet konkretni PRAUT workflow |
| Chybi produkcni plan | nejde bezpecne nasadit | paralelne pripravit deployment runbook |

## 10. Definition of Done pro MVP

MVP je hotove, kdyz:

- lead-to-project workflow jde projit na testovacich datech,
- existuje lidske schvaleni pro nabidku a AI navrh,
- projekt/ukoly vznikaji z prilezitosti kontrolovane,
- dashboard ukazuje zakladni stav pipeline a projektu,
- vsechny PRAUT zmeny jsou v zelene oblasti nebo maji vyjimku,
- governance hlasi `core = 0`,
- CI build/validate/test pro dotcene casti prochazi,
- je popsany datovy tok a produkcni rizika.

