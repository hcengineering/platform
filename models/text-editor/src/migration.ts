//
// Copyright © 2024 Hardcore Engineering Inc
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

import core, { type Doc } from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationUpgradeClient,
  tryMigrate
} from '@hcengineering/model'
import { parseHTML, pmNodeToMarkup } from '@hcengineering/text'

async function migrateMarkup (client: MigrationClient): Promise<void> {
  const hierarchy = client.hierarchy
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const attributes = hierarchy.getAllAttributes(_class)
    const filtered = Array.from(attributes.values()).filter((attribute) => {
      return (
        hierarchy.isDerived(attribute.type._class, core.class.TypeMarkup) ||
        hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeMarkup)
      )
    })
    if (filtered.length === 0) continue

    const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

    const docs = await client.find(domain, { _class })
    for (const doc of docs) {
      const update: MigrateUpdate<Doc> = {}

      for (const attribute of filtered) {
        const value = (doc as any)[attribute.name]
        if (value == null) continue

        update[attribute.name] = pmNodeToMarkup(parseHTML(value))
      }

      if (Object.keys(update).length > 0) {
        operations.push({ filter: { _id: doc._id }, update })
      }
    }

    if (operations.length > 0) {
      await client.bulk(domain, operations)
    }
  }
}

export const textEditorOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, 'text-editor', [
      {
        state: 'markup',
        func: migrateMarkup
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
