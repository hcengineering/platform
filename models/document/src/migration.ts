//
// Copyright © 2022-2024 Hardcore Engineering Inc.
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

import { DOMAIN_MODEL_TX, MeasureMetricsContext, SortingOrder, type CollaborativeDoc } from '@hcengineering/core'
import { type Document, type DocumentSnapshot, type Teamspace } from '@hcengineering/document'
import {
  migrateSpaceRanks,
  tryMigrate,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { type Asset } from '@hcengineering/platform'
import { makeRank } from '@hcengineering/rank'

import { loadCollaborativeDoc, saveCollaborativeDoc, yDocCopyXmlField } from '@hcengineering/collaboration'
import document, { documentId, DOMAIN_DOCUMENT } from './index'

async function migrateDocumentIcons (client: MigrationClient): Promise<void> {
  await client.update<Teamspace>(
    DOMAIN_SPACE,
    {
      _class: document.class.Teamspace,
      icon: 'document:icon:Library' as Asset
    },
    {
      icon: 'document:icon:Teamspace' as Asset
    }
  )

  await client.update<Document>(
    DOMAIN_DOCUMENT,
    {
      _class: document.class.Document,
      icon: 'document:icon:Library' as Asset
    },
    {
      icon: 'document:icon:Teamspace' as Asset
    }
  )
}

async function migrateTeamspaces (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_SPACE,
    {
      _class: document.class.Teamspace,
      type: { $exists: false }
    },
    {
      $set: {
        type: document.spaceType.DefaultTeamspaceType
      }
    }
  )
}

async function migrateTeamspacesMixins (client: MigrationClient): Promise<void> {
  const oldSpaceTypeMixin = `${document.spaceType.DefaultTeamspaceType}:type:mixin`
  const newSpaceTypeMixin = document.mixin.DefaultTeamspaceTypeData

  await client.update(
    DOMAIN_MODEL_TX,
    {
      objectClass: core.class.Attribute,
      'attributes.attributeOf': oldSpaceTypeMixin
    },
    {
      $set: {
        'attributes.attributeOf': newSpaceTypeMixin
      }
    }
  )

  await client.update(
    DOMAIN_SPACE,
    {
      _class: document.class.Teamspace,
      [oldSpaceTypeMixin]: { $exists: true }
    },
    {
      $rename: {
        [oldSpaceTypeMixin]: newSpaceTypeMixin
      }
    }
  )
}

async function migrateRank (client: MigrationClient): Promise<void> {
  const documents = await client.find<Document>(
    DOMAIN_DOCUMENT,
    {
      _class: document.class.Document,
      rank: { $exists: false }
    },
    { sort: { name: SortingOrder.Ascending } }
  )

  let rank = makeRank(undefined, undefined)
  const operations: { filter: MigrationDocumentQuery<Document>, update: MigrateUpdate<Document> }[] = []

  for (const doc of documents) {
    operations.push({
      filter: { _id: doc._id },
      update: { $set: { rank } }
    })
    rank = makeRank(rank, undefined)
  }

  await client.bulk(DOMAIN_DOCUMENT, operations)
}

async function renameFields (client: MigrationClient): Promise<void> {
  const documents = await client.find<Document>(DOMAIN_DOCUMENT, {
    _class: document.class.Document,
    content: { $exists: true }
  })

  for (const document of documents) {
    await client.update(
      DOMAIN_DOCUMENT,
      { _id: document._id },
      {
        $rename: {
          attachedTo: 'parent',
          content: 'description',
          name: 'title'
        },
        $unset: {
          attachedToClass: '',
          collection: ''
        }
      }
    )
  }

  const spnapshots = await client.find<DocumentSnapshot>(DOMAIN_DOCUMENT, {
    _class: document.class.DocumentSnapshot,
    content: { $exists: true }
  })

  for (const snapshot of spnapshots) {
    await client.update(
      DOMAIN_DOCUMENT,
      { _id: snapshot._id },
      {
        $rename: {
          attachedTo: 'parent',
          content: 'description',
          name: 'title'
        },
        $unset: {
          attachedToClass: '',
          collection: ''
        }
      }
    )
  }
}

async function renameFieldsRevert (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('renameFieldsRevert', {})
  const storage = client.storageAdapter

  type ExDocument = Document & {
    description: CollaborativeDoc
  }

  const documents = await client.find<ExDocument>(DOMAIN_DOCUMENT, {
    _class: document.class.Document,
    description: { $exists: true }
  })

  for (const document of documents) {
    await client.update(
      DOMAIN_DOCUMENT,
      { _id: document._id },
      {
        $rename: {
          description: 'content'
        }
      }
    )

    if (document.description.includes('%description:')) {
      try {
        const ydoc = await loadCollaborativeDoc(ctx, storage, client.workspaceId, document.description)
        if (ydoc === undefined) {
          continue
        }

        if (!ydoc.share.has('description') || ydoc.share.has('content')) {
          continue
        }

        yDocCopyXmlField(ydoc, 'description', 'content')

        await saveCollaborativeDoc(ctx, storage, client.workspaceId, document.description, ydoc)
      } catch (err) {
        ctx.error('error document content migration', { error: err, document: document.title })
      }
    }
  }

  const snapshots = await client.find<DocumentSnapshot>(DOMAIN_DOCUMENT, {
    _class: document.class.DocumentSnapshot,
    description: { $exists: true }
  })

  for (const snapshot of snapshots) {
    await client.update(
      DOMAIN_DOCUMENT,
      { _id: snapshot._id },
      {
        $rename: {
          description: 'content'
        }
      }
    )
  }
}

async function restoreContentField (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('restoreContentField', {})
  const storage = client.storageAdapter

  const documents = await client.find<Document>(DOMAIN_DOCUMENT, {
    _class: document.class.Document,
    content: { $exists: true }
  })

  for (const document of documents) {
    try {
      const ydoc = await loadCollaborativeDoc(ctx, storage, client.workspaceId, document.content)
      if (ydoc === undefined) {
        ctx.error('document content not found', { document: document.title })
        continue
      }

      // ignore if content is already present
      if (ydoc.share.has('content') || ydoc.share.has('description')) {
        continue
      }

      if (ydoc.share.has('')) {
        yDocCopyXmlField(ydoc, '', 'content')
        if (ydoc.share.has('content')) {
          await saveCollaborativeDoc(ctx, storage, client.workspaceId, document.content, ydoc)
        } else {
          ctx.error('document content still not found', { document: document.title })
        }
      }
    } catch (err) {
      ctx.error('error document content migration', { error: err, document: document.title })
    }
  }
}

async function migrateRanks (client: MigrationClient): Promise<void> {
  const classes = client.hierarchy.getDescendants(document.class.Teamspace)
  for (const _class of classes) {
    const spaces = await client.find<Teamspace>(DOMAIN_SPACE, { _class })
    for (const space of spaces) {
      await migrateSpaceRanks(client, DOMAIN_DOCUMENT, space)
    }
  }
}

export const documentOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, documentId, [
      {
        state: 'updateDocumentIcons',
        func: migrateDocumentIcons
      },
      {
        state: 'migrate-timespaces',
        func: migrateTeamspaces
      },
      {
        state: 'migrate-teamspaces-mixins',
        func: migrateTeamspacesMixins
      },
      {
        state: 'migrateRank',
        func: migrateRank
      },
      {
        state: 'renameFields',
        func: renameFields
      },
      {
        state: 'fix-rename-backups',
        func: async (client: MigrationClient): Promise<void> => {
          await client.update(DOMAIN_DOCUMENT, { '%hash%': { $exists: true } }, { $set: { '%hash%': null } })
        }
      },
      {
        state: 'renameFieldsRevert',
        func: renameFieldsRevert
      },
      {
        state: 'restoreContentField',
        func: restoreContentField
      },
      {
        state: 'migrateRanks',
        func: migrateRanks
      }
    ])
  },

  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
