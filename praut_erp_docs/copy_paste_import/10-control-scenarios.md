# Kontrolni scenare po importu

Tyto scenare projdi po zalozeni prostoru, dokumentu a Cards. Cilem je overit, ze informace nezustavaji jen v chatu a ze rizikove kroky vyzaduji lidske schvaleni.

## 1. Lead -> zakazka -> faktura -> projekt
- [ ] Zalozit testovaci Firmu a Kontakt.
- [ ] Zalozit Lead/Poptavku s vazbou na Firmu a Kontakt.
- [ ] Prevest Lead na Obchodni prilezitost.
- [ ] Vytvorit Nabidku.
- [ ] Overit, ze cena a odeslani nabidky vyzaduji lidske schvaleni.
- [ ] Po vyhre zalozit Zakazku s polem `datum obnovy` a `typ spoluprace`.
- [ ] Zalozit Fakturu navazanou na Zakazku, Firmu a Projekt.
- [ ] Overit, ze Faktura umi stavy draft, vystavena, odeslano, zaplaceno, po splatnosti a storno.
- [ ] Overit, ze odeslani, upominku a storno Faktury potvrzuje clovek.
- [ ] Zalozit Projekt, prvni Milnik a Predani.
- [ ] Overit, ze Projekt ma vlastnika, stav, vazbu na Zakazku a navazne ukoly.

## 2. Zakaznicky pozadavek -> incident -> znalostni clanek
- [ ] Zalozit Zakaznicky pozadavek s prioritou a SLA.
- [ ] Eskalovat problem podle pravidel pro zakaznicke problemy.
- [ ] Pokud ma provozni dopad, zalozit Incident.
- [ ] Po vyreseni vytvorit Znalostni clanek.
- [ ] Navazat Znalostni clanek na puvodni pozadavek a Incident.
- [ ] Overit, ze klientskou komunikaci a uzavreni potvrzuje clovek.

## 3. Meeting -> ukoly -> casovy report
- [ ] Zalozit Zapis ze schuzky.
- [ ] Doplnit rozhodnuti a akcni polozky.
- [ ] Prevest akcni polozky na ukoly.
- [ ] Naplanovat ukol v osobnim planovaci.
- [ ] Po dokonceni doplnit skutecny cas.
- [ ] Overit casovy report a vazbu na projekt.
- [ ] Overit, ze dulezita rozhodnuti jsou v dokumentu nebo kartach, ne pouze v chatu.

## 4. Obnovy a fakturace
- [ ] Zalozit Zakazku s datumem obnovy do 60 dni.
- [ ] Overit pohled `Obnovy do 60 dni`.
- [ ] Zalozit Zakazku s datumem obnovy do 30 dni.
- [ ] Overit alert obchodnikovi podle automation pravidla.
- [ ] Overit, ze dokoncena nebo archivovana Zakazka v pohledu obnov neni.

## 5. Automation pravidla
- [ ] Lead bez aktivity 7 dni posle alert vlastnikovi.
- [ ] Nabidka ve stavu `ke schvaleni` dele nez 48 hodin posle alert schvalovateli.
- [ ] SLA zakaznickeho pozadavku, ktera vyprsi za 24 hodin, posle alert resiteli.
- [ ] Karta bez vlastnika dele nez 24 hodin posle alert adminovi.
- [ ] Projekt ve stavu `v riziku` posle alert PM a vedeni.
- [ ] Zakazka s datem obnovy do 30 dni posle alert obchodnikovi.
- [ ] Incident s dopadem `klient` v triage dele nez 2 hodiny posle alert vedeni.
- [ ] Overit, ze vsechna pravidla pouze posilaji alert a neprovadeji rizikove rozhodnuti.
