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

import contact, { Contact, EmployeeAccount, Organization } from '@anticrm/contact'
import core, {
  BackupClient,
  BlobData,
  Client,
  DOMAIN_BLOB,
  generateId,
  MixinUpdate,
  Ref,
  SortingOrder,
  TxOperations,
  WithLookup
} from '@anticrm/core'
import lead, { Customer, Funnel, Lead } from '@anticrm/lead'
import { connect } from '@anticrm/server-tool'
import { readFile } from 'fs/promises'
import { updateClasses } from './classes'
import { CustomCustomer, FieldType } from './types'
import { filled, getValid, updateChannel } from './utils'

import task, { calcRank, DoneState, Sequence, State } from '@anticrm/task'
import { parse } from 'csv-parse'
import { updateStates } from './lead-importer'
import got from 'got'
import mimetypes from 'mime-types'
import attachment from '@anticrm/model-attachment'

const names = {
  companyName: 'Company Name',

  companyType: 'Company Type',
  processingStatus: 'Статус обработки',

  employees: 'Employees',
  corporate_website: 'Corporate Website',
  corporate_email: 'Корпоративный e-mail',
  workEmail: 'Work E-mail',

  responsible: 'Responsible',
  industry: 'Industry',
  currency: 'Currency',
  comment: 'Comment',
  createdBy: 'Created by',
  created: 'Created',
  modifiedBy: 'Modified by',
  modified: 'Modified',
  trelloLink: 'Ссылка на Trello',
  research: 'Ресеч',
  startCollaboration: 'Начало сотрудничества',
  geography: 'География',
  interestRate: 'Ставка вознаграждения',
  agreement: 'Договор',
  technologyStack: 'Стек технологий заказчика',
  fieldOfActivity: 'Сфера деятельности (Другое)',
  hrLanguage: 'Язык общения с заказчиком',
  selectionFeatures: 'Особенности подбора',
  source: 'Источник',
  clientActivityStatus: 'Статус активности клиента',
  valCompany: 'ВАЛ от компании (евро)'
}

const fieldMapping: Record<string, FieldType> = {
  Status: {
    name: 'status',
    type: core.class.EnumOf,
    enumName: 'CompanyStatus',
    label: core.string.Enum,
    fName: names.companyType
  },
  [names.employees]: {
    name: 'employees',
    type: core.class.EnumOf,
    enumName: 'CompanyEmployees',
    label: core.string.Enum,
    fName: names.employees
  },
  [names.responsible]: {
    name: 'responsible',
    type: core.class.EnumOf,
    enumName: 'CompanyResponsible',
    label: core.string.Enum,
    fName: names.responsible
  },
  [names.industry]: {
    name: 'industry',
    type: core.class.EnumOf,
    enumName: 'CompanyIndustry',
    label: core.string.Enum,
    fName: names.industry
  },
  [names.currency]: {
    name: 'currency',
    type: core.class.EnumOf,
    enumName: 'CompanyCurrency',
    label: core.string.Enum,
    fName: names.currency
  },
  [names.research]: {
    name: 'research',
    type: core.class.EnumOf,
    enumName: 'CompanyResearch',
    label: core.string.Enum,
    fName: names.research
  },
  [names.geography]: {
    name: 'geography',
    type: core.class.EnumOf,
    enumName: 'CompanyGeography',
    label: core.string.Enum,
    fName: names.geography
  },
  [names.interestRate]: {
    name: 'interestRate',
    type: core.class.EnumOf,
    enumName: 'CompanyInterestRate',
    label: core.string.Enum,
    fName: names.interestRate
  },
  [names.agreement]: {
    name: 'agreement',
    type: core.class.TypeString,
    label: core.string.String,
    fName: names.agreement
  },
  [names.comment]: {
    name: 'mainComment',
    type: core.class.TypeString,
    label: core.string.String,
    fName: names.comment
  },
  [names.trelloLink]: {
    name: 'trelloLink',
    type: core.class.TypeString,
    label: core.string.String,
    fName: names.trelloLink
  },
  [names.technologyStack]: {
    name: 'technologyStack',
    type: core.class.TypeString,
    label: core.string.String,
    fName: names.technologyStack
  },
  [names.fieldOfActivity]: {
    name: 'fieldOfActivity',
    type: core.class.TypeString,
    label: core.string.String,
    fName: names.fieldOfActivity
  },
  [names.hrLanguage]: {
    name: 'hrLanguage',
    type: core.class.EnumOf,
    enumName: 'CompanyHRLanguage',
    label: core.string.Enum,
    fName: names.interestRate
  },
  [names.selectionFeatures]: {
    name: 'selectionFeatures',
    type: core.class.EnumOf,
    enumName: 'CompanyInterestRate',
    label: core.string.Enum,
    fName: names.interestRate
  },
  [names.source]: {
    name: 'source',
    type: core.class.EnumOf,
    enumName: 'CompanySource',
    label: core.string.Enum,
    fName: names.source
  },
  [names.valCompany]: {
    name: 'interestRate',
    type: core.class.TypeString,
    label: core.string.String,
    fName: names.valCompany
  },
  [names.startCollaboration]: {
    name: 'startCollaboration',
    type: core.class.TypeString,
    label: core.string.Enum,
    fName: names.startCollaboration
  },
  [names.clientActivityStatus]: {
    name: 'clientActivityStatus',
    type: core.class.EnumOf,
    enumName: 'CompanyClientActivity',
    label: core.string.Enum,
    fName: names.clientActivityStatus
  }
}

export async function parseCSV (csvData: string): Promise<any[]> {
  return await new Promise((resolve, reject) => {
    parse(
      csvData,
      {
        delimiter: ';',
        columns: true,
        quote: '"',
        bom: true,
        cast: true,
        autoParse: true,
        castDate: false,
        skipEmptyLines: true,
        skipRecordsWithEmptyValues: true
      },
      (err, records) => {
        if (err !== undefined) {
          console.error(err)
          reject(err)
        }
        resolve(records)
      }
    )
  })
}

export async function importOrgs (transactorUrl: string, dbName: string, csvFile: string): Promise<void> {
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

    const client = new TxOperations(connection, 'core:account:lead-importer' as Ref<EmployeeAccount>)

    await updateClasses(client, records, fieldMapping)

    const funnelId = await createFunnel(records, client)

    const statusKaValues = records
      .map((it) => it[names.processingStatus])
      .filter((it, idx, arr) => arr.indexOf(it) === idx)
    console.log(statusKaValues)

    const wonStateFrom = 'Договор на рассмотрении'

    const states = [
      'Переговоры / назначен звонок',
      'Обсуждение условий в переписке',
      wonStateFrom,
      'Направлено первичное письмо по e-mail',
      'Направлен запрос в LinkedIn / другом канале'
    ]
    const wonStates = ['Договор заключен']
    const lostStates = ['Получен отказ', 'Перестал отвечать']

    const statesMap = new Map<string, State | DoneState>()

    // Create update/states
    await updateStates(client, states, task.class.State, funnelId, statesMap)
    await updateStates(client, wonStates, task.class.WonState, funnelId, statesMap)
    await updateStates(client, lostStates, task.class.LostState, funnelId, statesMap)

    if ((await client.findOne(task.class.Kanban, { attachedTo: funnelId })) === undefined) {
      await client.createDoc(task.class.Kanban, funnelId, {
        attachedTo: funnelId
      })
    }

    // Ok we have all states, let's create Leads.
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: lead.class.Lead })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    await createOrganizations(client, filledFields, connection, funnelId, statesMap, wonStateFrom, sequence)
  } catch (err: any) {
    console.error(err)
  } finally {
    await connection.close()
  }
}

async function createFunnel (records: any[], client: TxOperations): Promise<Ref<Funnel>> {
  const importedFunnelId = 'imported-funnel' as Ref<Funnel>
  let funnel = await client.findOne(lead.class.Funnel, { _id: importedFunnelId })
  if (funnel === undefined) {
    // No funnel, let's create one.
    await client.createDoc(
      lead.class.Funnel,
      core.space.Space,
      {
        name: 'Organizations',
        archived: false,
        members: [],
        private: false,
        description: ''
      },
      importedFunnelId
    )
    funnel = await client.findOne(lead.class.Funnel, { _id: importedFunnelId })
  }
  return importedFunnelId
}

export interface CustomOrg extends Customer {
  status: any
  clientActivityStatus: any

  employees: any

  responsible: any
  industry: any
  currency: any
  trelloLink: string
  research: any
  startCollaboration: string
  geography: any
  interestRate: any
  agreement: string
  technologyStack: string
  fieldOfActivity: string
  hrLanguage: any
  selectionFeatures: any
  source: any
  valCompany: any
}

async function createOrganizations (
  client: TxOperations,
  filledFields: any[],
  connection: Client & BackupClient,
  funnelId: Ref<Funnel>,
  statesMap: Map<string, State | DoneState>,
  wonStateFrom: string,
  sequence: WithLookup<Sequence>
): Promise<void> {
  for (const record of filledFields) {
    let orgId: Ref<Organization> = generateId()
    const orgName = record[names.companyName]
    if ((orgName?.toString() ?? '').trim().length === 0) {
      continue
    }
    const org = await client.findOne(lead.mixin.Customer, { name: orgName })
    console.log('processing', orgName)
    if (org === undefined) {
      await client.createDoc(
        contact.class.Organization,
        contact.space.Contacts,
        {
          name: orgName,
          city: '',
          members: 0
        },
        orgId as unknown as Ref<Organization>
      )
      await client.createMixin<Contact, CustomOrg>(
        orgId,
        contact.class.Organization,
        contact.space.Contacts,
        lead.mixin.Customer,
        {
          description: record[names.comment],
          status: record[names.companyType],
          clientActivityStatus: record[names.clientActivityStatus],

          employees: record[names.employees],

          responsible: record[names.responsible],
          industry: record[names.industry],
          currency: record[names.currency],
          trelloLink: record[names.trelloLink],
          research: record[names.research],
          startCollaboration: record[names.startCollaboration],
          geography: record[names.geography],
          interestRate: record[names.interestRate],
          agreement: record[names.agreement],
          technologyStack: record[names.technologyStack],
          fieldOfActivity: record[names.fieldOfActivity],
          hrLanguage: record[names.hrLanguage],
          selectionFeatures: record[names.selectionFeatures],
          source: record[names.source],
          valCompany: record[names.valCompany]
        }
      )
    } else {
      orgId = org._id as unknown as Ref<Organization>
      const upd: MixinUpdate<Contact, CustomCustomer> = {}
      const newValues = {
        description: record[names.comment],
        status: record[names.companyType],
        clientActivityStatus: record[names.clientActivityStatus],

        employees: record[names.employees],

        responsible: record[names.responsible],
        industry: record[names.industry],
        currency: record[names.currency],
        trelloLink: record[names.trelloLink],
        research: record[names.research],
        startCollaboration: record[names.startCollaboration],
        geography: record[names.geography],
        interestRate: record[names.interestRate],
        agreement: record[names.agreement],
        technologyStack: record[names.technologyStack],
        fieldOfActivity: record[names.fieldOfActivity],
        hrLanguage: record[names.hrLanguage],
        selectionFeatures: record[names.selectionFeatures],
        source: record[names.source],
        valCompany: record[names.valCompany]
      }
      for (const [k, v] of Object.entries(newValues)) {
        if ((org as any)[k] !== v && v !== undefined) {
          ;(upd as any)[k] = v
        }
      }
      if (Object.keys(upd).length > 0) {
        await client.updateMixin<Contact, CustomCustomer>(
          orgId,
          contact.class.Organization,
          contact.space.Contacts,
          lead.mixin.Customer,
          upd
        )
      }
    }

    await updateChannel(
      client,
      orgId,
      getValid(record, names.corporate_website),
      contact.channelProvider.Homepage,
      contact.class.Organization
    )
    await updateChannel(
      client,
      orgId,
      getValid(record, names.corporate_email),
      contact.channelProvider.Email,
      contact.class.Organization
    )
    await updateChannel(
      client,
      orgId,
      getValid(record, names.workEmail),
      contact.channelProvider.Email,
      contact.class.Organization
    )

    const state = statesMap.get(record[names.processingStatus])
    if (state !== undefined) {
      const leadState =
        state._class === task.class.State
          ? (state._id as Ref<State>)
          : (statesMap.get(wonStateFrom) as unknown as Ref<State>)
      const doneState =
        state._class === task.class.WonState || state._class === task.class.LostState
          ? (state._id as Ref<DoneState>)
          : null

      const orgLeadId = `imported-lead-${record.ID as string}` as Ref<Lead>
      const orgLead = await client.findOne(lead.class.Lead, { _id: orgLeadId })

      if (orgLead === undefined) {
        const lastOne = await client.findOne(
          lead.class.Lead,
          { state: leadState },
          { sort: { rank: SortingOrder.Descending } }
        )
        const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)
        await client.addCollection(
          lead.class.Lead,
          funnelId,
          orgId,
          lead.mixin.Customer,
          'leads',
          {
            title: orgName,
            number: (incResult as any).object.sequence,
            rank: calcRank(lastOne, undefined),
            assignee: null,
            startDate: null,
            dueDate: null,
            state: leadState,
            doneState
          },
          orgLeadId
        )
      }
    }

    const agreement = record[names.agreement] as string

    if (agreement !== undefined) {
      const agreements = agreement.split(',')
      for (const r of agreements) {
        try {
          const url = (r ?? '').trim()
          if (url.startsWith('http')) {
            const lastpos = url.lastIndexOf('/')
            const fname = url.substring(lastpos + 1)

            const buffer = await got(url).buffer()
            const blobId = (orgId + '_' + generateId()) as Ref<BlobData>
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
              orgId,
              contact.class.Organization,
              'attachments',
              {
                file: blobId,
                name: fname,
                size: buffer.length,
                type: type !== false ? type : 'unknown',
                lastModified: Date.now()
              }
            )
          }
        } catch (err) {
          console.log(err)
        }
      }
    }
  }
}
