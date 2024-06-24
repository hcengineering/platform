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

import { type Attachment } from '@hcengineering/attachment'
import {
  DOMAIN_TX,
  getCollaborativeDoc,
  MeasureMetricsContext,
  type Class,
  type Doc,
  type Ref
} from '@hcengineering/core'
import { type Document, type Teamspace } from '@hcengineering/document'
import {
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { DOMAIN_ATTACHMENT } from '@hcengineering/model-attachment'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { type Asset } from '@hcengineering/platform'

import document, { documentId, DOMAIN_DOCUMENT } from './index'
import { loadCollaborativeDoc, saveCollaborativeDoc, yDocCopyXmlField } from '@hcengineering/collaboration'

async function migrateCollaborativeContent (client: MigrationClient): Promise<void> {
  const attachedFiles = await client.find<Attachment>(DOMAIN_ATTACHMENT, {
    _class: 'document:class:CollaboratorDocument' as Ref<Class<Doc>>,
    attachedToClass: document.class.Document
  })

  for (const attachment of attachedFiles) {
    const collaborativeDoc = getCollaborativeDoc(attachment._id)

    await client.update(
      DOMAIN_DOCUMENT,
      {
        _id: attachment.attachedTo,
        _class: attachment.attachedToClass,
        content: {
          $exists: false
        }
      },
      {
        $set: {
          content: collaborativeDoc
        }
      }
    )
  }

  // delete snapshots in old format
  await client.deleteMany(DOMAIN_DOCUMENT, {
    _class: 'document:class:DocumentSnapshot' as Ref<Class<Doc>>,
    contentId: { $exists: true }
  })

  await client.update(
    DOMAIN_DOCUMENT,
    {
      _class: document.class.Document,
      snapshots: { $gt: 0 }
    },
    {
      $set: {
        snapshots: 0
      }
    }
  )

  // delete old snapshot transactions
  await client.deleteMany(DOMAIN_TX, {
    _class: core.class.TxCollectionCUD,
    objectClass: document.class.Document,
    collection: 'snapshots'
  })
}

async function fixCollaborativeContentId (client: MigrationClient): Promise<void> {
  const documents = await client.find<Document>(DOMAIN_DOCUMENT, {
    content: { $exists: true }
  })

  // there was a wrong migration that assigned incorrect collaborative doc id
  for (const document of documents) {
    if (!document.content.includes(':')) {
      await client.update(DOMAIN_DOCUMENT, { _id: document._id }, { content: getCollaborativeDoc(document.content) })
    }
  }
}

async function migrateWrongDomainContent (client: MigrationClient): Promise<void> {
  // migrate content saved into wrong domain
  const attachedFiles = await client.find<Attachment>(DOMAIN_DOCUMENT, {
    _class: 'document:class:CollaboratorDocument' as Ref<Class<Doc>>,
    attachedToClass: document.class.Document
  })

  for (const attachment of attachedFiles) {
    const collaborativeDoc = getCollaborativeDoc(attachment._id)

    await client.update(
      DOMAIN_DOCUMENT,
      {
        _id: attachment.attachedTo,
        _class: attachment.attachedToClass,
        content: {
          $exists: false
        }
      },
      {
        $set: {
          content: collaborativeDoc
        }
      }
    )
  }

  await client.move(
    DOMAIN_DOCUMENT,
    {
      _class: 'document:class:CollaboratorDocument' as Ref<Class<Doc>>,
      attachedToClass: document.class.Document
    },
    DOMAIN_ATTACHMENT
  )
}

async function migrateDeleteCollaboratorDocument (client: MigrationClient): Promise<void> {
  await client.deleteMany(DOMAIN_ATTACHMENT, { _class: 'document:class:CollaboratorDocument' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_DOCUMENT, { _class: 'document:class:CollaboratorDocument' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_TX, {
    _class: core.class.TxCollectionCUD,
    collection: 'attachments',
    'tx.objectClass': 'document:class:CollaboratorDocument' as Ref<Class<Doc>>
  })
}

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

async function setNoParent (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_DOCUMENT,
    {
      _class: document.class.Document,
      attachedTo: { $exists: false }
    },
    {
      $set: {
        attachedTo: document.ids.NoParent,
        attachedToClass: document.class.Document
      }
    }
  )
  const docsWithParent = (await client.find(DOMAIN_DOCUMENT, {
    _class: document.class.Document,
    attachedTo: { $exists: true, $ne: document.ids.NoParent }
  })) as Document[]
  for (const doc of docsWithParent) {
    const parent = await client.find(DOMAIN_DOCUMENT, {
      _class: document.class.Document,
      _id: doc.attachedTo
    })
    if (parent.length === 0) continue
    if (parent[0].space !== doc.space) {
      await client.update(
        DOMAIN_DOCUMENT,
        {
          _class: document.class.Document,
          _id: doc._id
        },
        {
          $set: {
            attachedTo: document.ids.NoParent
          }
        }
      )
    }
  }

  await client.update(
    DOMAIN_DOCUMENT,
    {
      _class: document.class.Document,
      attachedTo: ''
    },
    {
      $set: {
        attachedTo: document.ids.NoParent
      }
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
    DOMAIN_TX,
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

async function migrateContentField (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('migrate_content_field', {})
  const storage = client.storageAdapter

  const documents = await client.find<Document>(DOMAIN_DOCUMENT, {
    _class: document.class.Document,
    content: { $exists: true }
  })

  for (const document of documents) {
    try {
      const ydoc = await loadCollaborativeDoc(storage, client.workspaceId, document.content, ctx)
      if (ydoc === undefined) {
        ctx.error('document content not found', { document: document.name })
        continue
      }

      if (!ydoc.share.has('') || ydoc.share.has('content')) {
        continue
      }

      yDocCopyXmlField(ydoc, '', 'content')

      await saveCollaborativeDoc(storage, client.workspaceId, document.content, ydoc, ctx)
    } catch (err) {
      ctx.error('error document content migration', { error: err, document: document.name })
    }
  }
}

export const documentOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, documentId, [
      {
        state: 'migrate-no-parent',
        func: async (client) => {
          await setNoParent(client)
        }
      },
      {
        state: 'collaborativeContent',
        func: migrateCollaborativeContent
      },
      {
        state: 'fixCollaborativeContentId',
        func: fixCollaborativeContentId
      },
      {
        state: 'wrongDomainContent',
        func: migrateWrongDomainContent
      },
      {
        state: 'deleteCollaboratorDocument',
        func: migrateDeleteCollaboratorDocument
      },
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
        state: 'migrateContentField',
        func: migrateContentField
      }
    ])
  },

  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
