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

import contact, { Contact, EmployeeAccount, Organization } from '@hcengineering/contact'
import core, { generateId, MixinUpdate, Ref, TxOperations } from '@hcengineering/core'
import lead from '@hcengineering/lead'
import { connect } from '@hcengineering/server-tool'
import { readFile } from 'fs/promises'
import { updateClasses } from './classes'
import { CustomCustomer, FieldType } from './types'
import { filled } from './utils'

import { parse } from 'csv-parse'
import parsePhoneNumber from 'libphonenumber-js'
import addrs from 'email-addresses'

const names = {
  orgName: 'название компании',
  corporate_site: 'сайт компании',
  contact_person: 'контактное лицо',
  contacts: 'контакты',
  dialog_area: 'место диалога: ССеть, почта, ТГ',
  sales_manager: 'seles-менеджер',
  bot_account: 'бот аккаунт',
  description: 'договорённости, доп. инфа о компаниии, вакансии',
  hh_link: 'ссылка hh'
}

const fieldMapping: Record<string, FieldType> = {
  'Место диалога': {
    name: 'dialog_area',
    type: core.class.EnumOf,
    enumName: 'CompanyDialogArea',
    label: core.string.Enum,
    fName: names.dialog_area
  },
  'Sales Manager': {
    name: 'sales_manager',
    type: core.class.EnumOf,
    enumName: 'CompanySalesManager',
    label: core.string.Enum,
    fName: names.sales_manager
  },
  'Бот Аккаунт': {
    name: 'bot_account',
    type: core.class.EnumOf,
    enumName: 'CompanyBotAccount',
    label: core.string.Enum,
    fName: names.bot_account
  },
  'Контактное Лицо': {
    name: 'contact_person',
    type: core.class.TypeString,
    label: core.string.String
  },
  Контакты: {
    name: 'contacts',
    type: core.class.TypeString,
    label: core.string.String
  }
}

export async function parseCSV (csvData: string): Promise<any[]> {
  return await new Promise((resolve, reject) => {
    parse(
      csvData,
      {
        delimiter: ',',
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

export async function importLead2 (transactorUrl: string, dbName: string, csvFile: string): Promise<void> {
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
  } catch (err: any) {
    console.error(err)
  } finally {
    await connection.close()
  }
}

async function createCustomers (client: TxOperations, filledFields: any[]): Promise<void> {
  for (const record of filledFields) {
    let orgId: Ref<Organization> = generateId()
    const orgName = record[names.orgName]
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
      await client.createMixin<Contact, CustomCustomer>(
        orgId,
        contact.class.Organization,
        contact.space.Contacts,
        lead.mixin.Customer,
        {
          description: record[names.description],
          dialog_area: record[names.dialog_area],
          sales_manager: record[names.sales_manager],
          bot_account: record[names.bot_account],
          contacts: record[names.contacts],
          contact_person: record[names.contact_person]
        }
      )
    } else {
      orgId = org._id as unknown as Ref<Organization>
      const upd: MixinUpdate<Contact, CustomCustomer> = {}
      const newValues = {
        description: record[names.description],
        dialog_area: record[names.dialog_area],
        sales_manager: record[names.sales_manager],
        bot_account: record[names.bot_account],
        contact_person: record[names.contact_person]
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

    const contacts: string = record[names.contacts]

    let dta: string = contacts?.toString() ?? ''
    if (dta.length > 0) {
      dta = dta.replace('.ru ', '.ru\n')
      dta = dta.replace('.com ', '.com\n')
      dta = dta.replace('+', '\n+')
      dta = dta.replace(',', '\n')
      dta = dta.replace('|', '\n')
      dta = dta.replace('  ', '\n')
      dta = dta.replace('Email:', '\n')
      dta = dta.replace('Email:', '\n')
      const res = dta
        .split('\n')
        .map((it) => it.trim())
        .filter((it) => it.length > 0)
      // console.log('\t', res)
      for (const r of res) {
        const phone = parsePhoneNumber(r)
        if (phone !== undefined) {
          const iphone = phone.formatInternational()
          const channels = await client.findAll(contact.class.Channel, { attachedTo: orgId })
          const emailPr = channels.find((it) => it.value === iphone)

          if (emailPr === undefined) {
            await client.addCollection(
              contact.class.Channel,
              contact.space.Contacts,
              orgId,
              contact.class.Organization,
              'channels',
              {
                value: iphone,
                provider: contact.channelProvider.Phone
              }
            )
          }
        }

        const parsedddr = addrs.parseOneAddress(r)
        if (parsedddr != null) {
          const email = r.trim()
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
        }
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
