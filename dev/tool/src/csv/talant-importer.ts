//
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import attachment, { Attachment } from '@hcengineering/attachment'
import contact, { combineName, Contact, EmployeeAccount, Person } from '@hcengineering/contact'
import core, {
  AnyAttribute,
  BackupClient,
  BlobData,
  Class,
  ClassifierKind,
  Client,
  Data,
  Doc,
  DOMAIN_BLOB,
  Enum,
  EnumOf,
  generateId,
  Ref,
  Timestamp,
  TxOperations,
  WithLookup
} from '@hcengineering/core'
import { Asset, getEmbeddedLabel, IntlString } from '@hcengineering/platform'
import recruit, { Candidate } from '@hcengineering/recruit'
import { ReconiDocument } from '@hcengineering/rekoni'
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'
import setting from '@hcengineering/setting'
import { readFile } from 'fs/promises'
import got from 'got'
import mimetypes from 'mime-types'
import { recognize, updateContacts, updateSkills } from '../recruit'
import { findOrUpdateAttached } from '../utils'
import { parseCSV } from './parseCSV'
import { FieldType } from './types'
import { filled, getValid, updateChannel } from './utils'

const names = {
  status: 'Status',
  fullName: 'Lead Name',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  birthDay: 'Date of birth',
  created: 'Created',
  kasource: 'Source',
  workEmail: 'Work E-mail',
  newsletterEmail: 'Newsletters email',
  otherEmail: 'Other E-mail',
  homeEmail: 'Home E-mail',
  telegram: 'Telegram account',
  vkAccount: 'VK account',
  skypeID: 'Skype ID',
  viberContact: 'Viber contact',
  otherContact: 'Other Contact',
  responsible: 'Responsible',
  resume: 'Резюме',
  profile: 'Ссылка на профайл',
  liveCountry: 'Страна проживания',
  phone: 'Телефон',
  phoneNumber: 'Номер телефона',
  githubPortfolio: 'Ссылка на гитхаб/портфолио',
  webSite: 'Веб-сайт',
  linkedRu1: 'Линкедин',
  englishLevel: 'Уровень английского',
  movedFromTrello: 'Полностью перенесен из Трелло',
  bot: 'С кем общался (бот)',
  research: 'Ресеч ',
  region: 'Регион',
  mainExperience: 'Опыт работы по основному стеку с года:',
  mainStack: 'Основной стек (выпадающий список)',
  extraStack: 'Доп.стек',
  education: 'Образование',
  relocationPreferences: 'Предпочтения по релокации',
  relocationIgnore: 'Какую компанию не предлагать! (или страну)',
  relocationWant: 'Какие страны/города рассматривает',
  language: 'Язык общения',
  languageExtra: 'Владение другими языками',
  seed: 'Посев',
  actualization: 'Актуализация (дата)',
  unsubscribe: 'Отказался от рассылки',
  companyName: 'Название компании (новое поле)'
}

const kaDetails = 'recruit:mixin:KADetails' as Ref<Class<Doc>>
const portfolioDetails = 'recruit:mixin:KAPortfolio' as Ref<Class<Doc>>
const techDetails = 'recruit:mixin:TechDetails' as Ref<Class<Doc>>
const locationDetails = 'recruit:mixin:CountryDetails' as Ref<Class<Doc>>

const fieldMapping: Record<string, FieldType> = {
  [names.fullName]: {
    name: 'fullName',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: contact.class.Person
  },
  [names.middleName]: {
    name: 'middleName',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: contact.class.Person
  },
  Language: {
    name: 'language',
    type: core.class.EnumOf,
    enumName: 'KAPrefferedLanguage',
    label: core.string.Enum,
    fName: names.language,
    sourceClass: contact.class.Person
  },
  [names.languageExtra]: {
    name: 'language_extra',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: contact.class.Person
  },

  [names.created]: { name: 'created', type: core.class.TypeDate, label: core.string.Date, sourceClass: kaDetails },
  [names.status]: {
    name: 'lead_status',
    type: core.class.EnumOf,
    enumName: 'KAStatus',
    label: core.string.Enum,
    sourceClass: kaDetails
  },
  [names.kasource]: {
    name: 'kasource',
    type: core.class.EnumOf,
    enumName: 'KASource',
    label: core.string.Enum,
    fName: names.kasource,
    sourceClass: kaDetails
  },
  [names.responsible]: {
    name: 'responsible',
    type: core.class.EnumOf,
    enumName: 'KAResponsible',
    label: core.string.Enum,
    sourceClass: kaDetails
  },
  [names.movedFromTrello]: {
    name: 'trello_moved',
    type: core.class.TypeBoolean,
    label: core.string.Boolean,
    sourceClass: kaDetails
  },
  [names.bot]: {
    name: 'bot',
    type: core.class.EnumOf,
    enumName: 'KABot',
    label: core.string.Enum,
    sourceClass: kaDetails
  },
  Ресерч: {
    name: 'research',
    type: core.class.EnumOf,
    enumName: 'KAResearch',
    label: core.string.Enum,
    fName: names.research,
    sourceClass: kaDetails
  },
  [names.seed]: {
    name: 'seed',
    type: core.class.EnumOf,
    enumName: 'KASeed',
    label: core.string.Enum,
    sourceClass: kaDetails
  },
  [names.actualization]: {
    name: 'actualization',
    type: core.class.TypeDate,
    label: core.string.Date,
    sourceClass: kaDetails
  },
  'Unsubscribe / Отказ от рассылки': {
    name: 'unsubscribe',
    type: core.class.TypeBoolean,
    label: core.string.Boolean,
    sourceClass: kaDetails
  },
  [names.companyName]: {
    name: 'company_name',
    type: core.class.TypeString,
    label: core.string.Boolean,
    sourceClass: kaDetails
  },

  [names.resume]: {
    name: 'resume',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: portfolioDetails
  },
  [names.profile]: {
    name: 'profile_link',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: portfolioDetails
  },
  [names.githubPortfolio]: {
    name: 'github_portfolio',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: portfolioDetails
  },
  [names.vkAccount]: {
    name: 'vk_account',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: portfolioDetails
  },
  [names.viberContact]: {
    name: 'viberContact',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: portfolioDetails
  },
  [names.otherContact]: {
    name: 'otherContact',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: portfolioDetails
  },

  'Основной Стек': {
    name: 'main_stack',
    type: core.class.EnumOf,
    enumName: 'KAMainTechStack',
    label: core.string.Enum,
    fName: names.mainStack,
    sourceClass: techDetails
  },
  [names.englishLevel]: {
    name: 'english_level',
    type: core.class.EnumOf,
    enumName: 'KAEnglishLevel',
    label: core.string.Enum,
    sourceClass: techDetails
  },
  [names.mainExperience]: {
    name: 'main_experience',
    type: core.class.TypeNumber,
    label: core.string.Number,
    sourceClass: techDetails
  },
  [names.extraStack]: {
    name: 'extra_stack',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: techDetails
  },
  [names.education]: {
    name: 'education',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: techDetails
  },

  Region: {
    name: 'region',
    type: core.class.EnumOf,
    enumName: 'KARegion',
    label: core.string.Enum,
    fName: names.region,
    sourceClass: locationDetails
  },
  [names.relocationPreferences]: {
    name: 'relocation_preferences',
    type: core.class.EnumOf,
    enumName: 'KARelocationPreferences',
    label: core.string.Enum,
    sourceClass: locationDetails
  },
  [names.relocationIgnore]: {
    name: 'relocation_ignore',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: locationDetails
  },
  [names.relocationWant]: {
    name: 'relocation_want',
    type: core.class.TypeString,
    label: core.string.String,
    sourceClass: locationDetails
  }
}

function getAttr (client: TxOperations, _class: Ref<Class<Doc>>, name: string): AnyAttribute | undefined {
  try {
    return client.getHierarchy().getAttribute(_class, name)
  } catch {
    return undefined
  }
}

export async function updateTalantClasses (
  client: TxOperations,
  records: any[],
  fieldMapping: Record<string, FieldType>,
  refClass: Ref<Class<Doc>> = recruit.mixin.Candidate
): Promise<void> {
  const allAttrs = client.getHierarchy().getAllAttributes(refClass)
  for (const [k, v] of Object.entries(fieldMapping)) {
    if (v.type === undefined) {
      continue
    }
    let attr = v.sourceClass === undefined ? allAttrs.get(v.name) : getAttr(client, v.sourceClass, v.name)
    if (attr === undefined) {
      try {
        if (!client.getHierarchy().isDerived(v.type, core.class.Type)) {
          // Skip channels mapping
          continue
        }
      } catch (any) {
        continue
      }
      // Create attr
      const data: Data<AnyAttribute> = {
        attributeOf: v.sourceClass ?? refClass,
        name: v.name,
        label: getEmbeddedLabel(k),
        isCustom: true,
        type: {
          _class: v.type,
          label: v.label ?? core.string.String
        }
      }
      if (client.getHierarchy().isDerived(v.type, core.class.EnumOf)) {
        ;(data.type as EnumOf).of = `recruit:class:${(v as any).enumName as string}` as Ref<Enum>
      }
      const attrId = ((v.sourceClass ?? refClass) + '.' + v.name) as Ref<AnyAttribute>
      await client.createDoc(core.class.Attribute, core.space.Model, data, attrId)
      attr = await client.findOne(core.class.Attribute, { _id: attrId })
    }
    if (attr === undefined) {
      continue
    }
    // Check update Enum/Values
    if (client.getHierarchy().isDerived(attr.type._class, core.class.EnumOf)) {
      const enumName = (v as any).enumName as string
      const enumId = `recruit:class:${enumName}` as Ref<Enum>
      let enumClass = await client.findOne(core.class.Enum, { _id: enumId })
      if (enumClass === undefined) {
        await client.createDoc(
          core.class.Enum,
          core.space.Model,
          {
            name: enumName,
            enumValues: []
          },
          enumId
        )
        enumClass = client.getModel().getObject(enumId)
      }
      // Check values
      const mapv = (v?: string): string =>
        (v?.toString() ?? '').trim().length === 0 ? 'не задано' : (v?.toString() ?? '').trim()
      const values = records
        .map((it) => it[v.fName ?? k])
        .map(mapv)
        .filter((it, idx, arr) => arr.indexOf(it) === idx)
      for (const v of values) {
        if (!enumClass.enumValues.includes(v)) {
          await client.update(enumClass, {
            $push: { enumValues: v }
          })
        }
      }
    }
  }
}

export async function importTalants (
  transactorUrl: string,
  dbName: string,
  csvFile: string,
  rekoniUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, dbName, undefined, {
    mode: 'backup'
  })) as unknown as Client & BackupClient

  try {
    console.log('loading cvs document...')

    const csvData = await readFile(csvFile, 'utf-8')
    const records: any[] = await parseCSV(csvData)
    const uniqKeys: string[] = []
    const filledFields = records.map((it) => filled(it, uniqKeys))
    // console.log(filledFields)

    const client = new TxOperations(connection, 'core:account:recruit-importer' as Ref<EmployeeAccount>)

    await createMissingClass(client, kaDetails, getEmbeddedLabel('KA Details'))
    await createMissingClass(client, portfolioDetails, getEmbeddedLabel('Portfolio'))
    await createMissingClass(client, techDetails, getEmbeddedLabel('Technology'))
    await createMissingClass(client, locationDetails, getEmbeddedLabel('Language & Relocations'))

    await updateTalantClasses(client, records, fieldMapping)
    await createTalants(client, filledFields, connection, rekoniUrl, generateToken('anticrm@hc.engineering', dbName))
  } catch (err: any) {
    console.error(err)
  } finally {
    await connection.close()
  }
}
async function createMissingClass (
  client: TxOperations,
  ref: Ref<Class<Doc>>,
  label: IntlString,
  icon?: Asset
): Promise<void> {
  const cl = await client.findOne(core.class.Class, { _id: ref })
  if (cl === undefined) {
    await client.createDoc(
      core.class.Mixin,
      core.space.Model,
      {
        extends: recruit.mixin.Candidate,
        label,
        kind: ClassifierKind.MIXIN,
        icon
      },
      ref
    )
    await client.createMixin(ref, core.class.Mixin, core.space.Model, setting.mixin.UserMixin, {})
  }
}

export interface KaDetailsTalant extends Candidate {
  created: Timestamp
  lead_status: any
  kasource: any
  responsible: any
  trello_moved: boolean
  bot: any
  research: any
  seed: any
  actualization: Timestamp
  unsubscribe: boolean
  company_name: string
}
export interface PortfolioDetailsTalant extends Candidate {
  resume: string
  profile_link: string
  github_portfolio: string
  vk_account: string
  viberContact: string
  otherContact: string
}

export interface TechDetailsTalant extends Candidate {
  main_stack: any
  english_level: any
  main_experience: number
  extra_stack: string
  education: string
}

export interface LocationDetailsTalant extends Candidate {
  region: any
  relocation_preferences: any
  relocation_ignore: string
  relocation_want: string
}

interface CustomPerson extends Person {
  fullName: string
  middleName: string
  language?: string
  language_extra?: string
}

async function createTalants (
  client: TxOperations,
  filledFields: any[],
  connection: Client & BackupClient,
  rekoniUrl: string,
  token: string
): Promise<void> {
  for (const record of filledFields) {
    const candidateId = `imported-${record.ID as string}` as Ref<Candidate>
    const leadName = record[names.fullName]
    const candidate = await client.findOne(recruit.mixin.Candidate, { _id: candidateId })
    console.log('processing', leadName)
    const dataKa = {
      created: new Date(record[names.created]).getTime(),
      lead_status: record[names.status],
      kasource: record[names.kasource],
      responsible: record[names.responsible],
      trello_moved: record[names.movedFromTrello] === 'yes',
      bot: record[names.bot],
      research: record[names.research],
      seed: record[names.seed],
      actualization: new Date(record[names.actualization]).getTime(),
      unsubscribe: record[names.unsubscribe] === 'yes',
      company_name: record[names.companyName]
    }
    const dataPortfolio = {
      resume: record[names.resume],
      profile_link: record[names.profile],
      github_portfolio: record[names.githubPortfolio],
      vk_account: record[names.vkAccount],
      viberContact: record[names.viberContact],
      otherContact: record[names.otherContact]
    }
    const dataTechStack = {
      main_stack: record[names.mainStack],
      english_level: record[names.englishLevel],
      main_experience: record[names.mainExperience],
      extra_stack: record[names.extraStack],
      education: record[names.education]
    }
    const dataLocationDetails = {
      region: record[names.region],
      relocation_preferences: record[names.relocationPreferences],
      relocation_ignore: record[names.relocationIgnore],
      relocation_want: record[names.relocationWant]
    }
    if (candidate !== undefined) {
      continue
    }
    const cdata = {
      name: combineName(record[names.firstName], record[names.lastName]),
      city: record[names.liveCountry],
      birthday: record[names.birthDay] !== '' ? new Date(record[names.birthDay]).getTime() : undefined,
      fullName: record[names.fullName],
      middleName: record[names.middleName],
      language: record[names.language],
      language_extra: record[names.languageExtra]
    }
    await client.createDoc<CustomPerson>(
      contact.class.Person,
      contact.space.Contacts,
      cdata,
      candidateId as unknown as Ref<CustomPerson>
    )

    await client.createMixin<Contact, Candidate>(
      candidateId,
      contact.class.Person,
      contact.space.Contacts,
      recruit.mixin.Candidate,
      {}
    )
    await client.createMixin<Contact, KaDetailsTalant>(
      candidateId,
      contact.class.Person,
      contact.space.Contacts,
      kaDetails,
      dataKa
    )
    await client.createMixin<Contact, PortfolioDetailsTalant>(
      candidateId,
      contact.class.Person,
      contact.space.Contacts,
      portfolioDetails,
      dataPortfolio
    )
    await client.createMixin<Contact, TechDetailsTalant>(
      candidateId,
      contact.class.Person,
      contact.space.Contacts,
      techDetails,
      dataTechStack
    )
    await client.createMixin<Contact, LocationDetailsTalant>(
      candidateId,
      contact.class.Person,
      contact.space.Contacts,
      locationDetails,
      dataLocationDetails
    )

    await updateChannel(
      client,
      candidateId,
      getValid(record, names.workEmail, names.homeEmail, names.newsletterEmail, names.otherEmail),
      contact.channelProvider.Email
    )
    await updateChannel(client, candidateId, getValid(record, names.webSite), contact.channelProvider.Homepage)
    await updateChannel(
      client,
      candidateId,
      getValid(record, names.phone, names.phoneNumber),
      contact.channelProvider.Phone
    )
    await updateChannel(client, candidateId, getValid(record, names.telegram), contact.channelProvider.Telegram)

    const ghval = getValid(record, names.githubPortfolio)
    if (ghval?.includes('https://github.com') ?? false) {
      await updateChannel(client, candidateId, ghval, contact.channelProvider.GitHub)
    }

    const profile = getValid(record, names.profile)
    if (profile?.includes('linkedin.com') ?? false) {
      await updateChannel(client, candidateId, profile, contact.channelProvider.LinkedIn)
    }

    const resume = record[names.resume] as string

    if (resume !== undefined) {
      const resumes = resume.split(',')
      for (const r of resumes) {
        try {
          const url = (r ?? '').trim()
          if (url.startsWith('http')) {
            const lastpos = url.lastIndexOf('/')
            const fname = url.substring(lastpos + 1)

            const buffer = await got(url).buffer()
            const blobId = (candidateId + '_' + generateId()) as Ref<BlobData>
            const type = mimetypes.contentType(fname)
            const data: BlobData = {
              _id: blobId,
              space: contact.space.Contacts,
              modifiedBy: client.txFactory.account,
              modifiedOn: Date.now(),
              _class: core.class.BlobData,
              name: fname,
              size: buffer.length,
              type: type !== false ? type : 'unknown',
              base64Data: buffer.toString('base64')
            }
            await connection.upload(DOMAIN_BLOB, [data])

            await client.addCollection(
              attachment.class.Attachment,
              contact.space.Contacts,
              candidateId,
              contact.class.Person,
              'attachments',
              {
                file: blobId,
                name: fname,
                size: buffer.length,
                type: type !== false ? type : 'unknown',
                lastModified: Date.now()
              }
            )

            const doc = await client.findOne(recruit.mixin.Candidate, { _id: candidateId })
            if (doc === undefined) {
              continue
            }
            if (type === 'application/pdf') {
              const document = await recognize(rekoniUrl, data.base64Data, token)
              if (document !== undefined) {
                if (document.title !== undefined) {
                  await client.updateMixin(doc._id, contact.class.Person, doc.space, recruit.mixin.Candidate, {
                    title: document.title
                  })
                }

                await updateAvatar(doc, document, connection, client)

                // Update contact
                await updateContacts(client, doc, document)

                // Update skills
                await updateSkills(client, doc, document)
              }
            }
          }
        } catch (err) {
          console.log(err)
        }
      }
    }
  }
}

async function updateAvatar (
  c: WithLookup<Candidate>,
  document: ReconiDocument,
  connection: Client & BackupClient,
  client: TxOperations
): Promise<void> {
  if (document.format !== 'headhunter' && document.format !== 'podbor') {
    // Only update avatar for this kind of resume formats.
    return
  }
  if (
    c.avatar === undefined &&
    document.avatar !== undefined &&
    document.avatarName !== undefined &&
    document.avatarFormat !== undefined
  ) {
    const attachId = `${c._id}.${document.avatarName}` as Ref<Attachment>
    // Upload new avatar for candidate
    const data = Buffer.from(document.avatar, 'base64')

    const bdata: BlobData = {
      _id: attachId as unknown as Ref<BlobData>,
      space: contact.space.Contacts,
      modifiedBy: client.txFactory.account,
      modifiedOn: Date.now(),
      _class: core.class.BlobData,
      name: document.avatarName,
      size: data.length,
      type: document.avatarFormat,
      base64Data: document.avatar
    }
    await connection.upload(DOMAIN_BLOB, [bdata])

    await findOrUpdateAttached<Attachment>(
      client,
      contact.space.Contacts,
      attachment.class.Photo,
      attachId,
      {
        name: document.avatarName,
        file: attachId,
        type: document.avatarFormat,
        size: data.length,
        lastModified: Date.now()
      },
      {
        attachedTo: c._id,
        attachedClass: contact.class.Person,
        collection: 'photos'
      }
    )
    await client.update(c, { avatar: attachId })
  }
}
