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

import contact, { Person, PersonAccount, getFirstName, getLastName } from '@hcengineering/contact'
import core, { Account, Doc, Ref, Role, Tx, TxProcessor, TxUpdateDoc } from '@hcengineering/core'
import { getEmbeddedLabel, translate } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import setting, { Integration } from '@hcengineering/setting'

/**
 * @public
 */
export async function integrationHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  return await integrationTextPresenter(doc, control)
}

/**
 * @public
 */
export async function integrationTextPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const integration = doc as Integration
  const type = (await control.modelDb.findAll(setting.class.IntegrationType, { _id: integration.type }))[0]
  if (type === undefined) return ''
  const label = await translate(type.label, {})
  return `${label} (${integration.value})`
}

export async function getValue (control: TriggerControl, context: Record<string, Doc>): Promise<string | undefined> {
  const value = context[setting.class.Integration] as Integration
  if (value === undefined) return
  return value.value
}

async function getEmployee (control: TriggerControl, _id: Ref<Account>): Promise<Person | undefined> {
  const employeeAccount = control.modelDb.findAllSync(contact.class.PersonAccount, {
    _id: _id as Ref<PersonAccount>
  })[0]
  if (employeeAccount !== undefined) {
    const employee = (
      await control.findAll(control.ctx, contact.class.Person, {
        _id: employeeAccount.person
      })
    )[0]
    return employee
  }
}

export async function getOwnerFirstName (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const value = context[setting.class.Integration] as Integration
  if (value === undefined) return
  const employee = await getEmployee(control, value.modifiedBy)
  return employee != null ? getFirstName(employee.name) : undefined
}

export async function getOwnerLastName (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const value = context[setting.class.Integration] as Integration
  if (value === undefined) return
  const employee = await getEmployee(control, value.modifiedBy)
  return employee != null ? getLastName(employee.name) : undefined
}

export async function getOwnerPosition (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const value = context[setting.class.Integration] as Integration
  if (value === undefined) return
  const employee = await getEmployee(control, value.modifiedBy)
  if (employee !== undefined) {
    return control.hierarchy.as(employee, contact.mixin.Employee)?.position ?? undefined
  }
}

/**
 * @public
 */
export async function OnRoleNameUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = TxProcessor.extractTx(tx)
    const updateTx = actualTx as TxUpdateDoc<Role>

    if (updateTx.operations?.name === undefined) {
      continue
    }

    // Update the related mixin attribute
    const roleAttribute = await control.modelDb.findOne(core.class.Attribute, {
      name: updateTx.objectId
    })
    if (roleAttribute === undefined) {
      continue
    }

    result.push(
      control.txFactory.createTxUpdateDoc(core.class.Attribute, core.space.Model, roleAttribute._id, {
        label: getEmbeddedLabel(updateTx.operations.name)
      })
    )
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    IntegrationHTMLPresenter: integrationHTMLPresenter,
    IntegrationTextPresenter: integrationTextPresenter,
    GetValue: getValue,
    GetFirstName: getOwnerFirstName,
    GetLastName: getOwnerLastName,
    GetOwnerPosition: getOwnerPosition
  },
  trigger: {
    OnRoleNameUpdate
  }
})
