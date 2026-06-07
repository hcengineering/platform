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

### PrautOpportunity model spec

`PrautOpportunity` je obchodni mezikrok mezi Huly leadem a projektovou realizaci. Neprepisuje `lead:class:Lead`; jen zachycuje PRAUT obchodni stav, schvalovani a pripravu predani.

#### Statusy opportunity

| Status | Vyznam | Kdo smi posunout |
| --- | --- | --- |
| `new` | prilezitost vznikla z leadu, jeste neni kvalifikovana | obchodnik |
| `qualified` | obchodnik potvrzuje, ze stoji za dalsi praci | obchodnik |
| `proposalDraft` | system nebo clovek pripravuje navrh odpovedi/nabidky | obchodnik |
| `proposalReview` | nabidka nebo odpoved ceka na lidske schvaleni | schvalovatel |
| `proposalSent` | nabidka byla schvalena a odeslana mimo automaticke odeslani | obchodnik |
| `won` | klient prijal nabidku | obchodnik / vedeni |
| `lost` | prilezitost skoncila bez zakazky | obchodnik |
| `handoffReady` | prilezitost je pripravena k predani do projektu | projektovy manager |
| `handoffDone` | projekt/ukoly byly vytvoreny nebo propojeny | projektovy manager |

Zakazane automaticke prechody:

- do `proposalSent`,
- do `won`,
- do `lost` u strategickeho klienta,
- do `handoffDone`, pokud chybi odpovedna osoba nebo rozsah prace.

#### Pole opportunity

| Pole | Typ | Povinne | Source of truth | Poznamka |
| --- | --- | --- | --- | --- |
| `title` | string | ano | PRAUT | kratky obchodni nazev |
| `sourceLead` | `Ref<lead.class.Lead>` | doporucene | Huly Lead | prazdne jen u rucne zalozene prilezitosti |
| `organization` | `Ref<contact.class.Organization>` | doporucene | Contact | firma zakaznika |
| `primaryContact` | `Ref<contact.class.Person>` | doporucene | Contact | hlavni kontakt |
| `status` | enum/string nebo `Ref<Status>` | ano | PRAUT | pouzit nejjednodussi kompatibilni variantu v modelu |
| `owner` | `Ref<contact.mixin.Employee>` | ano | PRAUT | odpovedny obchodnik |
| `estimatedValue` | number | ne | PRAUT | nezavazny odhad, ne fakturacni autorita |
| `currency` | string | ne | PRAUT | napr. `CZK`, `EUR` |
| `needSummary` | collaborative/markup text | ne | PRAUT | shrnuti potreby klienta |
| `nextStep` | string | ne | PRAUT | dalsi rucni krok |
| `nextStepDue` | timestamp | ne | PRAUT | termin dalsiho kroku |
| `requiresApproval` | boolean | ano | PRAUT | true pred nabidkou, cenou, AI vystupem nebo handoffem |
| `lastApproval` | `Ref<PrautApproval>` | ne | PRAUT | posledni relevantni schvaleni |
| `project` | `Ref<tracker.class.Project>` nebo vazebni entita | ne | Tracker | po predani |
| `createdBy` | account/person ref | ano | Core/PRAUT | audit |
| `createdOn` | timestamp | ano | Core/PRAUT | audit |
| `modifiedOn` | timestamp | ano | Core/PRAUT | audit |

Minimalni prvni implementace smi zacit jen s poli: `title`, `sourceLead`, `organization`, `primaryContact`, `status`, `owner`, `requiresApproval`, `lastApproval`.

### PrautApproval model spec

`PrautApproval` je auditni zaznam lidskeho rozhodnuti. Neni to obecna chat zprava a neni to AI vystup. Slouzi k dohledani, kdo schvalil nebo odmitl dulezity krok.

#### Typy approvalu

| Typ | Kdy se pouzije | Automaticky povinne |
| --- | --- | --- |
| `proposalText` | pred odeslanim odpovedi nebo nabidky klientovi | ano |
| `proposalPrice` | pri cene, odhadu nebo obchodnich podminkach | ano |
| `aiOutput` | pokud AI pripravila text, scoring nebo doporuceni s dopadem | ano |
| `projectHandoff` | pred vytvorenim projektu/ukolu ze zakazky | ano |
| `exception` | nestandardni obchodni, pravni nebo reputacni situace | ano |

#### Rozhodnuti approvalu

| Hodnota | Vyznam |
| --- | --- |
| `approved` | clovek schvalil dalsi krok |
| `rejected` | clovek krok zamitl |
| `changesRequested` | clovek chce upravu pred pokracovanim |
| `escalated` | rozhodnuti se predava vyssi roli |

#### Pole approvalu

| Pole | Typ | Povinne | Source of truth | Poznamka |
| --- | --- | --- | --- | --- |
| `opportunity` | `Ref<PrautOpportunity>` | ano | PRAUT | k cemu se schvaleni vztahuje |
| `approvalType` | enum/string | ano | PRAUT | viz typy approvalu |
| `decision` | enum/string | ano | PRAUT | viz rozhodnuti |
| `approvedBy` | account/person ref | ano | PRAUT/Core | realny clovek, ne system |
| `decidedOn` | timestamp | ano | PRAUT | cas rozhodnuti |
| `summary` | string | ano | PRAUT | kratke vysvetleni |
| `sourceAiOutput` | ref/string | ne | PRAUT | pokud se schvaloval AI vystup |
| `sourceDocument` | ref | ne | Document | pokud se schvaloval dokument/nabidka |
| `riskLevel` | `low` / `medium` / `high` | ano | PRAUT | minimalni risk klasifikace |

Pravidla:

- `approvedBy` nesmi byt systemovy bot,
- `decision = approved` je nutne pred `proposalSent` a `handoffDone`,
- `riskLevel = high` musi mit `summary` s duvodem,
- schvaleni se nema prepisovat; pri zmene vznikne novy `PrautApproval`.

### PrautProjectLink model spec

`PrautProjectLink` se pouzije, pokud nebude stacit jednoducha reference z opportunity na tracker projekt.

Minimalni pole:

| Pole | Typ | Povinne | Poznamka |
| --- | --- | --- | --- |
| `opportunity` | `Ref<PrautOpportunity>` | ano | obchodni zdroj |
| `project` | `Ref<tracker.class.Project>` | ano | realizacni projekt |
| `createdFromApproval` | `Ref<PrautApproval>` | ano | audit predani |
| `createdBy` | account/person ref | ano | kdo predani provedl |
| `createdOn` | timestamp | ano | kdy se predani stalo |

Prvni implementace muze `PrautProjectLink` odlozit, pokud staci pole `project` na `PrautOpportunity`.

### PrautRiskFlag model spec

`PrautRiskFlag` oznacuje pripad, ktery nesmi bez cloveka pokracovat.

Typy rizika:

- `missingData`,
- `highValue`,
- `legalText`,
- `customerConflict`,
- `aiUncertainty`,
- `sensitiveData`,
- `manualException`.

Minimalni pole:

| Pole | Typ | Povinne | Poznamka |
| --- | --- | --- | --- |
| `opportunity` | `Ref<PrautOpportunity>` | ano | kde riziko vzniklo |
| `riskType` | enum/string | ano | typ rizika |
| `riskLevel` | `low` / `medium` / `high` | ano | priorita kontroly |
| `message` | string | ano | srozumitelne vysvetleni |
| `resolvedBy` | account/person ref | ne | kdo riziko uzavrel |
| `resolvedOn` | timestamp | ne | kdy se vyresilo |

### Migrační pravidla modelu

- Prvni PR s modelem smi pridat jen nove PRAUT tridy; nesmi menit Huly `Lead`, `Issue`, `Contact` ani `Document`.
- Migrace musi byt additive-only.
- Zadna nova trida nesmi byt povinna pro existujici Huly workspace, dokud neni pripraveny backfill nebo fallback.
- Pokud se pozdeji bude generovat opportunity z existujicich leadu, musi to byt samostatny idempotentni migration/import krok.
- Export/import mapping se musi aktualizovat pred pouzitim realnych dat.

### Validacni pravidla modelu

Minimalni validace pred implementaci automatizaci:

- opportunity bez `owner` nesmi prejit do `proposalReview`,
- opportunity bez `approved` `proposalText` approvalu nesmi prejit do `proposalSent`,
- opportunity bez `approved` `projectHandoff` approvalu nesmi prejit do `handoffDone`,
- high-risk flag musi blokovat automaticke pokracovani,
- AI vystup bez lidskeho approvalu nesmi byt oznacen jako finalni vystup.

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
