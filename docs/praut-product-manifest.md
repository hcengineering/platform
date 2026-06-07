# PRAUT Product Manifest

**Verze:** 1.0  
**Stav:** pracovni zdroj pravdy pro prvni PRAUT produktovou verzi  
**Repozitari:** PRAUT fork Huly Platform  
**Vztah k Huly:** PRAUT zustava fork Huly, ale produktove chovani se ma pridavat primarne pres PRAUT overlay, ne pres prepis Huly core.

## 1. Ucel

Tento dokument rika, co ma z Huly vzniknout pro PRAUT.

Technicka governance uz rika, kam se smi sahat. Tento manifest rika, proc se ma sahat, co ma byt prvni produktova verze a jake workflow ma byt pro firmu nejdulezitejsi.

Manifest je urceny pro:

- lidi, kteri rozhoduji o produktu,
- vyvojare,
- agentni orchestrator,
- AI agenty,
- QA/release proces,
- budouci upstream update review.

## 2. Produktova definice

PRAUT ma byt firemni operacni system pro obchod, zakazky, projekty, ukoly, dokumenty, automatizace a rozumne pouziti AI.

Prvni verze nema byt obecna kopie Huly se zmenenym logem. Ma byt zjednodusena PRAUT verze, ktera podporuje realny tok prace:

1. prijde lead nebo poptavka,
2. obchodnik vyhodnoti prilezitost,
3. system pripravi dalsi kroky a podklady,
4. clovek schvali nabidku nebo rozhodnuti,
5. z obchodni prilezitosti vznikne projekt,
6. tym pracuje na ukolech,
7. dokumenty, rozhodnuti a komunikace jsou dohledatelne,
8. vedeni vidi stav obchodu, projektu a kapacit.

## 3. MVP

MVP znamena prvni pouzitelna verze, ne finalni produkt.

### MVP musi umet

- spravovat firmy, osoby a kontakty,
- prijimat a evidovat leady,
- rozlisovat stav obchodni prilezitosti,
- vytvorit projekt nebo zakazku z vybrane prilezitosti,
- rozdelit projekt na ukoly,
- evidovat dokumenty a prilohy,
- udrzet historii komunikace a rozhodnuti,
- ukazat zakladni dashboard pro obchod a projekty,
- pripravit AI navrh odpovedi nebo shrnuti,
- vyzadovat lidske schvaleni u rizikovych vystupu.

### MVP nesmi delat

- automaticky posilat zavazne nabidky bez cloveka,
- automaticky menit cenu nebo smluvni podminky,
- automaticky odmitat strategicke klienty,
- menit Huly core bez schvalene vyjimky,
- pridavat AI jen kvuli dojmu modernosti,
- kopirovat realna zakaznicka data bez jasneho pravniho a bezpecnostniho duvodu.

## 4. Hlavni workflow

### Lead to project

Toto je hlavni produktovy tok.

| Krok | Vstup | System udela | Clovek rozhoduje | Vystup |
| --- | --- | --- | --- | --- |
| Lead prijat | formular, e-mail, rucni zadani | zalozi lead, firmu nebo kontakt | jestli je lead relevantni | kvalifikovany lead |
| Kvalifikace | popis potreby, kontakt, historie | navrhne kategorii, prioritu a dalsi krok | obchodnik potvrdi smer | obchodni prilezitost |
| Nabidka | pozadavek, sablony, odhad prace | pripravi koncept odpovedi/nabidky | obchodnik schvali text, cenu a rozsah | odeslana nabidka |
| Predani do projektu | schvalena nabidka | vytvori projekt, zakladni ukoly, dokumentovou slozku | odpovedna osoba potvrdi rozsah | aktivni projekt |
| Realizace | projektove ukoly a dokumenty | hlida terminy, notifikace, chybejici vstupy | tym resi vecne rozhodnuti | hotove vystupy |
| Vyhodnoceni | stav projektu, cas, vysledky | pripravi report | vedeni rozhoduje o dalsim smeru | report a pouceni |

### Customer support

Podpora zakazniku je druha priorita po lead-to-project toku.

| Krok | System | Clovek |
| --- | --- | --- |
| Prijem pozadavku | zalozi pozadavek, priradi firmu, navrhne kategorii | potvrdi prioritu u dulezitych klientu |
| Triage | rozpozna bezny, urgentni nebo rizikovy pripad | resi vyjimky a konflikty |
| Navrh odpovedi | pripravi koncept odpovedi | schvaluje vse, co muze mit obchodni nebo reputacni dopad |
| Uzavreni | ulozi vysledek a navrh pouceni | potvrdi, ze vec je realne vyresena |

## 5. Role uzivatelu

| Role | Co dela | Potrebuje videt | Nesmime po ni chtit |
| --- | --- | --- | --- |
| Vedení | rozhoduje o smeru, kapacitach, rizicich | dashboardy, pipeline, projekty, finance, rizika | resit kazdy operativni detail |
| Obchodnik | zpracovava leady a nabidky | kontakty, firmy, prilezitosti, historii komunikace | hledat data ve vice systemech |
| Projektovy manager | vede zakazky a ukoly | projekty, terminy, zavislosti, stav tymu | rucne vyrabet reporty porad dokola |
| Realizacni tym | plni ukoly a dodava vystupy | sve ukoly, kontext, dokumenty, rozhodnuti | rozhodovat o obchodnich vyjimkach |
| Zakaznicka pece | resi dotazy a problemy | pozadavky, historii klienta, navrhy odpovedi | posilat rizikove odpovedi bez schvaleni |
| Administrator | nastavuje system a integrace | konfiguraci, audit, import/export, opravneni | menit core kod kvuli bezne konfiguraci |

## 6. Huly moduly

Tato tabulka rika, jak se ma k modulům pristupovat produktove. Technicke vlastnictvi souboru porad ridi `docs/praut-fork-governance.md`.

| Oblast Huly | PRAUT rozhodnuti | Priorita | Poznamka |
| --- | --- | --- | --- |
| Contacts | ponechat a upravit slovnik | MVP | zaklad pro firmy, osoby a vztahy |
| Lead | ponechat a rozsirit PRAUT workflow | MVP | klicovy vstup do obchodniho procesu |
| Tracker / Issues | ponechat jako ukoly/projekty | MVP | muze byt prelozeno produktove, ne nutne technicky |
| Documents / Drive | ponechat | MVP | dokumenty, prilohy, sablony, vystupy |
| Chunter / Chat | ponechat opatrne | pozdeji | uzitecne pro interni komunikaci, ne jako prvni fokus |
| Calendar | ponechat | pozdeji | schuzky, navaznosti, notifikace |
| Notification | ponechat | MVP | musi podporovat workflow, ne spamovat |
| Recruit / HR | skryt pro prvni verzi | pozdeji | aktivovat jen pokud bude personalni use case |
| QMS / controlled documents | skryt pro prvni verzi | pozdeji | silne domenove, neni prvni PRAUT workflow |
| Billing / payment | nezapinat bez rozhodnuti | pozdeji | vyzaduje pravni, financni a bezpecnostni pravidla |
| GitHub / Gmail / Telegram integrace | zapinat selektivne | po MVP | az podle realnych integracnich priorit |

## 7. Customizace podle oblasti

### ZELENA OBLAST

Sem patri vlastni PRAUT produktove moduly.

Preferovane zmeny:

- `plugins/praut-*` pro PRAUT obrazovky a workflow,
- `models/praut-*` pro PRAUT datove entity,
- `server-plugins/praut-*` pro backend pravidla,
- `packages/praut-*` pro sdilene knihovny,
- `docs/praut-*` pro rozhodnuti a runbooky,
- `scripts/praut-*` pro opakovatelne automatizace.

### ZLUTA OBLAST

Sem patri UI, branding, export, backup, testy a CI. Meni se jen s review.

Typicke zmeny:

- branding soubory,
- workflow CI,
- export/import mapovani,
- desktop baleni,
- testy pro PRAUT workflow.

### CERVENA OBLAST

Sem patri Huly core.

Zakladni pravidlo:

- nemenit kvuli nazvum,
- nemenit kvuli barvam,
- nemenit kvuli jednorazove zkratce,
- nemenit kvuli funkci, ktera jde udelat jako PRAUT plugin,
- menit jen kvuli kompatibilite, bugfixu, migraci nebo schvalene vyjimce.

## 8. AI funkce

AI ma byt poradce a priprava podkladu. Nemá byt skryty rozhodovatel.

| AI funkce | MVP | Uroven autonomie | Lidska kontrola |
| --- | --- | --- | --- |
| Shrnutí leadu nebo komunikace | ano | 1 | obchodnik ověří |
| Navrh odpovedi na poptavku | ano | 2 | clovek schvali pred odeslanim |
| Scoring leadu | ano | 1 | obchodnik potvrdi nebo zmeni |
| Navrh dalsiho kroku | ano | 1 | odpovedna role rozhodne |
| Generovani nabidky | pozdeji | 2 | povinne schvaleni ceny, rozsahu a textu |
| Kontrola rizikovych slov ve zprave | ano | 1 | clovek resi oznacene riziko |
| Automaticke odmitnuti klienta | ne | zakazano | musi rozhodnout clovek |
| Pravne zavazny vyklad | ne | zakazano | pravnik/odpovedna osoba |

## 9. Automatizace

Automatizovat se ma opakovatelna prace s nizkym rizikem.

### Automatizovat v MVP

- zalozeni leadu z formulare nebo importu,
- vytvoreni ukolu po zmene stavu leadu,
- notifikace odpovedne osoby,
- zalozeni projektu ze schvalene prilezitosti,
- predvyplneni sablon,
- pravidelny report pipeline a otevrenych projektu,
- kontrola chybejicich poli pred predanim do projektu.

### Neautomatizovat bez cloveka

- finalni odeslani nabidky,
- zmena ceny,
- nestandardni obchodni podminky,
- zavazne sliby klientovi,
- krizova komunikace,
- mazani nebo anonymizace realnych dat,
- zmena opravneni u citlivych dat.

## 10. Data

### Zakladni entity pro PRAUT

| Entita | Zdroj v Huly | PRAUT vyznam |
| --- | --- | --- |
| Firma | `contact:class:Organization` | zakaznik, partner, dodavatel |
| Osoba | `contact:class:Person` | kontaktni osoba |
| Lead | `lead:class:Lead` | obchodni vstup |
| Ukol | `tracker:class:Issue` | prace, chyba, pozadavek, krok v projektu |
| Dokument | `document:class:Document` | vystup, podklad, poznamka, znalost |
| Priloha | storage/blob vrstva | soubor pripojeny k praci nebo dokumentu |
| Aktivita | activity model | auditni historie a kontext |

### Datove pravidlo

Realna data se nesmi jen tak kopirovat z ciziho Huly prostredi. Kazdy export musi mit:

- zdroj,
- ucel,
- rozsah,
- odpovednou osobu,
- pravidla anonymizace,
- misto ulozeni,
- pravidlo mazani,
- auditni zaznam.

## 11. Integrace

### Priorita 1

- webovy formular pro leady,
- e-mailova komunikace,
- kalendar,
- export/import dat,
- zakladni notifikace.

### Priorita 2

- Gmail/Google Workspace,
- GitHub pro technicke projekty,
- Telegram nebo jiny chat,
- fakturacni system,
- reporting/BI.

### Priorita 3

- platby,
- podpisove sluzby,
- pokrocile datove sklady,
- externi helpdesk,
- vlastni zakaznicky portal.

## 12. Metriky uspechu

PRAUT verze ma byt merena podle praxe, ne podle poctu funkci.

| Metrika | Proc existuje |
| --- | --- |
| Cas od prijmu leadu k prvni reakci | meri obchodni rychlost |
| Pocet leadu bez dalsiho kroku | meri disiplinu pipeline |
| Pocet rucne vytvarenych ukolu | meri hodnotu automatizace |
| Pocet AI navrhu schvalenych bez velke upravy | meri kvalitu AI podpory |
| Pocet rizikovych AI vystupu zachycenych pred odeslanim | meri bezpecnost |
| Pocet projektu bez odpovedne osoby nebo terminu | meri provozni poradek |
| Cas pripravy reportu | meri prinos pro vedeni |
| Pocet zmen v cervene oblasti | meri udrzitelnost forku |

## 13. Implementacni poradi

1. Potvrdit tento manifest jako vychozi produktove zadani.
2. Vytvorit prvni PRAUT workflow plugin v zelene oblasti.
3. Pridat business test scenare pro lead-to-project.
4. Doplnit branding manifest o finalni logo, barvy, texty a domeny.
5. Navrhnout datove mapovani pro leady, kontakty, ukoly a dokumenty.
6. Pripravit produkcni deployment plan.
7. Pridat prvni AI funkci jako navrh/shrnuti bez automatickeho odesilani.
8. Zapnout meritelne dashboardy pro obchod a projekty.

## 14. Otevrena rozhodnuti

Toto jsou veci, ktere musi potvrdit clovek, ne agent.

| Otazka | Proc je dulezita | Stav |
| --- | --- | --- |
| Je prvni PRAUT use case interni CRM, zakaznicky produkt, nebo oboji? | meni rozsah UI a opravneni | otevreno |
| Jake moduly maji byt ve vychozim menu viditelne? | urcuje prvni dojem produktu | otevreno |
| Kdo schvaluje obchodni nabidky? | nutne pro workflow a audit | otevreno |
| Jake jsou finalni PRAUT barvy, logo a domeny? | nutne pro branding | otevreno |
| Kde bude produkcni nasazeni? | nutne pro security a deployment | otevreno |
| Ktera realna data muzeme importovat do testu? | nutne pro validaci workflow | otevreno |

## 15. Agentni routing

| Pozadavek | Agent | Primarni oblast |
| --- | --- | --- |
| Upravit tento manifest | `praut-product-agent` | `docs/praut-product-manifest.md` |
| Pridat PRAUT workflow | `praut-product-agent` | `plugins/praut-*`, `models/praut-*` |
| Pridat server pravidla | `model-agent` | `server-plugins/praut-*` |
| Pridat AI navrh nebo shrnuti | `praut-product-agent` + `security-agent` | PRAUT plugin, AI hranice |
| Resit export/import realnych dat | `data-migration-agent` | `scripts/praut-*`, `services/export` |
| Menit branding | `frontend-branding-agent` | branding config, desktop, UI |
| Menit CI/update proces | `qa-release-agent` + `upstream-sync-agent` | `.github/workflows`, `scripts/praut-*` |
| Sahat do Huly core | `upstream-sync-agent` + odpovedny owner | cervena oblast |

## 16. Definition of Done

PRAUT produktova zmena je hotova jen tehdy, kdyz:

- ma jasny ucel pro PRAUT,
- patri do zelene oblasti, nebo ma zdokumentovanou vyjimku,
- ma urcenou lidskou odpovednost,
- ma popsany datovy tok,
- ma popsane AI limity, pokud pouziva AI,
- ma test nebo alespon manualni overovaci scenar,
- nezhorsuje upstream update proces,
- je srozumitelna i pro cloveka mimo vyvoj.

