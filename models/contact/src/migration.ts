//

import { Contact } from '@hcengineering/contact'
import { DOMAIN_TX, TxCreateDoc, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
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

async function setCreate (client: MigrationClient): Promise<void> {
  const docs = await client.find<Contact>(DOMAIN_CONTACT, {
    _class: { $in: [contact.class.Contact, contact.class.Organization, contact.class.Person, contact.class.Employee] },
    createOn: { $exists: false }
  })
  for (const doc of docs) {
    const tx = (
      await client.find<TxCreateDoc<Contact>>(DOMAIN_TX, {
        objectId: doc._id,
        _class: core.class.TxCreateDoc
      })
    )[0]
    if (tx !== undefined) {
      await client.update(
        DOMAIN_CONTACT,
        {
          _id: doc._id
        },
        {
          createOn: tx.modifiedOn
        }
      )
      await client.update(
        DOMAIN_TX,
        {
          _id: tx._id
        },
        {
          'attributes.createOn': tx.modifiedOn
        }
      )
    }
  }
}

export const contactOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await setCreate(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
  }
}
