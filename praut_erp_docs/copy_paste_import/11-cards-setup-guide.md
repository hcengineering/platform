# Prakticke nastaveni Cards v Huly

Tento dokument pouzij pri rucnim zakladani Cards. Cilem neni zalozit vsechno naraz, ale nejdrive rozchodit obchod, zakazky, fakturaci, projekty a zakaznicke pozadavky.

## Minimalni prvni vlna
Zaloz nejdrive techto 9 typu:
- Firma
- Kontakt
- Lead/Poptavka
- Obchodni prilezitost
- Nabidka
- Zakazka
- Faktura
- Projekt
- Zakaznicky pozadavek

Po zalozeni prvni vlny vytvor jeden testovaci zaznam pro Firmu, Kontakt, Lead/Poptavku, Obchodni prilezitost, Nabidku, Zakazku, Fakturu, Projekt a Zakaznicky pozadavek.

## Druha vlna
Tyto typy zaloz az po tom, co prvni vlna dava smysl a mas otestovane vazby:
- Milnik
- Predani
- Zapis ze schuzky
- Kampan
- Obsahova polozka
- Znalostni clanek
- Automatizace
- AI funkce
- Integrace
- Incident
- Change request
- Riziko
- KPI

## Obecna pravidla pro pole
- `text` pouzij pro kratke nazvy, ID, role a jednoduche hodnoty.
- `long text` pouzij pro rozsah, potrebu, rozhodnuti, rizika, dopad a poznamky.
- `select/status` pouzij pro stav, fazi, prioritu, citlivost, typ a health.
- `date` pouzij pro terminy, deadline, platnost, revize a planovane kontroly.
- `money/number` pouzij pro cenu, rozpocet, hodnotu, hodiny, pravdepodobnost a marzi.
- `reference/person` pouzij pro vazby na firmu, kontakt, klienta, projekt, vlastnika, schvalovatele a kontrolora.
- Pokud Huly nenabidne presny typ pole, pouzij `text` nebo `select` a pravidlo zapis do popisu typu karty.

## Povinne pohledy
- `Aktivni` - vse, co neni archiv, uzavreno, prohrano nebo vyrazeno.
- `Bez vlastnika` - zaznamy, kde chybi vlastnik, PM, kontrolor nebo schvalovatel.
- `Ke schvaleni` - nabidky, ceny, AI vystupy, zmeny a incidenty cekajici na cloveka.
- `Riziko` - zaznamy s vysokym rizikem, citlivosti nebo dopadem na klienta.
- `Obnovy do 60 dni` - zakazky, kde datum obnovy spada do 60 dni a stav neni archiv ani dokonceno.
- `Moje` - zaznamy, kde jsem vlastnik, assignee, PM, kontrolor nebo schvalovatel.

## Typy Cards

### Firma
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Centralni evidence organizace, klienta nebo partnera.
- **Pole a typy:**
- `nazev` - text
- `ICO` - text
- `web` - url
- `segment` - text
- `stav vztahu` - select/status
- `vlastnik` - person
- `citlivost` - select
- **Workflow/stavy:** `novy -> aktivni -> strategicky -> neaktivni -> archiv`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Kontakt
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Evidence osoby a jeji role ve firme nebo zakazce.
- **Pole a typy:**
- `jmeno` - text
- `firma` - reference
- `role` - text
- `email` - email
- `telefon` - phone
- `GDPR souhlas` - checkbox
- `vlastnik` - person
- **Workflow/stavy:** `novy -> aktivni -> neaktivni -> archiv`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Lead/Poptavka
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Zachyceni nove obchodni poptavky a jeji kvalifikace.
- **Pole a typy:**
- `zdroj` - text
- `firma` - reference
- `kontakt` - reference
- `potreba` - long text
- `rozpocet` - money
- `termin` - date
- `priorita` - select
- `stav` - select/status
- `dalsi krok` - text
- **Workflow/stavy:** `novy -> kontaktovat -> kvalifikace -> prevedeno -> odmitnuto -> archiv`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Obchodni prilezitost
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Rizeni obchodu od kvalifikace po vyhru nebo prohru.
- **Pole a typy:**
- `faze` - select/status
- `hodnota` - money
- `pravdepodobnost` - number
- `ocekavane uzavreni` - date
- `riziko` - select
- `vlastnik` - person
- **Workflow/stavy:** `kvalifikace -> analyza -> nabidka -> vyjednavani -> vyhrano -> prohrano`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Nabidka
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Kontrolovana priprava, schvaleni a historie nabidky.
- **Pole a typy:**
- `klient` - reference
- `prilezitost` - reference
- `rozsah` - long text
- `cena` - money
- `platnost` - date
- `verze` - text
- `schvalovatel` - person
- `stav` - select/status
- **Workflow/stavy:** `draft -> interni kontrola -> ke schvaleni -> odeslano -> vyhrano -> prohrano`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Zakazka
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Rizeny prevod vyhrane prilezitosti do realizace.
- **Pole a typy:**
- `klient` - reference
- `nabidka` - reference
- `PM` - person
- `start` - date
- `cilovy termin` - date
- `rozpocet hodin` - number
- `datum obnovy` - date
- `typ spoluprace` - select
- `health` - select/status
- `stav` - select/status
- **Workflow/stavy:** `navrh -> pripraveno -> aktivni -> pozastaveno -> dokonceno -> archiv`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Faktura
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `03_projects_tasks` pro vazbu na zakazku a projekt.
- **Ucel:** Evidence vystaveni, odeslani, splatnosti, zaplaceni a storna faktury navazane na zakazku, firmu a projekt.
- **Pole a typy:**
- `cislo faktury` - text
- `zakazka` - reference
- `klient` - reference
- `vyse` - money
- `datum vystaveni` - date
- `datum splatnosti` - date
- `datum zaplaceni` - date
- `stav` - select/status
- `vlastnik` - person
- **Workflow/stavy:** `draft -> vystavena -> odeslano -> zaplaceno -> po splatnosti -> storno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr po splatnosti, filtr bez vlastnika.
- **Kontrola:** Odeslani, upominku a storno potvrzuje odpovedny clovek; AI muze jen pripravit navrh textu nebo shrnuti.

### Projekt
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Realizacni vrstva zakazky, ukolu, kapacit a reportingu.
- **Pole a typy:**
- `zakazka` - reference
- `PM` - person
- `faze` - select/status
- `deadline` - date
- `skutecny cas` - number
- `blokery` - long text
- `rizika` - long text
- **Workflow/stavy:** `priprava -> aktivni realizace -> revize -> klientske schvaleni -> dokonceno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Milnik
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Kontrolni bod projektu s vystupem a akceptaci.
- **Pole a typy:**
- `projekt` - reference
- `vlastnik` - person
- `termin` - date
- `stav` - select/status
- `vystupy` - long text
- `akceptacni kriterium` - text
- **Workflow/stavy:** `navrh -> planovany -> aktivni -> v riziku -> dodany -> akceptovany`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Predani
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Auditovatelne predani prace mezi rolemi nebo fazemi.
- **Pole a typy:**
- `from role` - text
- `to role` - text
- `projekt` - reference
- `deadline` - date
- `otevrene otazky` - long text
- `potvrzeni prevzeti` - text
- **Workflow/stavy:** `vyzadano -> pripravuje se -> ke kontrole -> prijato -> vraceno -> dokonceno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Zapis ze schuzky
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Evidence rozhodnuti, akcnich polozek a navaznych ukolu ze schuzky.
- **Pole a typy:**
- `datum` - date
- `ucastnici` - number
- `projekt/klient` - text
- `rozhodnuti` - long text
- `akcni polozky` - long text
- `citlivost` - select
- **Workflow/stavy:** `draft -> ke kontrole -> potvrzeno -> akcni kroky otevrene -> uzavreno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Kampan
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Planovani a vyhodnoceni marketingove kampane.
- **Pole a typy:**
- `cil` - text
- `segment` - text
- `platformy` - text
- `start` - date
- `konec` - date
- `rozpocet` - money
- `stav` - select/status
- `KPI` - reference
- **Workflow/stavy:** `navrh -> priprava -> aktivni -> vyhodnoceni -> uzavreno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Obsahova polozka
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Planovani, tvorba a publikace marketingoveho vystupu.
- **Pole a typy:**
- `kampan` - reference
- `format` - text
- `platforma` - text
- `autor` - person
- `termin` - date
- `stav` - select/status
- `publikovana URL` - url
- **Workflow/stavy:** `napad -> draft -> kontrola -> schvaleno -> publikovano -> archiv`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Zakaznicky pozadavek
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Evidence pozadavku klienta a rizene reseni v helpdesku.
- **Pole a typy:**
- `klient` - reference
- `kontakt` - reference
- `typ` - select
- `priorita` - select
- `SLA` - select
- `vlastnik` - person
- `stav` - select/status
- `dopad` - long text
- **Workflow/stavy:** `novy -> triage -> reseni -> ceka na klienta -> vyreseno -> uzavreno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Znalostni clanek
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Overeny postup nebo odpoved pro podporu a interni znalostni bazi.
- **Pole a typy:**
- `tema` - text
- `kategorie` - text
- `stav` - select/status
- `vlastnik` - person
- `posledni revize` - date
- `souvisejici pozadavky` - text
- **Workflow/stavy:** `draft -> overeno -> publikovano -> zastarale -> archiv`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Automatizace
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Evidence automatizace, jeji autonomie, rizik a fallbacku.
- **Pole a typy:**
- `spoustec` - text
- `vstup` - text
- `akce` - text
- `vystup` - text
- `autonomie` - select
- `riziko` - select
- `fallback` - long text
- `vlastnik` - person
- **Workflow/stavy:** `navrh -> schvaleno -> aktivni -> pozastaveno -> vyrazeno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### AI funkce
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Vymezeni povoleneho pouziti AI a lidske kontroly.
- **Pole a typy:**
- `vstup` - text
- `vystup` - text
- `autonomie` - select
- `kontrolor` - person
- `citlivost` - select
- `omezeni` - long text
- `stav` - select/status
- **Workflow/stavy:** `povoleno -> povoleno se schvalenim -> zakazano -> pozastaveno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Integrace
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Evidence napojeneho systemu, datoveho toku a opravneni.
- **Pole a typy:**
- `system` - reference
- `ucel` - text
- `data` - text
- `smer synchronizace` - text
- `vlastnik` - person
- `opravneni` - text
- `riziko` - select
- **Workflow/stavy:** `navrh -> test -> aktivni -> pozastaveno -> vyrazeno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Incident
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Evidence provozni chyby nebo bezpecnostniho/procesniho incidentu.
- **Pole a typy:**
- `zavaznost` - text
- `dopad` - long text
- `system` - reference
- `vlastnik` - person
- `workaround` - long text
- `pricina` - long text
- `napravna akce` - long text
- **Workflow/stavy:** `detekovano -> triage -> reseni -> obnova -> postmortem -> uzavreno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Change request
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Rizeni zmeny procesu, systemu, integrace nebo automatizace.
- **Pole a typy:**
- `duvod` - long text
- `dopad` - long text
- `riziko` - select
- `schvalovatel` - person
- `test` - text
- `nasazeni` - text
- `rollback` - text
- **Workflow/stavy:** `navrh -> analyza -> schvaleno -> implementace -> test -> nasazeno -> rollback`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### Riziko
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Evidence rizika, dopadu, mitigace a pravidelne kontroly.
- **Pole a typy:**
- `oblast` - text
- `pravdepodobnost` - number
- `dopad` - long text
- `vlastnik` - person
- `mitigace` - long text
- `stav` - select/status
- `termin kontroly` - date
- **Workflow/stavy:** `nove -> vyhodnoceno -> mitigace -> monitoring -> uzavreno`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

### KPI
- **Zalozit v prostoru:** podle hlavniho pouziti karty; kdyz si nejsi jisty, pouzij prostor `01_system` jen pro systemove typy a obchodni typy dej do `02_sales_crm`.
- **Ucel:** Metrika pro rizeni vykonu ERP, obchodu, projektu a provozu.
- **Pole a typy:**
- `definice` - long text
- `zdroj dat` - text
- `vlastnik` - person
- `frekvence` - select
- `cil` - text
- `trend` - select/status
- `akce pri odchylce` - long text
- **Workflow/stavy:** `navrh -> schvaleno -> mereno -> odchylka -> revize`
- **Zakladni pohledy:** seznam podle vlastnika, tabulka podle stavu, filtr otevrene/aktivni, filtr bez vlastnika.
- **Kontrola:** Rizikove zmeny potvrzuje odpovedny clovek; AI muze jen pripravit navrh nebo shrnuti.

## Po zalozeni
- [ ] Existuje prvni vlna 9 typu Cards.
- [ ] Existuje vsech 22 typu Cards.
- [ ] Kazdy typ ma vlastnika.
- [ ] Kazdy typ ma stavovy workflow.
- [ ] Kazdy typ ma povinne pohledy `Aktivni`, `Bez vlastnika`, `Ke schvaleni`, `Riziko`, `Obnovy do 60 dni` a `Moje`.
- [ ] Obchodni a rizikove typy maji pohled `Ke schvaleni`.
- [ ] Vazby jsou otestovane na jednom testovacim klientovi.
- [ ] Faktura je navazana na Zakazku, Firmu a Projekt.
- [ ] Zakazka ma vyplnene pole `datum obnovy` a `typ spoluprace`, pokud jde o retainer nebo opakovanou spolupraci.
- [ ] Automatizace nejsou zapnute, dokud nejsou data a vazby stabilni.
