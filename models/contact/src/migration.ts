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
  buildSocialIdString,
  type Class,
  type Doc,
  type Domain,
  DOMAIN_MODEL_TX,
  DOMAIN_TX,
  generateId,
  type MarkupBlobRef,
  MeasureMetricsContext,
  type PersonId,
  type Ref,
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

async function fillSocialIdentitiesIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('contact fillSocialIdentitiesIds', {})
  ctx.info('filling social identities genenrated ids...')
  const socialIdBySocialKey = new Map<string, PersonId | null>()
  const iterator = await client.traverse<SocialIdentity>(DOMAIN_CHANNEL, { _class: contact.class.SocialIdentity })
  let count = 0

  try {
    let newSids: SocialIdentity[] = []
    let newSidIds = new Set<Ref<SocialIdentity>>()
    let deleteSids: Ref<SocialIdentity>[] = []

    while (true) {
      const socialIdentities = await iterator.next(200)
      if (socialIdentities === null || socialIdentities.length === 0) {
        break
      }

      for (const socialIdentity of socialIdentities) {
        const socialId = await getSocialIdBySocialKey(client, socialIdentity.key, socialIdBySocialKey)

        if (socialId == null || socialId === socialIdentity._id) continue

        const socialIdRef = socialId as SocialIdentityRef
        // Some old data might contain duplicate accounts for github users
        // so need to filter just in case
        if (!newSidIds.has(socialIdRef)) {
          newSidIds.add(socialIdRef)
          newSids.push({
            ...socialIdentity,
            _id: socialIdRef
          })
        }

        deleteSids.push(socialIdentity._id)
        count++

        if (newSids.length > 50) {
          await client.create(DOMAIN_CHANNEL, newSids)
          await client.deleteMany(DOMAIN_CHANNEL, { _id: { $in: deleteSids } })
          newSids = []
          newSidIds = new Set()
          deleteSids = []
        }
      }
    }

    if (newSids.length > 0) {
      await client.create(DOMAIN_CHANNEL, newSids)
      await client.deleteMany(DOMAIN_CHANNEL, { _id: { $in: deleteSids } })
      newSids = []
      newSidIds = new Set()
      deleteSids = []
    }
    ctx.info('finished filling social identities genenrated ids. Updated count: ', { count })
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
      await client.accountClient.updateWorkspaceRoleBySocialKey(buildSocialIdString(socialKey), role)
    } catch (err: any) {
      ctx.error('Failed to update workspace role', { email, ...socialKey, role, err })
    }
  }

  ctx.info('finished assigning workspace roles', { users: oldPersonAccounts.length })
}

async function assignEmployeeRoles (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('contact assignEmployeeRoles', {})
  ctx.info('assigning roles to employees...')

  const wsMembers = await client.accountClient.getWorkspaceMembers()
  const persons = await client.traverse<Person>(DOMAIN_CONTACT, {
    _class: contact.class.Person
  })

  try {
    while (true) {
      const docs = await persons.next(50)
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
    await persons.close()
    ctx.info('finished assigning roles to employees...')
  }
}

async function createSocialIdentities (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('createSocialIdentities', {})
  ctx.info('processing person accounts ', {})

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

async function ensureGlobalPersonsForLocalAccounts (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('contact ensureGlobalPersonsForLocalAccounts', {})
  ctx.info('ensuring global persons for local accounts ', {})

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
      ctx.error('Failed to ensure person', { socialIdKey, email: pAcc.email, firstName, lastName, effectiveFirstName })
      console.error(err)
    }
  }
  ctx.info('finished ensuring global persons for local accounts. Total persons ensured: ', { count })
}

async function createUserProfiles (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('contact createUserProfiles', {})
  ctx.info('creating user profiles for persons...')

  const persons = await client.traverse<Person>(DOMAIN_CONTACT, {
    _class: contact.class.Person,
    profile: { $exists: false }
  })

  const lastCard = (
    await client.find<Card>(
      DOMAIN_CARD,
      { _class: card.class.Card },
      { sort: { rank: SortingOrder.Descending }, limit: 1 }
    )
  )[0]
  let prevRank = lastCard?.rank

  try {
    while (true) {
      const docs = await persons.next(200)
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
    await persons.close()
    ctx.info('finished creating user profiles for persons...')
  }
}

export const contactOperation: MigrateOperation = {
  async preMigrate (client: MigrationClient, logger: ModelLogger, mode): Promise<void> {
    await tryMigrate(mode, client, contactId, [
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
      // ONLY FOR STAGING. REMOVE IT BEFORE MERGING TO PRODUCTION
      {
        state: 'fill-social-identities-ids-v2',
        mode: 'upgrade',
        func: fillSocialIdentitiesIds
      },
      {
        state: 'create-user-profiles',
        mode: 'upgrade',
        func: createUserProfiles
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
