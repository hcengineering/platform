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
import core, { Class, DocumentUpdate, MixinUpdate, Ref, SortingOrder, TxOperations } from '@anticrm/core'
import lead, { Customer, Funnel, Lead } from '@anticrm/lead'
import { connect } from '@anticrm/server-tool'
import task, { calcRank, DoneState, genRanks, State } from '@anticrm/task'
import { readFile } from 'fs/promises'
import { updateClasses } from './classes'
import { CustomCustomer, FieldType } from './types'
import { filled } from './utils'

import { parseCSV } from './parseCSV'

const names = {
  orgName: 'Название компании',
  annualTurnover: 'Годовой оборот',
  currency: 'Валюта',
  comment: 'Комментарий',
  created_by: 'Кем создана',
  modified_by: 'Кем изменена',
  source_ka: 'Источник (где связь) для КА',
  corporate_site: 'Корпоративный сайт',
  employees_count: 'Кол-во сотрудников',
  activity_area: 'Сфера деятельности',
  company_type: 'Тип компании',
  processing_status: 'Статус обработки',
  corporate_email: 'Корпоративный e-mail',
  // Lead attrs
  assignee: 'Ответственный',
  startDate: 'Дата создания',
  modifyDate: 'Дата изменения',

  kaStatus: 'Статус для КА',
  responsible: 'Ответственный'
}

const fieldMapping: Record<string, FieldType> = {
  'Название компании': { name: 'name', type: core.class.TypeString, label: core.string.String },
  'Годовой оборот': { name: 'annual.turnover', type: core.class.TypeNumber, label: core.string.Number },
  Валюта: {
    name: 'currency',
    type: core.class.EnumOf,
    enumName: 'OrgCurrency',
    label: core.string.Enum
  },
  Комментарий: { name: 'comment', type: core.class.TypeMarkup, label: core.string.Markup },
  'Кем создана': { name: 'created_by', type: undefined, label: core.string.String },
  'Кем изменена': { name: 'modified_by', type: undefined, label: core.string.String },
  'Источник (где связь) для КА': { name: 'source_ka', type: core.class.TypeString, label: core.string.String },
  'Корпоративный сайт': { name: 'corporate_site', type: undefined, label: undefined },
  'Кол-во сотрудников': {
    name: 'employees_count',
    type: core.class.EnumOf,
    enumName: 'EmployeeCountType',
    label: core.string.Enum
  },
  'Сфера деятельности': {
    name: 'activity_area',
    type: core.class.EnumOf,
    enumName: 'ActivityArea',
    label: core.string.Enum
  },
  'Тип компании': {
    name: 'company_type',
    type: core.class.EnumOf,
    enumName: 'CompanyType',
    label: core.string.Enum
  },
  'Статус обработки': {
    name: 'processing_status',
    type: core.class.EnumOf,
    enumName: 'ProcessingStatus',
    label: core.string.Enum
  },
  'Корпоративный e-mail': {
    name: 'corporate_email',
    label: core.string.String
  },
  Ответственный: {
    name: 'responsible',
    type: core.class.EnumOf,
    enumName: 'ResponsiblePerson',
    label: core.string.Enum
  }
}

async function updateStates<T extends State | DoneState> (
  client: TxOperations,
  states: string[],
  _class: Ref<Class<T>>,
  importedFunnelId: Ref<Funnel>,
  statesMap: Map<string, State | DoneState>
): Promise<void> {
  // Create update/states
  const estates = await client.findAll<State | DoneState>(_class, { space: importedFunnelId })
  let i = 0
  const ranks = [...genRanks(states.length)]
  for (const st of states) {
    const ex = estates.find((it) => it.title === st)
    if (ex === undefined) {
      const id = await client.createDoc(_class, importedFunnelId, {
        title: st,
        color: i,
        rank: ranks[i]
      })
      statesMap.set(st, (await client.findOne(_class, { _id: id })) as T)
    } else {
      statesMap.set(st, ex)
    }
    i++
  }
}

export async function importLead (transactorUrl: string, dbName: string, csvFile: string): Promise<void> {
  const connection = await connect(transactorUrl, dbName)

  try {
    console.log('loading cvs document...')

    const csvData = await readFile(csvFile, 'utf-8')
    const records: any[] = await parseCSV(csvData)
    const uniqKeys: string[] = []
    const filledFields = records.map((it) => filled(it, uniqKeys))
    // console.log(filledFields)

    const client = new TxOperations(connection, 'core:account:lead-importer' as Ref<EmployeeAccount>)

    await updateClasses(client, records, fieldMapping)
    await createCustomers(client, filledFields)

    const importedFunnelId = await createFunnel(records, client)

    // Check create/update states
    const nonState = 'Не определено'
    const states = [nonState, 'Отправлен запрос', 'Отправлен инмейл', 'Принят запрос', 'Заинтересован']
    const wonStates = ['Won']
    const lostStates = ['Отказ', 'Не трогать', 'когда-то работали']

    const statesMap = new Map<string, State | DoneState>()

    // Create update/states
    await updateStates(client, states, task.class.State, importedFunnelId, statesMap)
    await updateStates(client, wonStates, task.class.WonState, importedFunnelId, statesMap)
    await updateStates(client, lostStates, task.class.LostState, importedFunnelId, statesMap)

    if ((await client.findOne(task.class.Kanban, { attachedTo: importedFunnelId })) === undefined) {
      await client.createDoc(task.class.Kanban, importedFunnelId, {
        attachedTo: importedFunnelId
      })
    }

    // Ok we have all states, let's create Leads.
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: lead.class.Lead })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    for (const record of filledFields) {
      const orgId = `imported-${record.ID as string}` as Ref<Customer>
      const orgLeadId = `imported-lead-${record.ID as string}` as Ref<Lead>
      const orgName = record[names.orgName] as string

      const orgLead = await client.findOne(lead.class.Lead, { _id: orgLeadId })
      console.log('processing', orgName)

      const state = statesMap.get(record[names.kaStatus])
      if (state === undefined) {
        throw new Error('create lead: state not found')
      }

      const leadState =
        state._class === task.class.State
          ? (state._id as Ref<State>)
          : (statesMap.get(nonState) as unknown as Ref<State>)
      const doneState =
        state._class === task.class.WonState || state._class === task.class.LostState
          ? (state._id as Ref<DoneState>)
          : null
      if (orgLead === undefined) {
        const lastOne = await client.findOne(
          lead.class.Lead,
          { state: leadState },
          { sort: { rank: SortingOrder.Descending } }
        )
        const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)
        await client.addCollection(
          lead.class.Lead,
          importedFunnelId,
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
      } else {
        const upd: DocumentUpdate<Lead> = {}
        const newValues = {
          state: leadState,
          doneState
        }
        for (const [k, v] of Object.entries(newValues)) {
          if ((orgLead as any)[k] !== v && v !== undefined) {
            ;(upd as any)[k] = v
          }
        }
        if (Object.keys(upd).length > 0) {
          await client.update(orgLead, upd)
        }
      }
    }
  } catch (err: any) {
    console.error(err)
  } finally {
    await connection.close()
  }
}
async function createFunnel (records: any[], client: TxOperations): Promise<Ref<Funnel>> {
  const statusKaValues = records.map((it) => it[names.kaStatus]).filter((it, idx, arr) => arr.indexOf(it) === idx)
  console.log(statusKaValues)

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

async function createCustomers (client: TxOperations, filledFields: any[]): Promise<void> {
  for (const record of filledFields) {
    const orgId = `imported-${record.ID as string}` as Ref<Customer>
    const orgName = record[names.orgName]
    const org = await client.findOne(lead.mixin.Customer, { _id: orgId })
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
      await client.createMixin<Contact, CustomCustomer>(
        orgId,
        contact.class.Organization,
        contact.space.Contacts,
        lead.mixin.Customer,
        {
          description: '',
          annualTurnover: record[names.annualTurnover],
          currency: record[names.currency],
          comment: record[names.comment],
          source_ka: record[names.source_ka],
          employees_count: record[names.employees_count],
          activity_area: record[names.activity_area],
          company_type: record[names.company_type],
          processing_status: record[names.processing_status],
          responsible: record[names.responsible]
        }
      )
    } else {
      const upd: MixinUpdate<Contact, CustomCustomer> = {}
      const newValues = {
        annualTurnover: record[names.annualTurnover],
        currency: record[names.currency],
        comment: record[names.comment],
        source_ka: record[names.source_ka],
        employees_count: record[names.employees_count],
        activity_area: record[names.activity_area],
        company_type: record[names.company_type],
        processing_status: record[names.processing_status],
        responsible: record[names.responsible]
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

    const email = record[names.corporate_email]
    if (email !== undefined) {
      const channels = await client.findAll(contact.class.Channel, { attachedTo: orgId })
      const emailPr = channels.find((it) => it.value === email)
      if (emailPr === undefined) {
        await client.addCollection(
          contact.class.Channel,
          contact.space.Contacts,
          orgId,
          contact.class.Organization,
          'channels',
          {
            value: email,
            provider: contact.channelProvider.Email
          }
        )
      }
    }

    const site = record[names.corporate_site]
    if (site !== undefined) {
      const channels = await client.findAll(contact.class.Channel, { attachedTo: orgId })
      const sitePr = channels.find((it) => it.value === site)
      if (sitePr === undefined) {
        await client.addCollection(
          contact.class.Channel,
          contact.space.Contacts,
          orgId,
          contact.class.Organization,
          'channels',
          {
            value: site,
            provider: contact.channelProvider.Homepage
          }
        )
      }
    }
  }
}
