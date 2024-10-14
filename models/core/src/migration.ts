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

import { saveCollaborativeDoc } from '@hcengineering/collaboration'
import core, {
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_SPACE,
  DOMAIN_STATUS,
  DOMAIN_TX,
  MeasureMetricsContext,
  RateLimiter,
  collaborativeDocParse,
  coreId,
  generateId,
  isClassIndexable,
  makeCollaborativeDoc,
  type AnyAttribute,
  type Doc,
  type Domain,
  type MeasureContext,
  type Space,
  type Status,
  type TxCreateDoc
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
import { markupToYDoc } from '@hcengineering/text'

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
      $set: {
        _class: core.class.TypedSpace,
        type: core.spaceType.SpacesType
      }
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
        $set: {
          owners: [space.createdBy]
        }
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
      console.log('processing', _class)
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

    const timestamp = Date.now()
    const revisionId = `${timestamp}`

    const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

    for (const doc of docs) {
      await rateLimiter.exec(async () => {
        const update: MigrateUpdate<Doc> = {}

        for (const attribute of attributes) {
          const collaborativeDoc = makeCollaborativeDoc(doc._id, attribute.name, revisionId)

          const value = hierarchy.isMixin(attribute.attributeOf)
            ? ((doc as any)[attribute.attributeOf]?.[attribute.name] as string)
            : ((doc as any)[attribute.name] as string)

          const attributeName = hierarchy.isMixin(attribute.attributeOf)
            ? `${attribute.attributeOf}.${attribute.name}`
            : attribute.name

          if (value != null && value.startsWith('{')) {
            const { documentId } = collaborativeDocParse(collaborativeDoc)
            const blob = await storageAdapter.stat(ctx, client.workspaceId, documentId)
            // only for documents not in storage
            if (blob === undefined) {
              try {
                const ydoc = markupToYDoc(value, attribute.name)
                await saveCollaborativeDoc(storageAdapter, client.workspaceId, collaborativeDoc, ydoc, ctx)
              } catch (err) {
                console.error('failed to process document', doc._class, doc._id, err)
              }
            }

            update[attributeName] = collaborativeDoc
          } else if (value == null || value === '') {
            update[attributeName] = collaborativeDoc
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
    console.log('...processed', processed)
  }
}

export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    // We need to delete all documents in doc index state for missing classes
    const allClasses = client.hierarchy.getDescendants(core.class.Doc)
    const allIndexed = allClasses.filter((it) => isClassIndexable(client.hierarchy, it))

    // Next remove all non indexed classes and missing classes as well.
    await client.update(
      DOMAIN_DOC_INDEX_STATE,
      { objectClass: { $nin: allIndexed } },
      {
        $set: {
          removed: true,
          needIndex: true
        }
      }
    )
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
        state: 'add-need-index',
        func: async (client: MigrationClient) => {
          await client.update(DOMAIN_DOC_INDEX_STATE, {}, { $set: { needIndex: true } })
        }
      },
      {
        state: 'collaborative-content-to-storage',
        func: migrateCollaborativeContentToStorage
      },
      {
        state: 'fix-rename-backups',
        func: async (client: MigrationClient): Promise<void> => {
          await client.update(DOMAIN_TX, { '%hash%': { $exists: true } }, { $set: { '%hash%': null } })
          await client.update(DOMAIN_SPACE, { '%hash%': { $exists: true } }, { $set: { '%hash%': null } })
        }
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
