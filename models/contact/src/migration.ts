//

import { AvatarType, type Person, type Contact, type SocialIdentity } from '@hcengineering/contact'
import {
  type AccountRole,
  buildSocialIdString,
  type Class,
  type Doc,
  type Domain,
  DOMAIN_MODEL_TX,
  DOMAIN_TX,
  generateId,
  MeasureMetricsContext,
  type Ref,
  type Space,
  type TxCUD
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
import core, { getAccountsFromTxes, getSocialKeyByOldEmail } from '@hcengineering/model-core'
import { DOMAIN_VIEW } from '@hcengineering/model-view'

import contact, { contactId, DOMAIN_CHANNEL, DOMAIN_CONTACT } from './index'

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

async function getOldPersonAccounts (
  client: MigrationClient
): Promise<Array<{ person: any, email: string, role: AccountRole }>> {
  const accountsTxes: TxCUD<Doc>[] = await client.find<TxCUD<Doc>>(DOMAIN_MODEL_TX, {
    objectClass: 'contact:class:PersonAccount' as Ref<Class<Doc>>
  })

  return getAccountsFromTxes(accountsTxes)
}

async function fillAccountUuids (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('contact fillAccountUuids', {})
  ctx.info('filling account uuids...')
  const iterator = await client.traverse<Person>(DOMAIN_CONTACT, { _class: contact.class.Person })

  try {
    let operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

    while (true) {
      const persons = await iterator.next(200)
      if (persons === null || persons.length === 0) {
        break
      }

      for (const person of persons) {
        const employee = client.hierarchy.as(person, contact.mixin.Employee)
        if (employee === undefined || employee.personUuid !== undefined) {
          continue
        }

        const socialIdentity = (
          await client.find<SocialIdentity>(DOMAIN_CONTACT, {
            _class: contact.class.SocialIdentity,
            attachedTo: person._id,
            verifiedOn: { $gt: 0 }
          })
        )[0]
        if (socialIdentity == null) continue

        const accountUuid = await client.accountClient.findPerson(socialIdentity.key)
        if (accountUuid == null) {
          continue
        }

        operations.push({
          filter: { _id: person._id },
          update: {
            personUuid: accountUuid
          }
        })
      }

      if (operations.length > 50) {
        await client.bulk(DOMAIN_CONTACT, operations)
        operations = []
      }
    }

    if (operations.length > 0) {
      await client.bulk(DOMAIN_CONTACT, operations)
      operations = []
    }
  } finally {
    await iterator.close()
  }
}

async function assignWorkspaceRoles (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('contact assignWorkspaceRoles', {})
  ctx.info('assigning workspace roles...')
  const oldPersonAccounts = await getOldPersonAccounts(client)
  for (const { person, email, role } of oldPersonAccounts) {
    // check it's an active employee
    const personObj = (await client.find(DOMAIN_CONTACT, { _id: person, _class: contact.class.Person }))[0]
    if (personObj === undefined) {
      continue
    }
    const employee = client.hierarchy.as(personObj, contact.mixin.Employee)
    if (employee === undefined || !employee.active) {
      continue
    }
    const socialKey = getSocialKeyByOldEmail(email)
    try {
      await client.accountClient.updateWorkspaceRoleBySocialId(buildSocialIdString(socialKey), role)
    } catch (err: any) {
      ctx.error('Failed to update workspace role', { email, ...socialKey, role, err })
    }
  }

  ctx.info('finished assigning workspace roles', { users: oldPersonAccounts.length })
}

async function createSocialIdentities (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('createSocialIdentities', {})
  ctx.info('processing person accounts ', {})

  const personAccountsTxes: any[] = await client.find<TxCUD<Doc>>(DOMAIN_MODEL_TX, {
    objectClass: 'contact:class:PersonAccount' as Ref<Class<Doc>>
  })
  const personAccounts = getAccountsFromTxes(personAccountsTxes)

  for (const pAcc of personAccounts) {
    const email: string = pAcc.email ?? ''
    if (email === '') continue

    const socialIdKey = getSocialKeyByOldEmail(email)
    const socialId: SocialIdentity = {
      _id: generateId(),
      _class: contact.class.SocialIdentity,
      space: contact.space.Contacts,
      ...socialIdKey,
      key: buildSocialIdString(socialIdKey),
      confirmed: false,

      attachedTo: pAcc.person,
      attachedToClass: contact.class.Person,
      collection: 'socialIds',

      modifiedOn: Date.now(),
      createdBy: core.account.ConfigUser,
      createdOn: Date.now(),
      modifiedBy: core.account.ConfigUser
    }

    await client.create(DOMAIN_CHANNEL, socialId)
  }
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
              objectClass: contact.mixin.Employee
            }
          )

          await client.update(
            DOMAIN_TX,
            {
              'tx.attributes.srcDocClass': 'contact:class:Employee'
            },
            {
              'tx.attributes.srcDocClass': contact.mixin.Employee
            }
          )

          await client.update(
            DOMAIN_TX,
            {
              'tx.attributes.srcDocClass': 'contact:class:Employee'
            },
            {
              'tx.attributes.srcDocClass': contact.mixin.Employee
            }
          )

          await client.update(
            DOMAIN_TX,
            {
              objectClass: core.class.Attribute,
              'attributes.type.to': 'contact:class:Employee'
            },
            {
              'attributes.type.to': contact.mixin.Employee
            }
          )
          await client.update(
            DOMAIN_TX,
            {
              objectClass: core.class.Attribute,
              'operations.type.to': 'contact:class:Employee'
            },
            {
              'operations.type.to': contact.mixin.Employee
            }
          )

          await client.update(
            DOMAIN_TX,
            {
              'attributes.extends': 'contact:class:Employee'
            },
            {
              'attributes.extends': contact.mixin.Employee
            }
          )

          for (const d of client.hierarchy.domains()) {
            await client.update(
              d,
              { attachedToClass: 'contact:class:Employee' },
              { attachedToClass: contact.mixin.Employee }
            )
          }
          await client.update(
            DOMAIN_ACTIVITY,
            {
              _class: activity.class.ActivityReference,
              srcDocClass: 'contact:class:Employee'
            },
            { srcDocClass: contact.mixin.Employee }
          )
          await client.update(
            'tags' as Domain,
            { targetClass: 'contact:class:Employee' },
            { targetClass: contact.mixin.Employee }
          )
          await client.update(
            DOMAIN_VIEW,
            { filterClass: 'contact:class:Employee' },
            { filterClass: contact.mixin.Employee }
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
              _class: contact.class.Person
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
        state: 'create-social-identities',
        func: createSocialIdentities
      },
      {
        state: 'assign-workspace-roles',
        func: assignWorkspaceRoles
      },
      {
        state: 'fill-account-uuids',
        func: fillAccountUuids
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
      }
    ])
  }
}
