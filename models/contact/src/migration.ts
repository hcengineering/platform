//

import {
  AvatarType,
  type Person,
  type Contact,
  type SocialIdentity,
  type SocialIdentityRef,
  type UserProfile,
  getFirstName,
  getLastName,
  formatName
} from '@hcengineering/contact'
import {
  AccountRole,
  type AccountUuid,
  buildSocialIdString,
  type Class,
  type Doc,
  type Domain,
  DOMAIN_MODEL_TX,
  DOMAIN_TX,
  generateId,
  type MarkupBlobRef,
  type PersonId,
  type PersonUuid,
  type Ref,
  type SocialKey,
  SortingOrder,
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
import { makeRank } from '@hcengineering/rank'
import activity, { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import core, { getAccountsFromTxes, getSocialIdBySocialKey, getSocialKeyByOldEmail } from '@hcengineering/model-core'
import { DOMAIN_VIEW } from '@hcengineering/model-view'
import card, { type Card, DOMAIN_CARD } from '@hcengineering/card'

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
  client.logger.log('filling account uuids...', {})
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
          await client.find<SocialIdentity>(DOMAIN_CHANNEL, {
            _class: contact.class.SocialIdentity,
            attachedTo: person._id
          })
        )[0]
        if (socialIdentity == null) continue

        const accountUuid = await client.accountClient.findPersonBySocialKey(socialIdentity.key)
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
  client.logger.log('assigning workspace roles...', {})
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
      await client.accountClient.updateWorkspaceRoleBySocialKey(buildSocialIdString(socialKey), role)
    } catch (err: any) {
      client.logger.error('Failed to update workspace role', { email, ...socialKey, role, err })
    }
  }

  client.logger.log('finished assigning workspace roles', { users: oldPersonAccounts.length })
}

async function assignEmployeeRoles (client: MigrationClient): Promise<void> {
  client.logger.log('assigning roles to employees...', {})

  const wsMembers = await client.accountClient.getWorkspaceMembers()
  const personsIterator = await client.traverse<Person>(DOMAIN_CONTACT, {
    _class: contact.class.Person
  })

  try {
    while (true) {
      const docs = await personsIterator.next(50)
      if (docs === null || docs?.length === 0) {
        break
      }

      const updates: { filter: MigrationDocumentQuery<Contact>, update: MigrateUpdate<Contact> }[] = []
      for (const d of docs) {
        const employee = client.hierarchy.as(d, contact.mixin.Employee)
        if (employee === undefined || !employee.active) {
          continue
        }
        if (!employee.active) continue

        const memberInfo = wsMembers.find((m) => m.person === employee.personUuid)
        if (memberInfo === undefined) {
          continue
        }

        const role = memberInfo.role === AccountRole.Guest ? 'GUEST' : 'USER'

        updates.push({
          filter: { _id: d._id },
          update: {
            [contact.mixin.Employee]: {
              ...(d as any)[contact.mixin.Employee],
              role
            }
          }
        })
      }
      if (updates.length > 0) {
        await client.bulk(DOMAIN_CONTACT, updates)
      }
    }
  } finally {
    await personsIterator.close()
    client.logger.log('finished assigning roles to employees...', {})
  }
}

async function createSocialIdentities (client: MigrationClient): Promise<void> {
  client.logger.log('processing person accounts ', {})

  const socialIdBySocialKey = new Map<string, PersonId | null>()
  const personAccountsTxes: any[] = await client.find<TxCUD<Doc>>(DOMAIN_MODEL_TX, {
    objectClass: 'contact:class:PersonAccount' as Ref<Class<Doc>>
  })
  const personAccounts = getAccountsFromTxes(personAccountsTxes)

  for (const pAcc of personAccounts) {
    const email: string = pAcc.email ?? ''
    if (email === '') continue

    const socialIdKey = getSocialKeyByOldEmail(email)
    const socialKey = buildSocialIdString(socialIdKey)
    const socialId = await getSocialIdBySocialKey(client, socialKey, socialIdBySocialKey)

    if (socialId == null) continue

    const socialIdObj: SocialIdentity = {
      _id: socialId as SocialIdentityRef,
      _class: contact.class.SocialIdentity,
      space: contact.space.Contacts,
      ...socialIdKey,
      key: socialKey,

      attachedTo: pAcc.person,
      attachedToClass: contact.class.Person,
      collection: 'socialIds',

      modifiedOn: Date.now(),
      createdBy: core.account.ConfigUser,
      createdOn: Date.now(),
      modifiedBy: core.account.ConfigUser
    }

    await client.create(DOMAIN_CHANNEL, socialIdObj)
  }
}

async function migrateMergedAccounts (client: MigrationClient): Promise<void> {
  client.logger.log('migrating merged person accounts ', {})
  const accountsByPerson = new Map<string, any[]>()
  const personAccountsTxes: any[] = await client.find<TxCUD<Doc>>(DOMAIN_MODEL_TX, {
    objectClass: 'contact:class:PersonAccount' as Ref<Class<Doc>>
  })
  const personAccounts = getAccountsFromTxes(personAccountsTxes)

  for (const account of personAccounts) {
    if (!accountsByPerson.has(account.person)) {
      accountsByPerson.set(account.person, [])
    }

    // exclude empty emails
    // also exclude Hulia account
    if (account.email === '' || account.email === 'huly.ai.bot@hc.engineering') {
      continue
    }
    accountsByPerson.get(account.person)?.push(account)
  }

  for (const [person, oldAccounts] of accountsByPerson.entries()) {
    try {
      if (oldAccounts.length < 2) continue

      // Every social id in the old account might either be already in the new account or not in the accounts at all
      // So we want to
      // 1. Take the first social id with the existing account
      // 2. Merge all other accounts into the first one
      // 3. Create social ids for the first account which haven't had their own accounts
      const toAdd: Array<SocialKey> = []
      const toMergePersons = new Set<PersonUuid>()
      const toMerge = new Set<AccountUuid>()
      for (const oldAccount of oldAccounts) {
        const socialIdKeyObj = getSocialKeyByOldEmail(oldAccount.email)
        const socialIdKey = buildSocialIdString(socialIdKeyObj)

        const socialId = await client.accountClient.findFullSocialIdBySocialKey(socialIdKey)
        const personUuid = socialId?.personUuid
        const accountUuid = (await client.accountClient.findPersonBySocialKey(socialIdKey, true)) as AccountUuid

        if (personUuid == null) {
          toAdd.push(socialIdKeyObj)
          // Means not attached to any account yet, simply add the social id to the primary account
        } else if (accountUuid == null) {
          // Attached to a person without an account. Should not be the case if being run before the global accounts migration.
          // Merge the person into the primary account.
          toMergePersons.add(personUuid)
        } else {
          // This is the case when the social id is already attached to an account. Merge the accounts.
          toMerge.add(accountUuid)
        }
      }

      if (toMerge.size === 0) {
        // No existing accounts for the person's social ids. Normally this should never be the case.
        continue
      }

      const toMergeAccountsArray = Array.from(toMerge)
      const primaryAccount = toMergeAccountsArray[0]

      for (let i = 1; i < toMergeAccountsArray.length; i++) {
        const accountToMerge = toMergeAccountsArray[i]
        await client.accountClient.mergeSpecifiedAccounts(primaryAccount, accountToMerge)
      }

      const toMergePersonsArray = Array.from(toMergePersons)
      for (const personToMerge of toMergePersonsArray) {
        await client.accountClient.mergeSpecifiedPersons(primaryAccount, personToMerge)
      }

      for (const addTarget of toAdd) {
        await client.accountClient.addSocialIdToPerson(primaryAccount, addTarget.type, addTarget.value, false)
      }
    } catch (err: any) {
      client.logger.error('Failed to merge accounts for person', { person, oldAccounts, err })
    }
  }
}

async function ensureGlobalPersonsForLocalAccounts (client: MigrationClient): Promise<void> {
  client.logger.log('ensuring global persons for local accounts ', {})

  const personAccountsTxes: any[] = await client.find<TxCUD<Doc>>(DOMAIN_MODEL_TX, {
    objectClass: 'contact:class:PersonAccount' as Ref<Class<Doc>>
  })
  const personAccounts = getAccountsFromTxes(personAccountsTxes)

  let count = 0
  for (const pAcc of personAccounts) {
    const email: string = pAcc.email ?? ''
    if (email === '') continue

    const socialIdKey = getSocialKeyByOldEmail(email)
    const person = (await client.find<Person>(DOMAIN_CONTACT, { _id: pAcc.person }))[0]
    const name = person?.name
    const firstName = getFirstName(name)
    const lastName = getLastName(name)
    const effectiveFirstName = firstName === '' ? socialIdKey.value : firstName

    try {
      await client.accountClient.ensurePerson(socialIdKey.type, socialIdKey.value, effectiveFirstName, lastName)
      count++
    } catch (err: any) {
      client.logger.error('Failed to ensure person', {
        socialIdKey,
        email: pAcc.email,
        firstName,
        lastName,
        effectiveFirstName
      })
      console.error(err)
    }
  }
  client.logger.log('finished ensuring global persons for local accounts. Total persons ensured: ', { count })
}

async function createUserProfiles (client: MigrationClient): Promise<void> {
  client.logger.log('creating user profiles for persons...', {})

  const lastCard = (
    await client.find<Card>(
      DOMAIN_CARD,
      { _class: card.class.Card },
      { sort: { rank: SortingOrder.Descending }, limit: 1 }
    )
  )[0]
  let prevRank = lastCard?.rank

  const personsIterator = await client.traverse<Person>(DOMAIN_CONTACT, {
    _class: contact.class.Person,
    profile: { $exists: false }
  })

  try {
    while (true) {
      const docs = await personsIterator.next(200)
      if (docs === null || docs?.length === 0) {
        break
      }

      for (const d of docs) {
        if (d.profile != null) continue

        const title = d.name != null && d.name !== '' ? formatName(d.name) : 'Profile'
        const userProfile: UserProfile = {
          _id: generateId(),
          _class: contact.class.UserProfile,
          space: contact.space.Contacts,

          person: d._id,
          title,
          rank: makeRank(prevRank, undefined),
          content: '' as MarkupBlobRef,
          parentInfo: [],
          blobs: {},

          modifiedOn: Date.now(),
          createdBy: core.account.ConfigUser,
          createdOn: Date.now(),
          modifiedBy: core.account.ConfigUser
        }

        prevRank = userProfile.rank

        await client.create(DOMAIN_CARD, userProfile)
        await client.update(DOMAIN_CONTACT, { _id: d._id }, { profile: userProfile._id })
      }
    }
  } finally {
    await personsIterator.close()
    client.logger.log('finished creating user profiles for persons...', {})
  }
}

async function fixSocialIdCase (client: MigrationClient): Promise<void> {
  client.logger.log('Fixing social id case...', {})

  const socialIdsIterator = await client.traverse<SocialIdentity>(DOMAIN_CHANNEL, {
    _class: contact.class.SocialIdentity
  })
  let updated = 0

  try {
    while (true) {
      const docs = await socialIdsIterator.next(200)
      if (docs === null || docs?.length === 0) {
        break
      }

      for (const d of docs) {
        const newKey = d.key.toLowerCase()
        const newVal = d.value.toLowerCase()
        if (newKey !== d.key || newVal !== d.value) {
          await client.update(DOMAIN_CHANNEL, { _id: d._id }, { key: newKey, value: newVal })
          updated++
        }
      }
    }
  } finally {
    await socialIdsIterator.close()
    client.logger.log('Finished fixing social id case. Total updated:', { updated })
  }
}

export const contactOperation: MigrateOperation = {
  async preMigrate (client: MigrationClient, logger: ModelLogger, mode): Promise<void> {
    await tryMigrate(mode, client, contactId, [
      {
        state: 'migrate-merged-accounts',
        mode: 'upgrade',
        func: (client) => migrateMergedAccounts(client)
      },
      {
        state: 'ensure-accounts-global-persons-v2',
        mode: 'upgrade',
        func: (client) => ensureGlobalPersonsForLocalAccounts(client)
      }
    ])
  },
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, contactId, [
      {
        state: 'employees',
        mode: 'upgrade',
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
        mode: 'upgrade',
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
        mode: 'upgrade',
        func: async (client) => {
          await migrateAvatars(client)
        }
      },
      {
        state: 'avatarsKind',
        mode: 'upgrade',
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
        mode: 'upgrade',
        func: createSocialIdentities
      },
      {
        state: 'assign-workspace-roles',
        mode: 'upgrade',
        func: assignWorkspaceRoles
      },
      {
        state: 'fill-account-uuids',
        mode: 'upgrade',
        func: fillAccountUuids
      },
      {
        state: 'assign-employee-roles-v1',
        mode: 'upgrade',
        func: assignEmployeeRoles
      },
      {
        state: 'create-user-profiles',
        mode: 'upgrade',
        func: createUserProfiles
      },
      {
        state: 'fix-social-id-case',
        mode: 'upgrade',
        func: fixSocialIdCase
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, contactId, [
      {
        state: 'createSpace-v2',
        func: async (client) => {
          await createDefaultSpace(client, contact.space.Contacts, { name: 'Contacts', description: 'Contacts' })
        }
      }
    ])
  }
}
