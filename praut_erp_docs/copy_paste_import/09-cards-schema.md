# Cards schema pro Huly

Tyto typy Cards zaloz po importu dokumentu. Nepridavej dalsi typy pred revizi datoveho modelu.

## Typy Cards

### Firma
- **Ucel:** Centralni evidence organizace, klienta nebo partnera.
- **Povinna pole:** nazev, ICO, web, segment, stav vztahu, vlastnik, citlivost
- **Stavy:** novy, aktivni, strategicky, neaktivni, archiv
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Kontakt
- **Ucel:** Evidence osoby a jeji role ve firme nebo zakazce.
- **Povinna pole:** jmeno, firma, role, email, telefon, GDPR souhlas, vlastnik
- **Stavy:** novy, aktivni, neaktivni, archiv
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Lead/Poptavka
- **Ucel:** Zachyceni nove obchodni poptavky a jeji kvalifikace.
- **Povinna pole:** zdroj, firma, kontakt, potreba, rozpocet, termin, priorita, stav, dalsi krok
- **Stavy:** novy, kontaktovat, kvalifikace, prevedeno, odmitnuto, archiv
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Obchodni prilezitost
- **Ucel:** Rizeni obchodu od kvalifikace po vyhru nebo prohru.
- **Povinna pole:** faze, hodnota, pravdepodobnost, ocekavane uzavreni, riziko, vlastnik
- **Stavy:** kvalifikace, analyza, nabidka, vyjednavani, vyhrano, prohrano
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Nabidka
- **Ucel:** Kontrolovana priprava, schvaleni a historie nabidky.
- **Povinna pole:** klient, prilezitost, rozsah, cena, platnost, verze, schvalovatel, stav
- **Stavy:** draft, interni kontrola, ke schvaleni, odeslano, vyhrano, prohrano
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Zakazka
- **Ucel:** Rizeny prevod vyhrane prilezitosti do realizace.
- **Povinna pole:** klient, nabidka, PM, start, cilovy termin, rozpocet hodin, datum obnovy, typ spoluprace, health, stav
- **Stavy:** navrh, pripraveno, aktivni, pozastaveno, dokonceno, archiv
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Faktura
- **Ucel:** Evidence vystaveni, odeslani, splatnosti, zaplaceni a storna faktury navazane na zakazku, firmu a projekt.
- **Povinna pole:** cislo faktury, zakazka, klient, vyse, datum vystaveni, datum splatnosti, datum zaplaceni, stav, vlastnik
- **Stavy:** draft, vystavena, odeslano, zaplaceno, po splatnosti, storno
- **Lidska kontrola:** Povinna pri odeslani, upomince a stornu.

### Projekt
- **Ucel:** Realizacni vrstva zakazky, ukolu, kapacit a reportingu.
- **Povinna pole:** zakazka, PM, faze, deadline, skutecny cas, blokery, rizika
- **Stavy:** priprava, aktivni realizace, revize, klientske schvaleni, dokonceno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Milnik
- **Ucel:** Kontrolni bod projektu s vystupem a akceptaci.
- **Povinna pole:** projekt, vlastnik, termin, stav, vystupy, akceptacni kriterium
- **Stavy:** navrh, planovany, aktivni, v riziku, dodany, akceptovany
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Predani
- **Ucel:** Auditovatelne predani prace mezi rolemi nebo fazemi.
- **Povinna pole:** from role, to role, projekt, deadline, otevrene otazky, potvrzeni prevzeti
- **Stavy:** vyzadano, pripravuje se, ke kontrole, prijato, vraceno, dokonceno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Zapis ze schuzky
- **Ucel:** Evidence rozhodnuti, akcnich polozek a navaznych ukolu ze schuzky.
- **Povinna pole:** datum, ucastnici, projekt/klient, rozhodnuti, akcni polozky, citlivost
- **Stavy:** draft, ke kontrole, potvrzeno, akcni kroky otevrene, uzavreno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Kampan
- **Ucel:** Planovani a vyhodnoceni marketingove kampane.
- **Povinna pole:** cil, segment, platformy, start, konec, rozpocet, stav, KPI
- **Stavy:** navrh, priprava, aktivni, vyhodnoceni, uzavreno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Obsahova polozka
- **Ucel:** Planovani, tvorba a publikace marketingoveho vystupu.
- **Povinna pole:** kampan, format, platforma, autor, termin, stav, publikovana URL
- **Stavy:** napad, draft, kontrola, schvaleno, publikovano, archiv
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Zakaznicky pozadavek
- **Ucel:** Evidence pozadavku klienta a rizene reseni v helpdesku.
- **Povinna pole:** klient, kontakt, typ, priorita, SLA, vlastnik, stav, dopad
- **Stavy:** novy, triage, reseni, ceka na klienta, vyreseno, uzavreno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Znalostni clanek
- **Ucel:** Overeny postup nebo odpoved pro podporu a interni znalostni bazi.
- **Povinna pole:** tema, kategorie, stav, vlastnik, posledni revize, souvisejici pozadavky
- **Stavy:** draft, overeno, publikovano, zastarale, archiv
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Automatizace
- **Ucel:** Evidence automatizace, jeji autonomie, rizik a fallbacku.
- **Povinna pole:** spoustec, vstup, akce, vystup, autonomie, riziko, fallback, vlastnik
- **Stavy:** navrh, schvaleno, aktivni, pozastaveno, vyrazeno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### AI funkce
- **Ucel:** Vymezeni povoleneho pouziti AI a lidske kontroly.
- **Povinna pole:** vstup, vystup, autonomie, kontrolor, citlivost, omezeni, stav
- **Stavy:** povoleno, povoleno se schvalenim, zakazano, pozastaveno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Integrace
- **Ucel:** Evidence napojeneho systemu, datoveho toku a opravneni.
- **Povinna pole:** system, ucel, data, smer synchronizace, vlastnik, opravneni, riziko
- **Stavy:** navrh, test, aktivni, pozastaveno, vyrazeno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Incident
- **Ucel:** Evidence provozni chyby nebo bezpecnostniho/procesniho incidentu.
- **Povinna pole:** zavaznost, dopad, system, vlastnik, workaround, pricina, napravna akce
- **Stavy:** detekovano, triage, reseni, obnova, postmortem, uzavreno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Change request
- **Ucel:** Rizeni zmeny procesu, systemu, integrace nebo automatizace.
- **Povinna pole:** duvod, dopad, riziko, schvalovatel, test, nasazeni, rollback
- **Stavy:** navrh, analyza, schvaleno, implementace, test, nasazeno, rollback
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### Riziko
- **Ucel:** Evidence rizika, dopadu, mitigace a pravidelne kontroly.
- **Povinna pole:** oblast, pravdepodobnost, dopad, vlastnik, mitigace, stav, termin kontroly
- **Stavy:** nove, vyhodnoceno, mitigace, monitoring, uzavreno
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

### KPI
- **Ucel:** Metrika pro rizeni vykonu ERP, obchodu, projektu a provozu.
- **Povinna pole:** definice, zdroj dat, vlastnik, frekvence, cil, trend, akce pri odchylce
- **Stavy:** navrh, schvaleno, mereno, odchylka, revize
- **Lidska kontrola:** Povinna pri dopadu na cenu, klienta, opravneni, reputaci, citliva data, audit nebo externi komunikaci.

## Vazby mezi kartami

- Firma ma Kontakty, Leady, Prilezitosti, Zakazky a Zakaznicke pozadavky.
- Lead/Poptavka se po kvalifikaci prevadi na Obchodni prilezitost.
- Obchodni prilezitost ma Schuzky, Nabidky a Follow-up ukoly.
- Nabidka se po schvaleni a vyhre prevadi na Zakazku.
- Zakazka ma Projekt, Milniky, Predani, Faktury, Casove reporty a Klientskou dokumentaci.
- Faktura se vaze na Zakazku, Firmu a Projekt.
- Projekt ma Ukoly, Milniky, Rizika, Incidenty a Reporty.
- Kampan ma Obsahove polozky, Leady a Vyhodnoceni.
- Zakaznicky pozadavek muze vytvorit Incident, Znalostni clanek nebo Eskalaci.
- Automatizace, AI funkce, Integrace, Incident a Change request se vazi na Riziko a Audit.

## Pravidlo

Cards slouzi pro strukturovana data, vztahy a reporting. Dlouhe metodiky a pravidla zustavaji v dokumentech. Operativni prace s vlastnikem, terminem a stavem patri do ukolu nebo akcnich polozek.
