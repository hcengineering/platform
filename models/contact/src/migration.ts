//

import { TxOperations } from '@hcengineering/core'
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

async function createEmployeeEmail (client: TxOperations): Promise<void> {
  const employees = await client.findAll(contact.class.Employee, {})
  const channels = await client.findAll(contact.class.Channel, {
    provider: contact.channelProvider.Email,
    attachedTo: { $in: employees.map((p) => p._id) }
  })
  const channelsMap = new Map(channels.map((p) => [p.attachedTo, p]))
  for (const employee of employees) {
    const acc = await client.findOne(contact.class.EmployeeAccount, { employee: employee._id })
    if (acc === undefined) continue
    const current = channelsMap.get(employee._id)
    if (current === undefined) {
      await client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        employee._id,
        contact.class.Employee,
        'channels',
        {
          provider: contact.channelProvider.Email,
          value: acc.email.trim()
        },
        undefined,
        employee.modifiedOn
      )
    } else if (current.value !== acc.email.trim()) {
      await client.update(current, { value: acc.email.trim() }, false, current.modifiedOn)
    }
  }
}

export const contactOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
    await createEmployeeEmail(tx)
  }
}
