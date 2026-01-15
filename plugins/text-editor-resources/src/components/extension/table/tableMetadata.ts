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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Node } from '@tiptap/pm/model'

// TableMetadata type - matches the definition in @hcengineering/view-resources
// Defined here to avoid circular dependency (view-resources depends on text-editor-resources)
export interface TableMetadata {
  version: string
  cardClass: string
  viewletId?: string
  config?: Array<string | Record<string, any>>
  query?: Record<string, any>
  documentIds: string[]
  timestamp: number
  workspace?: string
}

/**
 * Extract table metadata from a ProseMirror table node
 * @param node - The table node to extract metadata from
 * @returns The table metadata if present, undefined otherwise
 */
export function getTableMetadata (node: Node): TableMetadata | undefined {
  if (node.type.name !== 'table') {
    return undefined
  }

  const metadataAttr = node.attrs?.tableMetadata
  if (metadataAttr === undefined || typeof metadataAttr !== 'string') {
    return undefined
  }

  try {
    return JSON.parse(metadataAttr) as TableMetadata
  } catch (e) {
    console.warn('Failed to parse table metadata:', e)
    return undefined
  }
}

/**
 * Check if a node has table metadata
 * @param node - The node to check
 * @returns True if the node is a table with metadata
 */
export function hasTableMetadata (node: Node): boolean {
  return getTableMetadata(node) !== undefined
}

/**
 * Extract table metadata from a document by traversing all table nodes
 * @param doc - The ProseMirror document to search
 * @returns Array of tuples containing [table node, metadata]
 */
export function getAllTableMetadata (doc: Node): Array<{ node: Node, metadata: TableMetadata, pos: number }> {
  const results: Array<{ node: Node, metadata: TableMetadata, pos: number }> = []

  doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      const metadata = getTableMetadata(node)
      if (metadata !== undefined) {
        results.push({ node, metadata, pos })
      }
    }
  })

  return results
}
