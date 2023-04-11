//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { employeeByIdStore, getContactChannel } from '@hcengineering/contact-resources'
import { Ref, getCurrentAccount } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import contact, { EmployeeAccount } from '@hcengineering/contact'
import { TemplateDataProvider } from '@hcengineering/templates'
import { get } from 'svelte/store'
import setting from '@hcengineering/setting'

export async function getCurrentEmployeeTG (): Promise<string | undefined> {
  const me = getCurrentAccount() as EmployeeAccount
  const client = getClient()
  const employee = await client.findOne(contact.class.Employee, { _id: me.employee })
  if (employee !== undefined) {
    return await getContactChannel(employee, contact.channelProvider.Telegram)
  }
}

export async function getIntegrationOwnerTG (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return
  const client = getClient()
  const employeeAccount = await client.findOne(contact.class.EmployeeAccount, {
    _id: value.modifiedBy as Ref<EmployeeAccount>
  })
  if (employeeAccount !== undefined) {
    const employee = get(employeeByIdStore).get(employeeAccount.employee)
    if (employee !== undefined) {
      return await getContactChannel(employee, contact.channelProvider.Telegram)
    }
  }
}
