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

import {
  type DocAttributeUpdates,
  type ActivityMessage,
  type DocUpdateMessage,
  type Reaction
} from '@hcengineering/activity'
import contact from '@hcengineering/contact'
import core, {
  type AccountUuid,
  type Class,
  type Doc,
  type Domain,
  groupByArray,
  MeasureMetricsContext,
  type PersonId,
  type Ref,
  type Space
} from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationIterator,
  type MigrationUpgradeClient,
  tryMigrate
} from '@hcengineering/model'
import { htmlToMarkup } from '@hcengineering/text'
import {
  getAccountUuidByOldAccount,
  getAccountUuidBySocialKey,
  getSocialIdBySocialKey,
  getSocialIdFromOldAccount,
  getSocialKeyByOldAccount
} from '@hcengineering/model-core'

import { activityId, DOMAIN_ACTIVITY, DOMAIN_REACTION, DOMAIN_USER_MENTION } from './index'
import activity from './plugin'

const DOMAIN_CHUNTER = 'chunter' as Domain

async function migrateReactions (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_CHUNTER,
    { _class: 'chunter:class:Reaction' as Ref<Class<Doc>> },
    { _class: activity.class.Reaction }
  )
  await client.move(DOMAIN_CHUNTER, { _class: activity.class.Reaction }, DOMAIN_ACTIVITY)
}

async function migrateMarkup (client: MigrationClient): Promise<void> {
  const iterator = await client.traverse<DocUpdateMessage>(
    DOMAIN_ACTIVITY,
    {
      _class: activity.class.DocUpdateMessage,
      'attributeUpdates.attrClass': core.class.TypeMarkup
    },
    {
      projection: {
        _id: 1,
        attributeUpdates: 1
      }
    }
  )

  try {
    await processMigrateMarkupFor(client, iterator)
  } finally {
    await iterator.close()
  }
}

async function processMigrateMarkupFor (
  client: MigrationClient,
  iterator: MigrationIterator<DocUpdateMessage>
): Promise<void> {
  while (true) {
    const docs = await iterator.next(1000)
    if (docs === null || docs.length === 0) {
      break
    }

    const ops: { filter: MigrationDocumentQuery<DocUpdateMessage>, update: MigrateUpdate<DocUpdateMessage> }[] = []

    for (const doc of docs) {
      if (doc.attributeUpdates == null) continue
      if (doc.attributeUpdates.set == null) continue
      if (doc.attributeUpdates.set.length === 0) continue

      const update: MigrateUpdate<DocUpdateMessage> = {}

      const attributeUpdatesSet = [...doc.attributeUpdates.set]
      for (let i = 0; i < attributeUpdatesSet.length; i++) {
        const value = attributeUpdatesSet[i]
        if (value != null && typeof value === 'string') {
          attributeUpdatesSet[i] = htmlToMarkup(value)
        }

        update['attributeUpdates.set'] = attributeUpdatesSet
      }

      const prevValue = doc.attributeUpdates.prevValue
      if (prevValue != null && typeof prevValue === 'string') {
        update['attributeUpdates.prevValue'] = htmlToMarkup(prevValue)
      }

      ops.push({ filter: { _id: doc._id }, update })
    }

    if (ops.length > 0) {
      await client.bulk(DOMAIN_ACTIVITY, ops)
    }
  }
}

export async function migrateMessagesSpace (
  client: MigrationClient,
  _class: Ref<Class<ActivityMessage>>,
  getSpaceId: (message: ActivityMessage) => Ref<Doc>,
  getSpaceClass: (message: ActivityMessage) => Ref<Class<Doc>>
): Promise<void> {
  const skipped: Ref<ActivityMessage>[] = []
  while (true) {
    const messages = await client.find<ActivityMessage>(
      DOMAIN_ACTIVITY,
      {
        _class,
        space: core.space.Space,
        _id: { $nin: skipped }
      },
      { limit: 500 }
    )

    if (messages.length === 0) {
      break
    }

    const map = groupByArray(messages, getSpaceId)

    for (const [spaceId, msgs] of map) {
      const spaceClass = getSpaceClass(msgs[0])

      if (!client.hierarchy.isDerived(spaceClass, core.class.Space)) {
        skipped.push(...msgs.map(({ _id }) => _id))
        continue
      }

      const space = spaceId as Ref<Space>

      await client.update(
        DOMAIN_ACTIVITY,
        {
          _class,
          _id: { $in: msgs.map(({ _id }) => _id) }
        },
        { space }
      )

      await client.update<Reaction>(
        DOMAIN_ACTIVITY,
        {
          _class: activity.class.Reaction,
          attachedTo: { $in: msgs.map(({ _id }) => _id) }
        },
        { space }
      )

      await client.update<DocUpdateMessage>(
        DOMAIN_ACTIVITY,
        {
          _class: activity.class.DocUpdateMessage,
          objectClass: activity.class.Reaction,
          attachedTo: { $in: msgs.map(({ _id }) => _id) }
        },
        { space }
      )
    }
  }
}

async function migrateActivityMarkup (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_ACTIVITY,
    {
      _class: activity.class.DocUpdateMessage,
      'attributeUpdates.attrClass': 'core:class:TypeCollaborativeMarkup'
    },
    { 'attributeUpdates.attrClass': core.class.TypeMarkup }
  )
}

async function migrateAccountsToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('activity migrateAccountsToSocialIds', {})
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const socialIdBySocialKey = new Map<string, PersonId | null>()
  const socialIdByOldAccount = new Map<string, PersonId | null>()

  ctx.info('processing activity reactions ', {})
  const iterator = await client.traverse(DOMAIN_REACTION, { _class: activity.class.Reaction })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

      for (const doc of docs) {
        const reaction = doc as Reaction
        const socialId = await getSocialIdFromOldAccount(
          client,
          reaction.createBy,
          socialKeyByAccount,
          socialIdBySocialKey,
          socialIdByOldAccount
        )
        const newCreateBy = socialId ?? reaction.createBy

        if (newCreateBy === reaction.createBy) continue

        operations.push({
          filter: { _id: doc._id },
          update: {
            createBy: newCreateBy
          }
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_REACTION, operations)
      }

      processed += docs.length
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }
  ctx.info('finished processing activity reactions ', {})
}

/**
 * Migrates old accounts to new accounts/social ids.
 * Should be applied to prodcution directly without applying migrateSocialIdsInDocUpdates
 * @param client
 * @returns
 */
async function migrateAccountsInDocUpdates (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('activity migrateAccountsToSocialIds', {})
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const accountUuidBySocialKey = new Map<string, AccountUuid | null>()
  ctx.info('processing activity doc updates ', {})

  function getUpdatedClass (attrKey: string): string {
    return ['members', 'owners', 'user'].includes(attrKey) ? core.class.TypeAccountUuid : core.class.TypePersonId
  }

  async function getUpdatedVal (oldVal: string, attrKey: string): Promise<any> {
    if (['members', 'owners', 'user'].includes(attrKey)) {
      return (await getAccountUuidByOldAccount(client, oldVal, socialKeyByAccount, accountUuidBySocialKey)) ?? oldVal
    } else {
      return socialKeyByAccount[oldVal] ?? oldVal
    }
  }

  async function migrateField<P extends keyof DocAttributeUpdates> (
    au: DocAttributeUpdates,
    update: MigrateUpdate<DocUpdateMessage>['attributeUpdates'],
    field: P
  ): Promise<void> {
    const oldValue = au?.[field]
    if (oldValue == null) return

    let changed = false
    let newValue: any
    if (Array.isArray(oldValue)) {
      newValue = []
      for (const a of oldValue as any[]) {
        const newA = a != null ? await getUpdatedVal(a, au.attrKey) : a
        if (newA !== a) {
          changed = true
        }
        newValue.push(newA)
      }
    } else {
      newValue = await getUpdatedVal(oldValue, au.attrKey)
      if (newValue !== oldValue) {
        changed = true
      }
    }

    if (changed) {
      if (update == null) throw new Error('update is null')

      update[field] = newValue
    }
  }

  const iterator = await client.traverse(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    action: 'update',
    'attributeUpdates.attrClass': 'core:class:Account'
  })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: {
        filter: MigrationDocumentQuery<DocUpdateMessage>
        update: MigrateUpdate<DocUpdateMessage>
      }[] = []

      for (const doc of docs) {
        const dum = doc as DocUpdateMessage
        if (dum.attributeUpdates == null) continue
        const update: any = { attributeUpdates: { ...dum.attributeUpdates } }

        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'added')
        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'prevValue')
        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'removed')
        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'set')

        update.attributeUpdates.attrClass = getUpdatedClass(dum.attributeUpdates.attrKey)

        operations.push({
          filter: { _id: dum._id },
          update
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_ACTIVITY, operations)
      }

      processed += docs.length
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }

  ctx.info('finished processing activity doc updates ', {})
}

/**
 * Migrates social ids to new accounts where needed.
 * Should only be applied to staging where old accounts have already been migrated to social ids.
 * REMOVE IT BEFORE MERGING TO PRODUCTION
 * @param client
 * @returns
 */
async function migrateSocialIdsInDocUpdates (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('activity migrateSocialIdsInDocUpdates', {})
  const accountUuidBySocialKey = new Map<string, AccountUuid | null>()
  ctx.info('processing activity doc updates ', {})

  async function getUpdatedVal (oldVal: string): Promise<any> {
    return (await getAccountUuidBySocialKey(client, oldVal, accountUuidBySocialKey)) ?? oldVal
  }

  async function migrateField<P extends keyof DocAttributeUpdates> (
    au: DocAttributeUpdates,
    update: MigrateUpdate<DocUpdateMessage>['attributeUpdates'],
    field: P
  ): Promise<void> {
    const oldValue = au?.[field]
    if (oldValue == null) return

    let changed = false
    let newValue: any
    if (Array.isArray(oldValue)) {
      newValue = []
      for (const a of oldValue as any[]) {
        const newA = a != null ? await getUpdatedVal(a) : a
        if (newA !== a) {
          changed = true
        }
        newValue.push(newA)
      }
    } else {
      newValue = await getUpdatedVal(oldValue)
      if (newValue !== oldValue) {
        changed = true
      }
    }

    if (changed) {
      if (update == null) throw new Error('update is null')

      update[field] = newValue
    }
  }

  const iterator = await client.traverse(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    action: 'update',
    'attributeUpdates.attrClass': 'core:class:TypePersonId',
    'attributeUpdates.attrKey': { $in: ['members', 'owners', 'user'] }
  })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: {
        filter: MigrationDocumentQuery<DocUpdateMessage>
        update: MigrateUpdate<DocUpdateMessage>
      }[] = []

      for (const doc of docs) {
        const dum = doc as DocUpdateMessage
        if (dum.attributeUpdates == null) continue
        const update: any = { attributeUpdates: { ...dum.attributeUpdates } }

        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'added')
        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'prevValue')
        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'removed')
        await migrateField(dum.attributeUpdates, update.attributeUpdates, 'set')

        update.attributeUpdates.attrClass = core.class.TypeAccountUuid

        operations.push({
          filter: { _id: dum._id },
          update
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_ACTIVITY, operations)
      }

      processed += docs.length
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }

  ctx.info('finished processing activity doc updates ', {})
}

async function migrateSocialKeysToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('activity migrateSocialKeysToSocialIds', {})

  ctx.info('processing activity reactions ', {})
  const socialIdBySocialKey = new Map<string, PersonId | null>()
  const iterator = await client.traverse(DOMAIN_REACTION, { _class: activity.class.Reaction })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

      for (const doc of docs) {
        const reaction = doc as Reaction
        const newCreateBy =
          (await getSocialIdBySocialKey(client, reaction.createBy, socialIdBySocialKey)) ?? reaction.createBy

        if (newCreateBy === reaction.createBy) continue

        operations.push({
          filter: { _id: doc._id },
          update: {
            createBy: newCreateBy
          }
        })
        processed++
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_REACTION, operations)
        ctx.info('...processed', { count: processed })
      }
    }
  } finally {
    await iterator.close()
  }
  ctx.info('finished processing activity reactions ', {})
}

export const activityOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, activityId, [
      {
        state: 'reactions',
        mode: 'upgrade',
        func: migrateReactions
      },
      {
        state: 'markup',
        mode: 'upgrade',
        func: migrateMarkup
      },
      {
        state: 'migrate-doc-update-messages-space',
        mode: 'upgrade',
        func: async (client) => {
          await migrateMessagesSpace(
            client,
            activity.class.DocUpdateMessage,
            ({ attachedTo }) => attachedTo,
            ({ attachedToClass }) => attachedToClass
          )
        }
      },
      {
        state: 'migrate-employee-space-v1',
        mode: 'upgrade',
        func: async () => {
          await client.update<ActivityMessage>(
            DOMAIN_ACTIVITY,
            { space: 'contact:space:Employee' as Ref<Space> },
            { space: contact.space.Contacts }
          )
        }
      },
      {
        state: 'migrate-activity-markup',
        mode: 'upgrade',
        func: migrateActivityMarkup
      },
      {
        state: 'move-reactions',
        mode: 'upgrade',
        func: async (client: MigrationClient): Promise<void> => {
          await client.move(DOMAIN_ACTIVITY, { _class: activity.class.Reaction }, DOMAIN_REACTION)
          await client.move(DOMAIN_ACTIVITY, { _class: activity.class.UserMentionInfo }, DOMAIN_USER_MENTION)
        }
      },
      {
        state: 'migrate-employee-space-v1',
        mode: 'upgrade',
        func: async () => {
          await client.update<ActivityMessage>(
            DOMAIN_ACTIVITY,
            { space: 'contact:space:Employee' as Ref<Space> },
            { space: contact.space.Contacts }
          )
        }
      },
      {
        state: 'migrate-activity-markup',
        mode: 'upgrade',
        func: migrateActivityMarkup
      },
      {
        state: 'move-reactions',
        mode: 'upgrade',
        func: async (client: MigrationClient): Promise<void> => {
          await client.move(DOMAIN_ACTIVITY, { _class: activity.class.Reaction }, DOMAIN_REACTION)
          await client.move(DOMAIN_ACTIVITY, { _class: activity.class.UserMentionInfo }, DOMAIN_USER_MENTION)
        }
      },
      {
        state: 'accounts-to-social-ids-v2',
        mode: 'upgrade',
        func: migrateAccountsToSocialIds
      },
      {
        state: 'accounts-in-doc-updates-v2',
        mode: 'upgrade',
        func: migrateAccountsInDocUpdates
      },
      // ONLY FOR STAGING. REMOVE IT BEFORE MERGING TO PRODUCTION
      {
        state: 'social-ids-in-doc-updates',
        mode: 'upgrade',
        func: migrateSocialIdsInDocUpdates
      },
      // ONLY FOR STAGING. REMOVE IT BEFORE MERGING TO PRODUCTION
      {
        state: 'social-keys-to-social-ids-v2',
        mode: 'upgrade',
        func: migrateSocialKeysToSocialIds
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
