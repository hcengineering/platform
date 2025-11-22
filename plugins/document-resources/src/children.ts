//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Ref, type TxOperations } from '@hcengineering/core'
import document, { type Document } from '@hcengineering/document'

/**
 * Find all children documents recursively
 * @param client - TxOperations client
 * @param doc - Parent document
 * @param noParentId - ID representing no parent
 * @returns Array of child document IDs
 */
export async function findChildren (
  client: TxOperations,
  doc: Document,
  noParentId: Ref<Document>
): Promise<Array<Ref<Document>>> {
  const documents = await client.findAll(
    document.class.Document,
    { space: doc.space, parent: { $ne: noParentId } },
    { projection: { _id: 1, parent: 1 } }
  )

  const byParent = new Map<Ref<Document>, Array<Ref<Document>>>()
  for (const document of documents) {
    const group = byParent.get(document.parent) ?? []
    group.push(document._id)
    byParent.set(document.parent, group)
  }

  const result: Array<Ref<Document>> = []
  const visited = new Set<Ref<Document>>()

  const queue = [doc._id]
  while (queue.length > 0) {
    const next = queue.shift()
    if (next === undefined) break

    // Prevent infinite loops from circular references
    if (visited.has(next)) {
      console.warn('Circular reference detected in document hierarchy:', next)
      continue
    }

    const children = (byParent.get(next) ?? []).filter((d) => d != null && !visited.has(d))
    result.push(...children)
    queue.push(...children)
    visited.add(next)
  }

  return result
}
