//
// Copyright © 2026 TraceX SAS.
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
import { parseTableMetadata, tableMetadataProblem, type TableMetadata } from '@hcengineering/view'

function cachedMetadata (node: Node): TableMetadata | undefined {
  if (node.type.name !== 'table') return undefined
  const metadataAttr = node.attrs?.tableMetadata
  if (metadataAttr === undefined || typeof metadataAttr !== 'string') return undefined
  return parseCached(metadataAttr)
}

/**
 * Extract table metadata from a ProseMirror table node
 * @param node - The table node to extract metadata from
 * @returns A copy of the table metadata if present (callers may change it), undefined otherwise
 */
export function getTableMetadata (node: Node): TableMetadata | undefined {
  const metadata = cachedMetadata(node)
  return metadata === undefined ? undefined : structuredClone(metadata)
}

/** Metadata version of a table, without copying the metadata (used on every edit). */
export function getTableMetadataVersion (node: Node): TableMetadata['version'] | undefined {
  return cachedMetadata(node)?.version
}

/**
 * Parsed metadata by attribute text. The editor asks for it on every local edit inside a table, and
 * the attribute only changes on paste or refresh, so parsing once per distinct text is enough.
 */
const parsed = new Map<string, TableMetadata | undefined>()
const CACHE_SIZE = 64

function parseCached (text: string): TableMetadata | undefined {
  if (parsed.has(text)) return parsed.get(text)
  let metadata: TableMetadata | undefined
  try {
    metadata = parseTableMetadata(JSON.parse(text))
  } catch (e) {
    console.warn('Failed to parse table metadata:', e)
  }
  if (parsed.size >= CACHE_SIZE) parsed.delete(parsed.keys().next().value as string)
  parsed.set(text, metadata)
  return metadata
}

/** Why a table that carries metadata cannot use it: newer version, or damaged. */
export function getTableMetadataProblem (node: Node): 'unsupported' | 'damaged' | undefined {
  const text = node.type.name === 'table' ? node.attrs?.tableMetadata : undefined
  if (typeof text !== 'string' || text === '' || cachedMetadata(node) !== undefined) return undefined
  try {
    return tableMetadataProblem(JSON.parse(text))
  } catch {
    return 'damaged'
  }
}

/**
 * Check if a node has table metadata
 * @param node - The node to check
 * @returns True if the node is a table with metadata
 */
export function hasTableMetadata (node: Node): boolean {
  return cachedMetadata(node) !== undefined
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
