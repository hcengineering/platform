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

import core, { type AnyAttribute, type Doc, type Domain } from '@hcengineering/core'
import {
  tryMigrate,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationIterator,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { htmlToMarkup, jsonToPmNode, jsonToText } from '@hcengineering/text'

async function migrateMarkup (client: MigrationClient): Promise<void> {
  const hierarchy = client.hierarchy
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const attributes = hierarchy.getAllAttributes(_class)
    const filtered = Array.from(attributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, core.class.TypeMarkup)
    })
    if (filtered.length === 0) continue

    const iterator = await client.traverse(domain, { _class })
    try {
      await processMigrateMarkupFor(domain, filtered, client, iterator)
    } finally {
      await iterator.close()
    }
  }
}

async function processMigrateMarkupFor (
  domain: Domain,
  attributes: AnyAttribute[],
  client: MigrationClient,
  iterator: MigrationIterator<Doc>
): Promise<void> {
  let processed = 0
  while (true) {
    const docs = await iterator.next(1000)
    if (docs === null || docs.length === 0) {
      break
    }

    const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

    for (const doc of docs) {
      const update: MigrateUpdate<Doc> = {}

      for (const attribute of attributes) {
        const value = (doc as any)[attribute.name]
        if (value != null) {
          // check if it is already json just skip it
          try {
            const node = jsonToPmNode(value)
            if (node.type === undefined) {
              throw new Error('Not a valid json node')
            }
          } catch {
            update[attribute.name] = htmlToMarkup(value)
          }
        }
      }

      if (Object.keys(update).length > 0) {
        operations.push({ filter: { _id: doc._id }, update })
      }
    }

    if (operations.length > 0) {
      await client.bulk(domain, operations)
    }

    processed += docs.length
    console.log('...processed', processed)
  }
}

async function fixMigrateMarkup (client: MigrationClient): Promise<void> {
  const hierarchy = client.hierarchy
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const attributes = hierarchy.getAllAttributes(_class)
    const filtered = Array.from(attributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, core.class.TypeMarkup)
    })
    if (filtered.length === 0) continue

    const iterator = await client.traverse(domain, { _class })
    try {
      await processFixMigrateMarkupFor(domain, filtered, client, iterator)
    } finally {
      await iterator.close()
    }
  }
}

async function processFixMigrateMarkupFor (
  domain: Domain,
  attributes: AnyAttribute[],
  client: MigrationClient,
  iterator: MigrationIterator<Doc>
): Promise<void> {
  let processed = 0
  while (true) {
    const docs = await iterator.next(1000)
    if (docs === null || docs.length === 0) {
      break
    }

    const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

    for (const doc of docs) {
      const update: MigrateUpdate<Doc> = {}

      for (const attribute of attributes) {
        try {
          const value = (doc as any)[attribute.name]
          if (value != null) {
            let res = value
            while ((res as string).includes('\\"type\\"')) {
              try {
                const json = JSON.parse(res)
                const text = jsonToText(json)
                JSON.parse(text)
                res = text
              } catch {
                break
              }
            }
            if (res !== value) {
              update[attribute.name] = res
            }
          }
        } catch {}
      }

      if (Object.keys(update).length > 0) {
        operations.push({ filter: { _id: doc._id }, update })
      }
    }

    if (operations.length > 0) {
      await client.bulk(domain, operations)
    }

    processed += docs.length
    console.log('...processed', processed)
  }
}

export const textEditorOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, 'text-editor', [
      {
        state: 'markup',
        func: migrateMarkup
      },
      {
        state: 'fix-markup',
        func: fixMigrateMarkup
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
