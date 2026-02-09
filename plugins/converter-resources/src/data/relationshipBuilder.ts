//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Class, Client, Doc, Hierarchy, Ref } from '@hcengineering/core'
import type { AttributeModel } from '@hcengineering/view'
import { buildConfigAssociation, buildConfigLookup } from '@hcengineering/view-resources'
import type { RelationshipCellModel, RelationshipRowModel } from '../types'

/**
 * Parse association attribute key into path of association keys.
 * e.g. "$associations.X_b" -> ["X_b"], "$associations.X_b.$associations.Y_b" -> ["X_b", "Y_b"]
 */
function parseAssociationKeyPath (key: string): string[] {
  if (!key.startsWith('$associations')) return []
  const parts = key.split('$associations.').filter((p) => p.length > 0)
  return parts.map((p) => (p.endsWith('.') ? p.slice(0, -1) : p).trim()).filter(Boolean)
}

/**
 * Get doc at given depth from parent's $associations using path[depth].
 * depth 0 = parent itself, depth 1 = parent.$associations[path[0]][index], etc.
 */
function getAssocChildren (parent: any, pathKey: string): Doc[] | undefined {
  const arr = parent?.$associations?.[pathKey]
  if (Array.isArray(arr)) return arr
  if (arr !== undefined && arr !== null) return [arr as Doc]
  return undefined
}

/**
 * Expand rows for one root: one row per (level0, level1, ..., levelN) with correct nesting.
 * Each row is [root, child1, child2, ...] where child1 from root.$associations[path[0]], child2 from child1.$associations[path[1]], etc.
 */
function expandRowsForRoot (
  root: Doc,
  associationAttrs: AttributeModel[],
  pathPerAttr: string[][]
): Array<{ docsByLevel: (Doc | undefined)[] }> {
  const rows: Array<{ docsByLevel: (Doc | undefined)[] }> = []

  function expand (parent: Doc | undefined, level: number, docsSoFar: (Doc | undefined)[]): void {
    if (level >= associationAttrs.length) {
      rows.push({ docsByLevel: docsSoFar })
      return
    }
    const path = pathPerAttr[level]
    const key = path[level]
    const children = parent !== undefined ? getAssocChildren(parent as any, key) : undefined
    const list = children !== undefined && children !== null && children.length > 0 ? children : [undefined]
    for (const doc of list) {
      expand(doc ?? undefined, level + 1, [...docsSoFar, doc])
    }
  }

  const firstPath = pathPerAttr[0]
  const firstKey = firstPath[0]
  const firstChildren = getAssocChildren(root as any, firstKey)
  const firstList =
    firstChildren !== undefined && firstChildren !== null && firstChildren.length > 0 ? firstChildren : [undefined]
  for (const doc of firstList) {
    expand(doc ?? undefined, 1, [root, doc])
  }
  return rows
}

/**
 * Compute rowSpan for a given level at each row index: how many consecutive rows share the same doc at this level.
 */
function computeRowSpans (rows: Array<{ docsByLevel: (Doc | undefined)[] }>, level: number): number[] {
  const spans: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const doc = rows[i].docsByLevel[level]
    const docId = doc?._id
    let span = 1
    for (let j = i + 1; j < rows.length; j++) {
      if (rows[j].docsByLevel[level]?._id === docId) span++
      else break
    }
    spans.push(span)
  }
  return spans
}

/**
 * Rebuild relationship table viewModel from documents and metadata
 * Recreates the hierarchical structure with row spans and separate rows for each associated child.
 * Supports multi-level associations (A -> B -> C): nested keys like $associations.X_b.$associations.Y_b
 * are resolved from the correct parent doc per level.
 */
export async function rebuildRelationshipTableViewModel (
  docs: Doc[],
  model: AttributeModel[],
  cardClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  client: Client
): Promise<RelationshipRowModel[]> {
  const viewModel: RelationshipRowModel[] = []

  const config = model.map((m) => m.key)
  const associations = buildConfigAssociation(config)
  const lookup = buildConfigLookup(hierarchy, cardClass, config)

  const associationAttrs = model.filter((attr) => attr.key.startsWith('$associations'))
  const pathPerAttr = associationAttrs.map((attr) => parseAssociationKeyPath(attr.key))

  let docsWithAssociations: Doc[] = docs
  if (associations !== undefined && associations.length > 0) {
    const docIds = docs.map((d) => d._id)
    const query = { _id: { $in: docIds } }
    docsWithAssociations = await client.findAll(cardClass, query, { lookup, associations })
    const idToIndex = new Map(docs.map((d, i) => [d._id, i]))
    docsWithAssociations.sort((a, b) => (idToIndex.get(a._id) ?? Infinity) - (idToIndex.get(b._id) ?? Infinity))
  }

  for (const parentDoc of docsWithAssociations) {
    const expandedRows = expandRowsForRoot(parentDoc, associationAttrs, pathPerAttr)

    if (expandedRows.length === 0) {
      const cells: RelationshipCellModel[] = []
      for (const attr of model) {
        const isAssociationKey = attr.key.startsWith('$associations')
        cells.push({
          attribute: attr,
          rowSpan: 1,
          object: isAssociationKey ? undefined : parentDoc,
          parentObject: isAssociationKey ? parentDoc : undefined
        })
      }
      viewModel.push({ cells })
      continue
    }

    const rowSpanByLevel: number[][] = []
    for (let level = 0; level <= associationAttrs.length; level++) {
      rowSpanByLevel.push(computeRowSpans(expandedRows, level))
    }

    for (let rowIdx = 0; rowIdx < expandedRows.length; rowIdx++) {
      const rowData = expandedRows[rowIdx]
      const cells: RelationshipCellModel[] = []

      for (const attr of model) {
        const isAssociationKey = attr.key.startsWith('$associations')

        if (attr.key === '') {
          const span = rowSpanByLevel[0][rowIdx]
          const isFirstInSpan =
            rowIdx === 0 || expandedRows[rowIdx - 1].docsByLevel[0]?._id !== rowData.docsByLevel[0]?._id
          cells.push({
            attribute: attr,
            rowSpan: isFirstInSpan ? span : 0,
            object: isFirstInSpan ? parentDoc : undefined,
            parentObject: undefined
          })
          continue
        }

        if (isAssociationKey) {
          const assocIdx = associationAttrs.indexOf(attr)
          if (assocIdx < 0) {
            cells.push({ attribute: attr, rowSpan: 1, object: undefined, parentObject: undefined })
            continue
          }
          const level = assocIdx + 1
          const docAtLevel = rowData.docsByLevel[level]
          const parentAtLevel = rowData.docsByLevel[level - 1]
          const span = rowSpanByLevel[level][rowIdx]
          const isFirstInSpan =
            rowIdx === 0 || expandedRows[rowIdx - 1].docsByLevel[level]?._id !== rowData.docsByLevel[level]?._id
          cells.push({
            attribute: attr,
            rowSpan: isFirstInSpan ? span : 0,
            object: isFirstInSpan ? docAtLevel : undefined,
            parentObject: isFirstInSpan ? parentAtLevel : undefined
          })
          continue
        }

        cells.push({
          attribute: attr,
          rowSpan: 1,
          object: rowIdx === 0 ? parentDoc : undefined,
          parentObject: undefined
        })
      }
      viewModel.push({ cells })
    }
  }

  return viewModel
}
