//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { saveCollabJson } from '@hcengineering/collaboration'
import core, {
  buildSocialIdString,
  coreId,
  DOMAIN_MODEL_TX,
  DOMAIN_SPACE,
  DOMAIN_STATUS,
  DOMAIN_TX,
  generateId,
  makeCollabJsonId,
  makeCollabYdocId,
  makeDocCollabId,
  MeasureMetricsContext,
  RateLimiter,
  SocialIdType,
  type PersonId,
  type AnyAttribute,
  type Blob,
  type Class,
  type Doc,
  type Domain,
  type MeasureContext,
  type Ref,
  type Space,
  type Status,
  type TxCreateDoc,
  type TxCUD,
  type SpaceType,
  type TxUpdateDoc,
  type Role,
  toIdMap,
  type TypedSpace,
  TxProcessor,
  type SocialKey
} from '@hcengineering/core'
import {
  createDefaultSpace,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationIterator,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { type StorageAdapter } from '@hcengineering/storage'

async function migrateStatusesToModel (client: MigrationClient): Promise<void> {
  // Move statuses to model:
  // Migrate the default ones with well-known ids as system's model
  // And the rest as user's model
  // Skip __superseded statuses
  const allStatuses = await client.find<Status>(DOMAIN_STATUS, {
    _class: core.class.Status,
    __superseded: { $exists: false }
  })

  for (const status of allStatuses) {
    const isSystem = (status as any).__migratedFrom !== undefined
    const modifiedBy =
      status.modifiedBy === core.account.System
        ? isSystem
          ? core.account.System
          : core.account.ConfigUser
        : status.modifiedBy

    const tx: TxCreateDoc<Status> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: status._id,
      objectClass: status._class,
      objectSpace: core.space.Model,
      attributes: {
        ofAttribute: status.ofAttribute,
        category: status.category,
        name: status.name,
        color: status.color,
        description: status.description
      },
      modifiedOn: status.modifiedOn,
      createdBy: status.createdBy,
      createdOn: status.createdOn,
      modifiedBy
    }

    await client.create(DOMAIN_TX, tx)
  }
}

async function migrateAllSpaceToTyped (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_SPACE,
    {
      _id: core.space.Space,
      _class: core.class.Space
    },
    {
      _class: core.class.TypedSpace,
      type: core.spaceType.SpacesType
    }
  )
}

async function migrateSpacesOwner (client: MigrationClient): Promise<void> {
  const targetClasses = client.hierarchy.getDescendants(core.class.Space)
  const targetSpaces = await client.find<Space>(DOMAIN_SPACE, {
    _class: { $in: targetClasses },
    owners: { $exists: false }
  })

  for (const space of targetSpaces) {
    await client.update(
      DOMAIN_SPACE,
      {
        _id: space._id
      },
      {
        owners: [space.createdBy]
      }
    )
  }
}

async function migrateStatusTransactions (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TX,
    {
      objectClass: core.class.Status,
      'attributes.title': { $exists: true }
    },
    {
      $rename: { 'attributes.title': 'attributes.name' }
    }
  )
  await client.update(
    DOMAIN_TX,
    {
      objectClass: core.class.Status,
      'operations.title': { $exists: true }
    },
    {
      $rename: { 'operations.title': 'operations.name' }
    }
  )
}

async function migrateCollaborativeContentToStorage (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('migrate_content', {})
  const storageAdapter = client.storageAdapter

  const hierarchy = client.hierarchy
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const allAttributes = hierarchy.getAllAttributes(_class)
    const attributes = Array.from(allAttributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)
    })

    if (attributes.length === 0) continue
    if (hierarchy.isMixin(_class) && attributes.every((p) => p.attributeOf !== _class)) continue

    const query = hierarchy.isMixin(_class) ? { [_class]: { $exists: true } } : { _class }

    const iterator = await client.traverse(domain, query)
    try {
      ctx.info('processing', { _class })
      await processMigrateContentFor(ctx, domain, attributes, client, storageAdapter, iterator)
    } finally {
      await iterator.close()
    }
  }
}

async function processMigrateContentFor (
  ctx: MeasureContext,
  domain: Domain,
  attributes: AnyAttribute[],
  client: MigrationClient,
  storageAdapter: StorageAdapter,
  iterator: MigrationIterator<Doc>
): Promise<void> {
  const hierarchy = client.hierarchy

  const rateLimiter = new RateLimiter(10)

  let processed = 0

  while (true) {
    const docs = await iterator.next(1000)
    if (docs === null || docs.length === 0) {
      break
    }

    const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

    for (const doc of docs) {
      await rateLimiter.add(async () => {
        const update: MigrateUpdate<Doc> = {}

        for (const attribute of attributes) {
          const value = hierarchy.isMixin(attribute.attributeOf)
            ? ((doc as any)[attribute.attributeOf]?.[attribute.name] as string)
            : ((doc as any)[attribute.name] as string)

          const attributeName = hierarchy.isMixin(attribute.attributeOf)
            ? `${attribute.attributeOf}.${attribute.name}`
            : attribute.name

          const collabId = makeDocCollabId(doc, attribute.name)
          const blobId = makeCollabJsonId(collabId)

          if (value != null && value.startsWith('{')) {
            try {
              const buffer = Buffer.from(value)
              await storageAdapter.put(ctx, client.wsIds, blobId, buffer, 'application/json', buffer.length)
            } catch (err) {
              ctx.error('failed to process document', { _class: doc._class, _id: doc._id, err })
            }

            update[attributeName] = blobId
          } else if (value == null || value === '') {
            update[attributeName] = null
          }
        }

        if (Object.keys(update).length > 0) {
          operations.push({ filter: { _id: doc._id }, update })
        }
      })
    }

    await rateLimiter.waitProcessing()

    if (operations.length > 0) {
      await client.bulk(domain, operations)
    }

    processed += docs.length
    ctx.info('...processed', { count: processed })
  }
}

async function migrateCollaborativeDocsToJson (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('migrateCollaborativeDocsToJson', {})
  const storageAdapter = client.storageAdapter

  const hierarchy = client.hierarchy
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const allAttributes = hierarchy.getAllAttributes(_class)
    const attributes = Array.from(allAttributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)
    })

    if (attributes.length === 0) continue
    if (hierarchy.isMixin(_class) && attributes.every((p) => p.attributeOf !== _class)) continue

    const query = hierarchy.isMixin(_class) ? { [_class]: { $exists: true } } : { _class }

    const iterator = await client.traverse(domain, query)
    try {
      ctx.info('processing', { _class })
      await processMigrateJsonForDomain(ctx, domain, attributes, client, storageAdapter, iterator)
    } finally {
      await iterator.close()
    }
  }
}

export function getAccountsFromTxes (accTxes: TxCUD<Doc>[]): any {
  const byAccounts = accTxes.reduce<Record<string, TxCUD<Doc>[]>>((acc, tx) => {
    if (acc[tx.objectId] === undefined) {
      acc[tx.objectId] = []
    }

    acc[tx.objectId].push(tx)
    return acc
  }, {})

  return Object.values(byAccounts)
    .map((txes) => TxProcessor.buildDoc2Doc(txes))
    .filter((it) => it !== undefined)
}

export async function getSocialIdByOldAccount (client: MigrationClient): Promise<Record<string, PersonId>> {
  const systemAccounts = [core.account.System, core.account.ConfigUser]
  const accountsTxes: TxCUD<Doc>[] = await client.find<TxCUD<Doc>>(DOMAIN_MODEL_TX, {
    objectClass: { $in: ['core:class:Account', 'contact:class:PersonAccount'] as Ref<Class<Doc>>[] }
  })
  const accounts = getAccountsFromTxes(accountsTxes)

  const socialIdByAccount: Record<string, PersonId> = {}
  for (const account of accounts) {
    if (account.email === undefined) {
      continue
    }

    if (systemAccounts.includes(account._id)) {
      socialIdByAccount[account._id] = account._id
    } else {
      socialIdByAccount[account._id] = buildSocialIdString(getSocialKeyByOldEmail(account.email))
    }
  }

  return socialIdByAccount
}

export function getSocialKeyByOldEmail (rawEmail: string): SocialKey {
  const email = rawEmail.toLowerCase()
  let type: SocialIdType
  let value: string
  if (email.startsWith('github:')) {
    type = SocialIdType.GITHUB
    value = email.slice(7)
  } else if (email.startsWith('openid:')) {
    type = SocialIdType.OIDC
    value = email.slice(7)
  } else {
    type = SocialIdType.EMAIL
    value = email
  }

  return {
    type,
    value
  }
}

async function migrateAccountsToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('core migrateAccountsToSocialIds', {})
  const hierarchy = client.hierarchy
  const socialIdByAccount = await getSocialIdByOldAccount(client)

  ctx.info('migrating createdBy and modifiedBy')
  function chunkArray<T> (array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  for (const domain of client.hierarchy.domains()) {
    ctx.info('processing domain ', { domain })
    const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []
    const groupByCreated = await client.groupBy<any, Doc>(domain, 'createdBy', {})
    const groupByModified = await client.groupBy<any, Doc>(domain, 'modifiedBy', {})

    groupByCreated.forEach((_, accId) => {
      const socialId = socialIdByAccount[accId]
      if (socialId == null || accId === socialId) return

      operations.push({
        filter: { createdBy: accId },
        update: {
          createdBy: socialId
        }
      })
    })

    groupByModified.forEach((_, accId) => {
      const socialId = socialIdByAccount[accId]
      if (socialId == null || accId === socialId) return

      operations.push({
        filter: { modifiedBy: accId },
        update: {
          modifiedBy: socialId
        }
      })
    })

    if (operations.length > 0) {
      const operationsChunks = chunkArray(operations, 40)
      ctx.info('chunks to process ', { total: operationsChunks.length })
      let processed = 0
      for (const operationsChunk of operationsChunks) {
        if (operationsChunk.length === 0) continue

        await client.bulk(domain, operationsChunk)
        processed++
        if (operationsChunks.length > 1) {
          ctx.info('processed chunk', { processed, of: operationsChunks.length })
        }
      }
    } else {
      ctx.info('no user accounts to migrate')
    }
  }

  ctx.info('finished migrating createdBy and modifiedBy')

  const spaceTypes = client.model.findAllSync(core.class.SpaceType, {})
  const spaceTypesById = toIdMap(spaceTypes)
  const roles = client.model.findAllSync(core.class.Role, {})
  const rolesBySpaceType = new Map<Ref<SpaceType>, Role[]>()
  for (const role of roles) {
    const spaceType = role.attachedTo
    if (spaceType === undefined) continue
    if (rolesBySpaceType.has(spaceType)) {
      rolesBySpaceType.get(spaceType)?.push(role)
    } else {
      rolesBySpaceType.set(spaceType, [role])
    }
  }

  ctx.info('processing spaces members, owners and roles assignment', {})
  let processedSpaces = 0
  const spacesIterator = await client.traverse(DOMAIN_SPACE, {})

  try {
    while (true) {
      const spaces = await spacesIterator.next(200)
      if (spaces === null || spaces.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Space>, update: MigrateUpdate<Space> }[] = []

      for (const s of spaces) {
        if (!hierarchy.isDerived(s._class, core.class.Space)) continue
        const space = s as Space

        const newMembers = space.members.map((m) => socialIdByAccount[m] ?? m)
        const newOwners = space.owners?.map((m) => socialIdByAccount[m] ?? m)
        const update: MigrateUpdate<Space> = {
          members: newMembers,
          owners: newOwners
        }

        const type = spaceTypesById.get((space as TypedSpace).type)

        if (type !== undefined) {
          const mixin = hierarchy.as(space, type.targetClass)
          if (mixin !== undefined) {
            const roles = rolesBySpaceType.get(type._id)

            for (const role of roles ?? []) {
              const oldAssignees: string[] | undefined = (mixin as any)[role._id]
              if (oldAssignees != null && oldAssignees.length > 0) {
                const newAssignees = oldAssignees.map((a) => socialIdByAccount[a])

                update[`${type.targetClass}`] = {
                  [role._id]: newAssignees
                }
              }
            }
          }
        }

        operations.push({
          filter: { _id: space._id },
          update
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_SPACE, operations)
      }

      processedSpaces += spaces.length
      ctx.info('...spaces processed', { count: processedSpaces })
    }

    ctx.info('finished processing spaces members, owners and roles assignment', { processedSpaces })
  } finally {
    await spacesIterator.close()
  }

  ctx.info('processing space types members', {})
  let updatedSpaceTypes = 0
  for (const spaceType of spaceTypes) {
    if (spaceType.members === undefined || spaceType.members.length === 0) continue

    const newMembers = spaceType.members.map((m) => socialIdByAccount[m] ?? m)
    const tx: TxUpdateDoc<SpaceType> = {
      _id: generateId(),
      _class: core.class.TxUpdateDoc,
      space: core.space.Tx,
      objectId: spaceType._id,
      objectClass: spaceType._class,
      objectSpace: spaceType.space,
      operations: {
        members: newMembers
      },
      modifiedOn: Date.now(),
      createdBy: core.account.ConfigUser,
      createdOn: Date.now(),
      modifiedBy: core.account.ConfigUser
    }

    await client.create(DOMAIN_MODEL_TX, tx)
    updatedSpaceTypes++
  }
  ctx.info('finished processing space types members', { totalSpaceTypes: spaceTypes.length, updatedSpaceTypes })
}

async function processMigrateJsonForDomain (
  ctx: MeasureContext,
  domain: Domain,
  attributes: AnyAttribute[],
  client: MigrationClient,
  storageAdapter: StorageAdapter,
  iterator: MigrationIterator<Doc>
): Promise<void> {
  const rateLimiter = new RateLimiter(10)

  let processed = 0

  while (true) {
    const docs = await iterator.next(100)
    if (docs === null || docs.length === 0) {
      break
    }

    const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

    for (const doc of docs) {
      await rateLimiter.add(async () => {
        const update = await processMigrateJsonForDoc(ctx, doc, attributes, client, storageAdapter)
        if (Object.keys(update).length > 0) {
          operations.push({ filter: { _id: doc._id }, update })
        }
      })
    }

    await rateLimiter.waitProcessing()

    if (operations.length > 0) {
      await client.bulk(domain, operations)
    }

    processed += docs.length
    ctx.info('...processed', { count: processed })
  }
}

async function processMigrateJsonForDoc (
  ctx: MeasureContext,
  doc: Doc,
  attributes: AnyAttribute[],
  client: MigrationClient,
  storageAdapter: StorageAdapter
): Promise<MigrateUpdate<Doc>> {
  const { hierarchy, wsIds } = client

  const update: MigrateUpdate<Doc> = {}

  for (const attribute of attributes) {
    const value = hierarchy.isMixin(attribute.attributeOf)
      ? ((doc as any)[attribute.attributeOf]?.[attribute.name] as string)
      : ((doc as any)[attribute.name] as string)

    if (value == null || value === '') {
      continue
    }

    const attributeName = hierarchy.isMixin(attribute.attributeOf)
      ? `${attribute.attributeOf}.${attribute.name}`
      : attribute.name

    const collabId = makeDocCollabId(doc, attribute.name)
    if (value.startsWith('{')) {
      // For some reason we have documents that are already markups
      const jsonId = await retry(5, async () => {
        return await saveCollabJson(ctx, storageAdapter, wsIds, collabId, value)
      })

      update[attributeName] = jsonId
      continue
    }

    if (!value.includes(':')) {
      // not a collaborative document, skip
      continue
    }

    // Name of existing ydoc document
    // original value here looks like '65b7f82f4d422b89d4cbdd6f:HEAD:0'
    // where the first part is the blob id
    const currentYdocId = value.split(':')[0] as Ref<Blob>

    try {
      // If document id has changed, save it with new name to ensure we will be able to load it later
      const ydocId = makeCollabYdocId(collabId)
      if (ydocId !== currentYdocId) {
        await retry(5, async () => {
          const stat = await storageAdapter.stat(ctx, wsIds, currentYdocId)
          if (stat !== undefined) {
            const buffer = await storageAdapter.read(ctx, wsIds, currentYdocId)
            await storageAdapter.put(ctx, wsIds, ydocId, buffer, 'application/ydoc', buffer.length)
          }
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      ctx.warn('failed to process collaborative doc', { workspace: wsIds.uuid, collabId, currentYdocId, error })
    }

    const unset = update.$unset ?? {}
    update.$unset = { ...unset, [attribute.name]: 1 }
  }

  return update
}

export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, coreId, [
      {
        state: 'statuses-to-model',
        func: migrateStatusesToModel
      },
      {
        state: 'all-space-to-typed',
        func: migrateAllSpaceToTyped
      },
      {
        state: 'add-spaces-owner-v1',
        func: migrateSpacesOwner
      },
      {
        state: 'old-statuses-transactions',
        func: migrateStatusTransactions
      },
      {
        state: 'collaborative-content-to-storage',
        func: migrateCollaborativeContentToStorage
      },
      {
        state: 'fix-backups-hash-timestamp-v2',
        func: async (client: MigrationClient): Promise<void> => {
          const now = Date.now().toString(16)
          for (const d of client.hierarchy.domains()) {
            await client.update(d, { '%hash%': { $in: [null, ''] } }, { '%hash%': now })
          }
        }
      },
      {
        state: 'remove-collection-txes',
        func: async (client) => {
          let processed = 0
          let last = 0
          const iterator = await client.traverse<TxCUD<Doc>>(DOMAIN_TX, {
            _class: 'core:class:TxCollectionCUD' as Ref<Class<Doc>>
          })
          try {
            while (true) {
              const txes = await iterator.next(1000)
              if (txes === null || txes.length === 0) break
              processed += txes.length
              try {
                await client.create(
                  DOMAIN_TX,
                  txes.map((tx) => {
                    const { collection, objectId, objectClass } = tx
                    return {
                      collection,
                      attachedTo: objectId,
                      attachedToClass: objectClass,
                      ...(tx as any).tx,
                      objectSpace: (tx as any).tx.objectSpace ?? tx.objectClass
                    }
                  })
                )
                await client.deleteMany(DOMAIN_TX, {
                  _id: { $in: txes.map((it) => it._id) }
                })
              } catch (err: any) {
                console.error(err)
              }
              if (last !== Math.round(processed / 1000)) {
                last = Math.round(processed / 1000)
                console.log('processed', processed)
              }
            }
          } finally {
            await iterator.close()
          }
        }
      },
      {
        state: 'move-model-txes',
        func: async (client) => {
          await client.move(
            DOMAIN_TX,
            {
              objectSpace: core.space.Model
            },
            DOMAIN_MODEL_TX
          )
        }
      },
      {
        state: 'collaborative-docs-to-json',
        func: migrateCollaborativeDocsToJson
      },
      {
        state: 'accounts-to-social-ids',
        func: migrateAccountsToSocialIds
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, coreId, [
      {
        state: 'create-defaults-v2',
        func: async (client) => {
          await createDefaultSpace(
            client,
            core.space.Space,
            { name: 'Spaces', description: 'Space for all spaces', type: core.spaceType.SpacesType },
            core.class.TypedSpace
          )
        }
      },
      {
        state: 'default-space',
        func: async (client) => {
          await createDefaultSpace(client, core.space.Tx, { name: 'Space for all txes' })
          await createDefaultSpace(client, core.space.DerivedTx, { name: 'Space for derived txes' })
          await createDefaultSpace(client, core.space.Model, { name: 'Space for model' })
          await createDefaultSpace(client, core.space.Configuration, { name: 'Space for config' })
          await createDefaultSpace(client, core.space.Workspace, { name: 'Space for common things' })
        }
      }
    ])
  }
}

async function retry<T> (retries: number, op: () => Promise<T>): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      if (retries !== 0) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
  }
  throw error
}
