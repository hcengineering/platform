//

import { Class, DOMAIN_TX, Doc, Domain, Ref, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import { DOMAIN_COMMENT } from '@hcengineering/model-chunter'
import core from '@hcengineering/model-core'
import { DOMAIN_VIEW } from '@hcengineering/model-view'
import contact, { DOMAIN_CONTACT } from './index'

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
  const employees = await client.findAll(contact.mixin.Employee, {})
  const channels = await client.findAll(contact.class.Channel, {
    provider: contact.channelProvider.Email,
    attachedTo: { $in: employees.map((p) => p._id) }
  })
  const channelsMap = new Map(channels.map((p) => [p.attachedTo, p]))
  for (const employee of employees) {
    const acc = await client.findOne(contact.class.PersonAccount, { person: employee._id })
    if (acc === undefined) continue
    const current = channelsMap.get(employee._id)
    if (current === undefined) {
      await client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        employee._id,
        contact.mixin.Employee,
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
  async migrate (client: MigrationClient): Promise<void> {
    await client.update(
      DOMAIN_TX,
      {
        objectClass: 'contact:class:EmployeeAccount'
      },
      {
        $rename: { 'attributes.employee': 'attributes.person' },
        $set: { objectClass: contact.class.PersonAccount }
      }
    )

    await client.update(
      DOMAIN_TX,
      {
        objectClass: 'contact:class:Employee'
      },
      {
        $set: { objectClass: contact.mixin.Employee }
      }
    )

    await client.update(
      DOMAIN_TX,
      {
        'tx.attributes.backlinkClass': 'contact:class:Employee'
      },
      {
        $set: { 'tx.attributes.backlinkClass': contact.mixin.Employee }
      }
    )

    await client.update(
      DOMAIN_TX,
      {
        'tx.attributes.backlinkClass': 'contact:class:Employee'
      },
      {
        $set: { 'tx.attributes.backlinkClass': contact.mixin.Employee }
      }
    )

    await client.update(
      DOMAIN_TX,
      {
        objectClass: core.class.Attribute,
        'attributes.type.to': 'contact:class:Employee'
      },
      {
        $set: { 'attributes.type.to': contact.mixin.Employee }
      }
    )
    await client.update(
      DOMAIN_TX,
      {
        objectClass: core.class.Attribute,
        'operations.type.to': 'contact:class:Employee'
      },
      {
        $set: { 'operations.type.to': contact.mixin.Employee }
      }
    )

    await client.update(
      DOMAIN_TX,
      {
        'attributes.extends': 'contact:class:Employee'
      },
      {
        $set: { 'attributes.extends': contact.mixin.Employee }
      }
    )

    for (const d of client.hierarchy.domains()) {
      await client.update(
        d,
        { attachedToClass: 'contact:class:Employee' },
        { $set: { attachedToClass: contact.mixin.Employee } }
      )
    }
    await client.update(
      DOMAIN_COMMENT,
      { backlinkClass: 'contact:class:Employee' },
      { $set: { backlinkClass: contact.mixin.Employee } }
    )
    await client.update(
      'tags' as Domain,
      { targetClass: 'contact:class:Employee' },
      { $set: { targetClass: contact.mixin.Employee } }
    )
    await client.update(
      DOMAIN_VIEW,
      { filterClass: 'contact:class:Employee' },
      { $set: { filterClass: contact.mixin.Employee } }
    )
    await client.update(
      DOMAIN_CONTACT,
      {
        _class: 'contact:class:Employee' as Ref<Class<Doc>>
      },
      {
        $rename: {
          active: `${contact.mixin.Employee as string}.active`,
          statuses: `${contact.mixin.Employee as string}.statuses`,
          displayName: `${contact.mixin.Employee as string}.displayName`,
          position: `${contact.mixin.Employee as string}.position`
        },
        $set: {
          _class: contact.class.Person
        }
      }
    )
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
    await createEmployeeEmail(tx)
  }
}
