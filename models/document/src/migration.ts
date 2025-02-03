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

import {
  DOMAIN_MODEL_TX,
  DOMAIN_TX,
  makeDocCollabId,
  MeasureMetricsContext,
  SortingOrder,
  type Class,
  type CollaborativeDoc,
  type Doc,
  type Ref
} from '@hcengineering/core'
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
import { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_NOTIFICATION } from '@hcengineering/notification'
import { type Asset } from '@hcengineering/platform'
import { makeRank } from '@hcengineering/rank'

import { loadCollabYdoc, saveCollabYdoc, yDocCopyXmlField } from '@hcengineering/collaboration'
import attachment, { DOMAIN_ATTACHMENT } from '@hcengineering/model-attachment'
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

    try {
      const collabId = makeDocCollabId(document, 'content')

      const ydoc = await loadCollabYdoc(ctx, storage, client.workspaceId, collabId)
      if (ydoc === undefined) {
        continue
      }

      if (!ydoc.share.has('description') || ydoc.share.has('content')) {
        continue
      }

      yDocCopyXmlField(ydoc, 'description', 'content')

      await saveCollabYdoc(ctx, storage, client.workspaceId, collabId, ydoc)
    } catch (err) {
      ctx.error('error document content migration', { error: err, document: document.title })
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
      const collabId = makeDocCollabId(document, 'content')

      const ydoc = await loadCollabYdoc(ctx, storage, client.workspaceId, collabId)
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
          await saveCollabYdoc(ctx, storage, client.workspaceId, collabId, ydoc)
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

async function removeOldClasses (client: MigrationClient): Promise<void> {
  const classes = [
    'document:class:DocumentContent',
    'document:class:DocumentSnapshot',
    'document:class:DocumentVersion',
    'document:class:DocumentRequest'
  ] as Ref<Class<Doc>>[]

  for (const _class of classes) {
    await client.deleteMany(DOMAIN_DOCUMENT, { _class })
    await client.deleteMany(DOMAIN_ACTIVITY, { attachedToClass: _class })
    await client.deleteMany(DOMAIN_ACTIVITY, { objectClass: _class })
    await client.deleteMany(DOMAIN_NOTIFICATION, { attachedToClass: _class })
    await client.deleteMany(DOMAIN_TX, { objectClass: _class })
    await client.deleteMany(DOMAIN_TX, { 'tx.objectClass': _class })
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
      },
      {
        state: 'removeOldClasses',
        func: removeOldClasses
      },
      {
        state: 'migrateEmbeddings',
        func: migrateEmbeddings
      }
    ])
  },

  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}

async function migrateEmbeddings (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_DOCUMENT,
    { _class: 'document:class:DocumentEmbedding' as Ref<Class<Doc>> },
    { _class: attachment.class.Embedding }
  )
  await client.move(DOMAIN_DOCUMENT, { _class: attachment.class.Embedding }, DOMAIN_ATTACHMENT)
}
