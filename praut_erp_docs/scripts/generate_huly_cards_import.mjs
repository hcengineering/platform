import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = new URL('../huly_unified_import/', import.meta.url).pathname
const reportPath = new URL('../huly_cards_import_report.md', import.meta.url).pathname

const primitive = {
  text: 'TypeString',
  long: 'TypeString',
  url: 'TypeString',
  email: 'TypeString',
  phone: 'TypeString',
  person: 'TypeString',
  date: 'TypeString',
  money: 'TypeNumber',
  number: 'TypeNumber',
  checkbox: 'TypeBoolean'
}

const commonEnums = {
  citlivost: ['verejne', 'interni', 'citlive'],
  priorita: ['nizka', 'stredni', 'vysoka', 'urgentni'],
  riziko: ['nizke', 'stredni', 'vysoke'],
  autonomie: ['navrh', 'asistence', 'poloautomat', 'automat pouze s kontrolou'],
  health: ['zeleny', 'zluty', 'cerveny', 'v riziku'],
  sla: ['4h', '24h', '3d', 'bez SLA'],
  typSpoluprace: ['projekt', 'retainer', 'support', 'jednorazove'],
  frekvence: ['denne', 'tydne', 'mesicne', 'kvartalne'],
  trend: ['roste', 'stabilni', 'klesa', 'odchylka'],
  typPozadavku: ['dotaz', 'pozadavek', 'problem', 'incident', 'zmena']
}

const cards = [
  {
    title: 'Firma',
    file: 'Firma.yaml',
    workflow: ['novy', 'aktivni', 'strategicky', 'neaktivni', 'archiv'],
    fields: [
      ['nazev', 'text'],
      ['ICO', 'text'],
      ['web', 'url'],
      ['segment', 'text'],
      ['stav vztahu', { enum: 'Firma stav vztahu', valuesFromWorkflow: true }],
      ['vlastnik', 'person'],
      ['citlivost', { enum: 'Citlivost', values: commonEnums.citlivost }]
    ]
  },
  {
    title: 'Kontakt',
    file: 'Kontakt.yaml',
    workflow: ['novy', 'aktivni', 'neaktivni', 'archiv'],
    fields: [
      ['jmeno', 'text'],
      ['firma', { ref: 'Firma.yaml' }],
      ['role', 'text'],
      ['email', 'email'],
      ['telefon', 'phone'],
      ['GDPR souhlas', 'checkbox'],
      ['vlastnik', 'person']
    ]
  },
  {
    title: 'Lead/Poptavka',
    file: 'Lead Poptavka.yaml',
    workflow: ['novy', 'kontaktovat', 'kvalifikace', 'prevedeno', 'odmitnuto', 'archiv'],
    fields: [
      ['zdroj', 'text'],
      ['firma', { ref: 'Firma.yaml' }],
      ['kontakt', { ref: 'Kontakt.yaml' }],
      ['potreba', 'long'],
      ['rozpocet', 'money'],
      ['termin', 'date'],
      ['priorita', { enum: 'Priorita', values: commonEnums.priorita }],
      ['stav', { enum: 'Lead Poptavka stav', valuesFromWorkflow: true }],
      ['dalsi krok', 'text']
    ]
  },
  {
    title: 'Obchodni prilezitost',
    file: 'Obchodni prilezitost.yaml',
    workflow: ['kvalifikace', 'analyza', 'nabidka', 'vyjednavani', 'vyhrano', 'prohrano'],
    fields: [
      ['faze', { enum: 'Obchodni prilezitost faze', valuesFromWorkflow: true }],
      ['hodnota', 'money'],
      ['pravdepodobnost', 'number'],
      ['ocekavane uzavreni', 'date'],
      ['riziko', { enum: 'Riziko uroven', values: commonEnums.riziko }],
      ['vlastnik', 'person']
    ]
  },
  {
    title: 'Nabidka',
    file: 'Nabidka.yaml',
    workflow: ['draft', 'interni kontrola', 'ke schvaleni', 'odeslano', 'vyhrano', 'prohrano'],
    fields: [
      ['klient', { ref: 'Firma.yaml' }],
      ['prilezitost', { ref: 'Obchodni prilezitost.yaml' }],
      ['rozsah', 'long'],
      ['cena', 'money'],
      ['platnost', 'date'],
      ['verze', 'text'],
      ['schvalovatel', 'person'],
      ['stav', { enum: 'Nabidka stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Zakazka',
    file: 'Zakazka.yaml',
    workflow: ['navrh', 'pripraveno', 'aktivni', 'pozastaveno', 'dokonceno', 'archiv'],
    fields: [
      ['klient', { ref: 'Firma.yaml' }],
      ['nabidka', { ref: 'Nabidka.yaml' }],
      ['PM', 'person'],
      ['start', 'date'],
      ['cilovy termin', 'date'],
      ['rozpocet hodin', 'number'],
      ['datum obnovy', 'date'],
      ['typ spoluprace', { enum: 'Typ spoluprace', values: commonEnums.typSpoluprace }],
      ['health', { enum: 'Health', values: commonEnums.health }],
      ['stav', { enum: 'Zakazka stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Faktura',
    file: 'Faktura.yaml',
    workflow: ['draft', 'vystavena', 'odeslano', 'zaplaceno', 'po splatnosti', 'storno'],
    fields: [
      ['cislo faktury', 'text'],
      ['zakazka', { ref: 'Zakazka.yaml' }],
      ['klient', { ref: 'Firma.yaml' }],
      ['vyse', 'money'],
      ['datum vystaveni', 'date'],
      ['datum splatnosti', 'date'],
      ['datum zaplaceni', 'date'],
      ['stav', { enum: 'Faktura stav', valuesFromWorkflow: true }],
      ['vlastnik', 'person']
    ]
  },
  {
    title: 'Projekt',
    file: 'Projekt.yaml',
    workflow: ['priprava', 'aktivni realizace', 'revize', 'klientske schvaleni', 'dokonceno'],
    fields: [
      ['zakazka', { ref: 'Zakazka.yaml' }],
      ['PM', 'person'],
      ['faze', { enum: 'Projekt faze', valuesFromWorkflow: true }],
      ['deadline', 'date'],
      ['skutecny cas', 'number'],
      ['blokery', 'long'],
      ['rizika', 'long']
    ]
  },
  {
    title: 'Zakaznicky pozadavek',
    file: 'Zakaznicky pozadavek.yaml',
    workflow: ['novy', 'triage', 'reseni', 'ceka na klienta', 'vyreseno', 'uzavreno'],
    fields: [
      ['klient', { ref: 'Firma.yaml' }],
      ['kontakt', { ref: 'Kontakt.yaml' }],
      ['typ', { enum: 'Typ zakaznickeho pozadavku', values: commonEnums.typPozadavku }],
      ['priorita', { enum: 'Priorita', values: commonEnums.priorita }],
      ['SLA', { enum: 'SLA', values: commonEnums.sla }],
      ['vlastnik', 'person'],
      ['stav', { enum: 'Zakaznicky pozadavek stav', valuesFromWorkflow: true }],
      ['dopad', 'long']
    ]
  },
  {
    title: 'Milnik',
    file: 'Milnik.yaml',
    workflow: ['navrh', 'planovany', 'aktivni', 'v riziku', 'dodany', 'akceptovany'],
    fields: [
      ['projekt', { ref: 'Projekt.yaml' }],
      ['vlastnik', 'person'],
      ['termin', 'date'],
      ['stav', { enum: 'Milnik stav', valuesFromWorkflow: true }],
      ['vystupy', 'long'],
      ['akceptacni kriterium', 'text']
    ]
  },
  {
    title: 'Predani',
    file: 'Predani.yaml',
    workflow: ['vyzadano', 'pripravuje se', 'ke kontrole', 'prijato', 'vraceno', 'dokonceno'],
    fields: [
      ['from role', 'text'],
      ['to role', 'text'],
      ['projekt', { ref: 'Projekt.yaml' }],
      ['deadline', 'date'],
      ['otevrene otazky', 'long'],
      ['potvrzeni prevzeti', 'text'],
      ['stav', { enum: 'Predani stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Zapis ze schuzky',
    file: 'Zapis ze schuzky.yaml',
    workflow: ['draft', 'ke kontrole', 'potvrzeno', 'akcni kroky otevrene', 'uzavreno'],
    fields: [
      ['datum', 'date'],
      ['ucastnici', 'number'],
      ['projekt/klient', 'text'],
      ['rozhodnuti', 'long'],
      ['akcni polozky', 'long'],
      ['citlivost', { enum: 'Citlivost', values: commonEnums.citlivost }],
      ['stav', { enum: 'Zapis ze schuzky stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Kampan',
    file: 'Kampan.yaml',
    workflow: ['navrh', 'priprava', 'aktivni', 'vyhodnoceni', 'uzavreno'],
    fields: [
      ['cil', 'text'],
      ['segment', 'text'],
      ['platformy', 'text'],
      ['start', 'date'],
      ['konec', 'date'],
      ['rozpocet', 'money'],
      ['stav', { enum: 'Kampan stav', valuesFromWorkflow: true }],
      ['KPI', { ref: 'KPI.yaml' }]
    ]
  },
  {
    title: 'Obsahova polozka',
    file: 'Obsahova polozka.yaml',
    workflow: ['napad', 'draft', 'kontrola', 'schvaleno', 'publikovano', 'archiv'],
    fields: [
      ['kampan', { ref: 'Kampan.yaml' }],
      ['format', 'text'],
      ['platforma', 'text'],
      ['autor', 'person'],
      ['termin', 'date'],
      ['stav', { enum: 'Obsahova polozka stav', valuesFromWorkflow: true }],
      ['publikovana URL', 'url']
    ]
  },
  {
    title: 'Znalostni clanek',
    file: 'Znalostni clanek.yaml',
    workflow: ['draft', 'overeno', 'publikovano', 'zastarale', 'archiv'],
    fields: [
      ['tema', 'text'],
      ['kategorie', 'text'],
      ['stav', { enum: 'Znalostni clanek stav', valuesFromWorkflow: true }],
      ['vlastnik', 'person'],
      ['posledni revize', 'date'],
      ['souvisejici pozadavky', { ref: 'Zakaznicky pozadavek.yaml', isArray: true }]
    ]
  },
  {
    title: 'Automatizace',
    file: 'Automatizace.yaml',
    workflow: ['navrh', 'schvaleno', 'aktivni', 'pozastaveno', 'vyrazeno'],
    fields: [
      ['spoustec', 'text'],
      ['vstup', 'text'],
      ['akce', 'text'],
      ['vystup', 'text'],
      ['autonomie', { enum: 'Autonomie', values: commonEnums.autonomie }],
      ['riziko', { enum: 'Riziko uroven', values: commonEnums.riziko }],
      ['fallback', 'long'],
      ['vlastnik', 'person'],
      ['stav', { enum: 'Automatizace stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'AI funkce',
    file: 'AI funkce.yaml',
    workflow: ['povoleno', 'povoleno se schvalenim', 'zakazano', 'pozastaveno'],
    fields: [
      ['vstup', 'text'],
      ['vystup', 'text'],
      ['autonomie', { enum: 'Autonomie', values: commonEnums.autonomie }],
      ['kontrolor', 'person'],
      ['citlivost', { enum: 'Citlivost', values: commonEnums.citlivost }],
      ['omezeni', 'long'],
      ['stav', { enum: 'AI funkce stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Integrace',
    file: 'Integrace.yaml',
    workflow: ['navrh', 'test', 'aktivni', 'pozastaveno', 'vyrazeno'],
    fields: [
      ['system', 'text'],
      ['ucel', 'text'],
      ['data', 'text'],
      ['smer synchronizace', 'text'],
      ['vlastnik', 'person'],
      ['opravneni', 'text'],
      ['riziko', { enum: 'Riziko uroven', values: commonEnums.riziko }],
      ['stav', { enum: 'Integrace stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Incident',
    file: 'Incident.yaml',
    workflow: ['detekovano', 'triage', 'reseni', 'obnova', 'postmortem', 'uzavreno'],
    fields: [
      ['zavaznost', 'text'],
      ['dopad', 'long'],
      ['system', { ref: 'Integrace.yaml' }],
      ['vlastnik', 'person'],
      ['workaround', 'long'],
      ['pricina', 'long'],
      ['napravna akce', 'long'],
      ['stav', { enum: 'Incident stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Change request',
    file: 'Change request.yaml',
    workflow: ['navrh', 'analyza', 'schvaleno', 'implementace', 'test', 'nasazeno', 'rollback'],
    fields: [
      ['duvod', 'long'],
      ['dopad', 'long'],
      ['riziko', { enum: 'Riziko uroven', values: commonEnums.riziko }],
      ['schvalovatel', 'person'],
      ['test', 'text'],
      ['nasazeni', 'text'],
      ['rollback', 'text'],
      ['stav', { enum: 'Change request stav', valuesFromWorkflow: true }]
    ]
  },
  {
    title: 'Riziko',
    file: 'Riziko.yaml',
    workflow: ['nove', 'vyhodnoceno', 'mitigace', 'monitoring', 'uzavreno'],
    fields: [
      ['oblast', 'text'],
      ['pravdepodobnost', 'number'],
      ['dopad', 'long'],
      ['vlastnik', 'person'],
      ['mitigace', 'long'],
      ['stav', { enum: 'Riziko stav', valuesFromWorkflow: true }],
      ['termin kontroly', 'date']
    ]
  },
  {
    title: 'KPI',
    file: 'KPI.yaml',
    workflow: ['navrh', 'schvaleno', 'mereno', 'odchylka', 'revize'],
    fields: [
      ['definice', 'long'],
      ['zdroj dat', 'text'],
      ['vlastnik', 'person'],
      ['frekvence', { enum: 'Frekvence', values: commonEnums.frekvence }],
      ['cil', 'text'],
      ['trend', { enum: 'Trend', values: commonEnums.trend }],
      ['akce pri odchylce', 'long']
    ]
  }
]

const associations = [
  ['Firma.yaml', 'Kontakt.yaml', 'kontakty', 'firma', '1:N'],
  ['Firma.yaml', 'Lead Poptavka.yaml', 'leady', 'firma', '1:N'],
  ['Firma.yaml', 'Obchodni prilezitost.yaml', 'prilezitosti', 'firma', '1:N'],
  ['Firma.yaml', 'Zakazka.yaml', 'zakazky', 'klient', '1:N'],
  ['Firma.yaml', 'Zakaznicky pozadavek.yaml', 'zakaznickePozadavky', 'klient', '1:N'],
  ['Lead Poptavka.yaml', 'Obchodni prilezitost.yaml', 'prilezitost', 'lead', '1:1'],
  ['Obchodni prilezitost.yaml', 'Nabidka.yaml', 'nabidky', 'prilezitost', '1:N'],
  ['Nabidka.yaml', 'Zakazka.yaml', 'zakazka', 'nabidka', '1:1'],
  ['Zakazka.yaml', 'Projekt.yaml', 'projekty', 'zakazka', '1:N'],
  ['Zakazka.yaml', 'Milnik.yaml', 'milniky', 'zakazka', '1:N'],
  ['Zakazka.yaml', 'Predani.yaml', 'predani', 'zakazka', '1:N'],
  ['Zakazka.yaml', 'Faktura.yaml', 'faktury', 'zakazka', '1:N'],
  ['Projekt.yaml', 'Milnik.yaml', 'milniky', 'projekt', '1:N'],
  ['Projekt.yaml', 'Riziko.yaml', 'rizika', 'projekt', '1:N'],
  ['Projekt.yaml', 'Incident.yaml', 'incidenty', 'projekt', '1:N'],
  ['Kampan.yaml', 'Obsahova polozka.yaml', 'obsahovePolozky', 'kampan', '1:N'],
  ['Kampan.yaml', 'Lead Poptavka.yaml', 'leady', 'kampan', '1:N'],
  ['Zakaznicky pozadavek.yaml', 'Incident.yaml', 'incident', 'zakaznickyPozadavek', '1:1'],
  ['Zakaznicky pozadavek.yaml', 'Znalostni clanek.yaml', 'znalostniClanky', 'zakaznickyPozadavek', '1:N'],
  ['Automatizace.yaml', 'Riziko.yaml', 'rizika', 'automatizace', 'N:N'],
  ['AI funkce.yaml', 'Riziko.yaml', 'rizika', 'aiFunkce', 'N:N'],
  ['Integrace.yaml', 'Riziko.yaml', 'rizika', 'integrace', 'N:N'],
  ['Incident.yaml', 'Riziko.yaml', 'rizika', 'incidenty', 'N:N'],
  ['Change request.yaml', 'Riziko.yaml', 'rizika', 'changeRequesty', 'N:N']
]

function yamlScalar (value) {
  if (/^[A-Za-z0-9_. /-]+$/.test(value) && !value.includes(':')) return value
  return JSON.stringify(value)
}

function enumFileName (name) {
  return `enum-${name.toLowerCase().replaceAll('/', ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.yaml`
}

function renderEnum (title, values) {
  return [
    'class: core:class:Enum',
    `title: ${yamlScalar(title)}`,
    'values:',
    ...values.map((value) => `  - ${yamlScalar(value)}`),
    ''
  ].join('\n')
}

function renderCard (card) {
  const lines = ['class: card:class:MasterTag', `title: ${yamlScalar(card.title)}`, 'properties:']
  for (const [label, spec] of card.fields) {
    lines.push(`  - label: ${yamlScalar(label)}`)
    if (typeof spec === 'string') {
      lines.push(`    type: ${primitive[spec]}`)
    } else if (spec.ref !== undefined) {
      lines.push(`    refTo: ${JSON.stringify(`./${spec.ref}`)}`)
      if (spec.isArray === true) lines.push('    isArray: true')
    } else if (spec.enum !== undefined) {
      lines.push(`    enumOf: ${JSON.stringify(`./${enumFileName(spec.enum)}`)}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

function renderAssociation ([typeA, typeB, nameA, nameB, type]) {
  return [
    'class: core:class:Association',
    `typeA: ${JSON.stringify(`./${typeA}`)}`,
    `typeB: ${JSON.stringify(`./${typeB}`)}`,
    `nameA: ${nameA}`,
    `nameB: ${nameB}`,
    `type: ${JSON.stringify(type)}`,
    ''
  ].join('\n')
}

function collectEnums () {
  const enums = new Map()
  for (const card of cards) {
    for (const [, spec] of card.fields) {
      if (typeof spec === 'object' && spec.enum !== undefined) {
        enums.set(spec.enum, spec.valuesFromWorkflow === true ? card.workflow : spec.values)
      }
    }
  }
  return enums
}

function removeGenerated () {
  for (const file of readdirSync(outDir)) {
    if (
      file.startsWith('enum-') ||
      file.startsWith('association-') ||
      cards.some((card) => card.file === file)
    ) {
      rmSync(join(outDir, file), { force: true })
    }
  }
}

removeGenerated()
mkdirSync(outDir, { recursive: true })

for (const [name, values] of collectEnums()) {
  writeFileSync(join(outDir, enumFileName(name)), renderEnum(name, values))
}

for (const card of cards) {
  writeFileSync(join(outDir, card.file), renderCard(card))
}

associations.forEach((association, index) => {
  writeFileSync(join(outDir, `association-${String(index + 1).padStart(2, '0')}.yaml`), renderAssociation(association))
})

const importableLimitations = [
  'Unified importer supports Card type properties, enums, references and associations.',
  'Required-field enforcement is not represented in this Unified import schema and must be checked in Huly Settings -> TYPES after import.',
  'Saved Card views are not represented in this Unified import schema and must be configured manually: Aktivni, Bez vlastnika, Ke schvaleni, Riziko, Obnovy do 60 dni, Moje.',
  'Workflow/status values are imported as enum-backed attributes where the source schema exposes stav/faze/stav vztahu/health/trend.',
  'Person/date/url/email/phone fields are represented as strings because this importer schema accepts only TypeString, TypeNumber, TypeBoolean, enumOf and refTo.'
]

const report = [
  '# Huly Cards import report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'Source of truth:',
  '- PRAUT_PROSTREDI.md',
  '- IMPORT_CHECKLIST.md',
  '- copy_paste_import/09-cards-schema.md',
  '- copy_paste_import/11-cards-setup-guide.md',
  '',
  'Generated artifacts:',
  `- ${cards.length} Card type YAML files`,
  `- ${collectEnums().size} enum YAML files`,
  `- ${associations.length} association YAML files`,
  '',
  'Card types:',
  ...cards.map((card) => `- ${card.title}: ${card.fields.length} fields`),
  '',
  'Importer limitations / manual follow-up:',
  ...importableLimitations.map((item) => `- ${item}`),
  '',
  'Validation checklist after actual Huly import:',
  '- 8 document teamspaces exist.',
  '- 80 documents are present.',
  '- 22 Card types exist under Settings -> TYPES, not as normal Card instances.',
  '- Nabidka has schvalovatel and cannot be sent without human approval.',
  '- Predani cannot be completed without potvrzeni prevzeti.',
  '- AI funkce uses povoleno se schvalenim or zakazano for risky decisions.',
  '- Control scenarios in copy_paste_import/10-control-scenarios.md pass end to end.',
  ''
].join('\n')

writeFileSync(reportPath, report)

console.log(`Generated ${cards.length} card types, ${collectEnums().size} enums and ${associations.length} associations.`)
