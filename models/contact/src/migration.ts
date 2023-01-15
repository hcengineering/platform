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

import fetch from 'cross-fetch'

import {
  Employee,
  EmployeeAccount,
  AvatarType,
  buildGravatarId,
  checkHasGravatar,
  getAvatarColorForId
} from '@hcengineering/contact'
import { AccountRole, DOMAIN_TX, TxCreateDoc, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import contact from './index'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: contact.space.Employee
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Employees',
        description: 'Employees',
        private: false,
        archived: false,
        members: []
      },
      contact.space.Employee
    )
  }
  const contacts = await tx.findOne(core.class.Space, {
    _id: contact.space.Contacts
  })
  if (contacts === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Contacts',
        description: 'Contacts',
        private: false,
        archived: false,
        members: []
      },
      contact.space.Contacts
    )
  }
}

async function setActiveEmployeeTx (client: MigrationClient): Promise<void> {
  await client.update<TxCreateDoc<Employee>>(
    DOMAIN_TX,
    {
      _class: core.class.TxCreateDoc,
      objectClass: contact.class.Employee,
      'attributes.active': { $exists: false }
    },
    {
      'attributes.active': true
    }
  )
}

async function setRole (client: MigrationClient): Promise<void> {
  await client.update<TxCreateDoc<EmployeeAccount>>(
    DOMAIN_TX,
    {
      _class: core.class.TxCreateDoc,
      objectClass: contact.class.EmployeeAccount,
      'attributes.role': { $exists: false }
    },
    {
      'attributes.role': AccountRole.User
    }
  )
}

async function updateEmployeeAvatar (tx: TxOperations): Promise<void> {
  const accounts = await tx.findAll(contact.class.EmployeeAccount, {})
  const employees = await tx.findAll(contact.class.Employee, { _id: { $in: accounts.map((a) => a.employee) } })
  const employeesById = new Map(employees.map((it) => [it._id, it]))

  // set gravatar for users without avatar
  const promises = accounts.map(async (account) => {
    const employee = employeesById.get(account.employee)
    if (employee === undefined) return
    if (employee.avatar != null && employee.avatar !== undefined) return

    const gravatarId = buildGravatarId(account.email)
    const hasGravatar = await checkHasGravatar(gravatarId, fetch)

    await tx.update(employee, {
      avatar: hasGravatar
        ? `${AvatarType.GRAVATAR}://${gravatarId}`
        : `${AvatarType.COLOR}://${getAvatarColorForId(employee._id)}`
    })
  })
  await Promise.all(promises)
}

export const contactOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await setActiveEmployeeTx(client)
    await setRole(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
    await updateEmployeeAvatar(tx)
  }
}
