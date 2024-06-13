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

import { DOMAIN_TX, MeasureMetricsContext } from '@hcengineering/core'
import { type Document, type Teamspace } from '@hcengineering/document'
import {
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { type Asset } from '@hcengineering/platform'

import document, { documentId, DOMAIN_DOCUMENT } from './index'
import { loadCollaborativeDoc, saveCollaborativeDoc, yDocCopyXmlField } from '@hcengineering/collaboration'

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
  if (storage === undefined) {
    return
  }

  const documents = await client.find<Document>(DOMAIN_DOCUMENT, {
    _class: document.class.Document,
    content: { $exists: true }
  })

  for (const document of documents) {
    try {
      const ydoc = await loadCollaborativeDoc(storage, client.workspaceId, document.content, ctx)
      if (ydoc === undefined) {
        continue
      }

      if (!ydoc.share.has('')) {
        continue
      }

      yDocCopyXmlField(ydoc, '', 'content')

      await saveCollaborativeDoc(storage, client.workspaceId, document.content, ydoc, ctx)
    } catch {}
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
        state: 'migrateContentField',
        func: migrateContentField
      }
    ])
  },

  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
