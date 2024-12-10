//

import { AvatarType, type Contact, type Person, type PersonSpace } from '@hcengineering/contact'
import {
  type Class,
  type Doc,
  type Domain,
  DOMAIN_TX,
  generateId,
  type Ref,
  type Space,
  TxOperations
} from '@hcengineering/core'
import {
  createDefaultSpace,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationUpgradeClient,
  type ModelLogger,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import activity, { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_VIEW } from '@hcengineering/model-view'

import contact, { contactId, DOMAIN_CONTACT } from './index'

async function createEmployeeEmail (client: TxOperations): Promise<void> {
  const employees = await client.findAll(contact.mixin.Employee, {})
  const channels = (
    await client.findAll(contact.class.Channel, {
      attachedTo: { $in: employees.map((p) => p._id) }
    })
  ).filter((it) => it.provider === contact.channelProvider.Email)
  const channelsMap = new Map(channels.map((p) => [p.attachedTo, p]))
  for (const employee of employees) {
    const acc = client.getModel().getAccountByPersonId(employee._id)
    if (acc.length === 0) continue
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
          value: acc[0].email.trim()
        },
        undefined,
        employee.modifiedOn
      )
    } else if (current.value !== acc[0].email.trim()) {
      await client.update(current, { value: acc[0].email.trim() }, false, current.modifiedOn)
    }
  }
}

const colorPrefix = 'color://'
const gravatarPrefix = 'gravatar://'

async function migrateAvatars (client: MigrationClient): Promise<void> {
  const classes = client.hierarchy.getDescendants(contact.class.Contact)
  const i = await client.traverse<Contact>(DOMAIN_CONTACT, {
    _class: { $in: classes },
    avatar: { $regex: 'color|gravatar://.*' }
  })
  try {
    while (true) {
      const docs = await i.next(50)
      if (docs === null || docs?.length === 0) {
        break
      }
      const updates: { filter: MigrationDocumentQuery<Contact>, update: MigrateUpdate<Contact> }[] = []
      for (const d of docs) {
        if (d.avatar?.startsWith(colorPrefix) ?? false) {
          d.avatarProps = { color: d.avatar?.slice(colorPrefix.length) ?? '' }
          updates.push({
            filter: { _id: d._id },
            update: {
              avatarType: AvatarType.COLOR,
              avatar: null,
              avatarProps: { color: d.avatar?.slice(colorPrefix.length) ?? '' }
            }
          })
        } else if (d.avatar?.startsWith(gravatarPrefix) ?? false) {
          updates.push({
            filter: { _id: d._id },
            update: {
              avatarType: AvatarType.GRAVATAR,
              avatar: null,
              avatarProps: { url: d.avatar?.slice(gravatarPrefix.length) ?? '' }
            }
          })
        }
      }
      if (updates.length > 0) {
        await client.bulk(DOMAIN_CONTACT, updates)
      }
    }
  } finally {
    await i.close()
  }

  await client.update(
    DOMAIN_CONTACT,
    { _class: { $in: classes }, avatarKind: { $exists: false } },
    { avatarKind: AvatarType.IMAGE }
  )
}

async function createPersonSpaces (client: MigrationClient): Promise<void> {
  const spaces = await client.find<PersonSpace>(DOMAIN_SPACE, { _class: contact.class.PersonSpace })

  if (spaces.length > 0) {
    return
  }

  const accounts = await client.model.findAll(contact.class.PersonAccount, {})
  const employees = await client.find(DOMAIN_CONTACT, { [contact.mixin.Employee]: { $exists: true } })

  const newSpaces = new Map<Ref<Person>, PersonSpace>()
  const now = Date.now()

  for (const account of accounts) {
    const employee = employees.find(({ _id }) => _id === account.person)
    if (employee === undefined) continue

    const space = newSpaces.get(account.person)

    if (space !== undefined) {
      space.members.push(account._id)
    } else {
      newSpaces.set(account.person, {
        _id: generateId(),
        _class: contact.class.PersonSpace,
        space: core.space.Space,
        name: 'Personal space',
        description: '',
        private: true,
        archived: false,
        members: [account._id],
        person: account.person,
        modifiedBy: core.account.System,
        createdBy: core.account.System,
        modifiedOn: now,
        createdOn: now
      })
    }
  }

  await client.create(DOMAIN_SPACE, Array.from(newSpaces.values()))
}

export const contactOperation: MigrateOperation = {
  async migrate (client: MigrationClient, logger: ModelLogger): Promise<void> {
    await tryMigrate(client, contactId, [
      {
        state: 'employees',
        func: async (client) => {
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
              'tx.attributes.srcDocClass': 'contact:class:Employee'
            },
            {
              $set: { 'tx.attributes.srcDocClass': contact.mixin.Employee }
            }
          )

          await client.update(
            DOMAIN_TX,
            {
              'tx.attributes.srcDocClass': 'contact:class:Employee'
            },
            {
              $set: { 'tx.attributes.srcDocClass': contact.mixin.Employee }
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
            DOMAIN_ACTIVITY,
            {
              _class: activity.class.ActivityReference,
              srcDocClass: 'contact:class:Employee'
            },
            { $set: { srcDocClass: contact.mixin.Employee } }
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
        }
      },
      {
        state: 'removeEmployeeSpace',
        func: async (client) => {
          await client.update(
            DOMAIN_CONTACT,
            {
              space: 'contact:space:Employee' as Ref<Space>
            },
            {
              space: contact.space.Contacts
            }
          )
        }
      },
      {
        state: 'avatars',
        func: async (client) => {
          await migrateAvatars(client)
        }
      },
      {
        state: 'avatarsKind',
        func: async (client) => {
          await client.update(
            DOMAIN_CONTACT,
            { avatarKind: { $exists: true } },
            { $rename: { avatarKind: 'avatarType' } }
          )
        }
      },
      {
        state: 'create-person-spaces-v1',
        func: createPersonSpaces
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, contactId, [
      {
        state: 'createSpace-v2',
        func: async (client) => {
          await createDefaultSpace(client, contact.space.Contacts, { name: 'Contacts', description: 'Contacts' })
        }
      },
      {
        state: 'createEmails',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createEmployeeEmail(tx)
        }
      }
    ])
  }
}
