# Pravidla automatizaci pro Huly

Tento seznam zaloz jako samostatny provozni podklad pro automatizace. Kazde pravidlo musi mit vlastnika a musi posilat pouze alert, neprovadet rizikove rozhodnuti bez cloveka.

## Pravidla

[Lead bez aktivity 7 dni]
- Trigger: Lead/Poptavka nema novou aktivitu 7 dni.
- Podminka: Stav neni prevedeno, odmitnuto ani archiv.
- Akce: Poslat alert vlastnikovi leadu.
- Odpovedna osoba: Vlastnik leadu

[Nabidka ke schvaleni 48 hodin]
- Trigger: Nabidka zustane ve stavu ke schvaleni dele nez 48 hodin.
- Podminka: Schvalovatel je vyplneny a nabidka neni odeslana, vyhrana ani prohrana.
- Akce: Poslat alert schvalovateli.
- Odpovedna osoba: Schvalovatel nabidky

[SLA vyprsi za 24 hodin]
- Trigger: SLA zakaznickeho pozadavku vyprsi za 24 hodin.
- Podminka: Stav neni vyreseno ani uzavreno.
- Akce: Poslat alert resiteli.
- Odpovedna osoba: Resitel pozadavku

[Karta bez vlastnika 24 hodin]
- Trigger: Karta bez vlastnika existuje dele nez 24 hodin.
- Podminka: Karta neni archivovana, uzavrena ani vyrazena.
- Akce: Poslat alert adminovi.
- Odpovedna osoba: Admin Huly

[Projekt v riziku]
- Trigger: Projekt prejde do stavu v riziku.
- Podminka: Stav projektu je v riziku nebo health ukazuje vysoke riziko.
- Akce: Poslat alert PM a vedeni.
- Odpovedna osoba: PM projektu

[Zakazka s obnovou do 30 dni]
- Trigger: Zakazka ma datum obnovy do 30 dni.
- Podminka: Stav neni archiv ani dokonceno.
- Akce: Poslat alert obchodnikovi.
- Odpovedna osoba: Obchodnik zakazky

[Incident klient v triage dele nez 2 hodiny]
- Trigger: Incident s dopadem klient zustane v triage dele nez 2 hodiny.
- Podminka: Dopad = klient a stav = triage.
- Akce: Poslat alert vedeni.
- Odpovedna osoba: Vedeni
