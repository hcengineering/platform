//
// Copyright © 2026 TraceX SAS.
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

import { generateId } from '@hcengineering/core'
import type { GlobalAttributes } from '@tiptap/core'
import { isChangeOrigin } from '@tiptap/extension-collaboration'
import type { Node } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'
import { Mapping } from '@tiptap/pm/transform'
import { tableCellColumns, tableColumnCells } from './snapshot'
import { getTableMetadataVersion } from './tableMetadata'

export const tableIdentityAttributes: GlobalAttributes = [
  {
    types: ['tableRow'],
    attributes: {
      sourceRowId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-source-row-id'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.sourceRowId == null ? {} : { 'data-source-row-id': attrs.sourceRowId }
      }
    }
  },
  {
    types: ['tableCell', 'tableHeader'],
    attributes: {
      sourceColumnId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-source-column-id'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.sourceColumnId == null ? {} : { 'data-source-column-id': attrs.sourceColumnId }
      },
      // Fingerprint of the value the cell had when it was last copied or refreshed.
      sourceHash: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-source-hash'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.sourceHash == null ? {} : { 'data-source-hash': attrs.sourceHash }
      }
    }
  }
]

const identityKey = new PluginKey('tableIdentities')

/** Positions of tables in the new document whose content the transactions touched. */
function touchedTables (transactions: readonly Transaction[], state: EditorState): number[] {
  const maps = transactions.flatMap((tr) => tr.mapping.maps)
  const tables = new Set<number>()
  maps.forEach((map, index) => {
    map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      let from = newStart
      let to = newEnd
      for (const later of maps.slice(index + 1)) {
        from = later.map(from, -1)
        to = later.map(to, 1)
      }
      from = Math.max(0, from - 1)
      to = Math.min(state.doc.content.size, to + 1)
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name !== 'table') return true
        tables.add(pos)
        return false
      })
    })
  })
  return [...tables]
}

/** Where each identity sat before the change, mapped into the new document. */
function previousPositions (
  oldTable: Node | null | undefined,
  oldPos: number,
  mapping: Mapping
): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>()
  if (oldTable?.type.name !== 'table') return result
  oldTable.descendants((node, pos) => {
    const id = node.attrs.sourceRowId ?? node.attrs.sourceColumnId
    if (typeof id === 'string') {
      const positions = result.get(id) ?? new Set<number>()
      positions.add(mapping.map(oldPos + 1 + pos))
      result.set(id, positions)
    }
    return node.type.name === 'tableRow'
  })
  return result
}

/** Keep one holder per identity (the one that already had it); others get a local identity. */
function normalize (ids: string[], positions: number[], previous: Map<string, Set<number>>): void {
  const groups = new Map<string, number[]>()
  ids.forEach((id, index) => {
    const group = groups.get(id)
    if (group === undefined) groups.set(id, [index])
    else group.push(index)
  })
  for (const [id, indices] of groups) {
    const before = previous.get(id)
    const retained = indices.find((index) => before?.has(positions[index]) === true) ?? indices[0]
    for (const index of indices) {
      if (id === '' || index !== retained) ids[index] = `local:${generateId()}`
    }
  }
}

/**
 * Inserted rows and columns must not inherit the source identity copied by table commands.
 * Only local edits are normalized, and only in the tables they touched: remote collaborative
 * changes arrive already normalized by their author, so clients never race to rename identities.
 */
export function tableIdentities (): Plugin {
  return new Plugin({
    key: identityKey,
    appendTransaction (transactions, oldState, state) {
      const local = transactions.filter(
        (tr) => tr.docChanged && !isChangeOrigin(tr) && tr.getMeta(identityKey) !== true
      )
      if (local.length === 0 || local.length !== transactions.filter((tr) => tr.docChanged).length) return
      const mapping = new Mapping(transactions.flatMap((tr) => tr.mapping.maps))
      const inverse = mapping.invert()
      const tr = state.tr
      for (const tablePos of touchedTables(transactions, state)) {
        const table = state.doc.nodeAt(tablePos)
        if (table === null || getTableMetadataVersion(table) !== '2.0') continue
        const oldPos = inverse.map(tablePos)
        const previous = previousPositions(oldState.doc.nodeAt(oldPos), oldPos, mapping)
        const cellColumns = tableCellColumns(TableMap.get(table))

        // Column identities come from the first cell spanning exactly that column, so a merged
        // header cell neither defines nor churns them.
        const columnPositions = tableColumnCells(table).map((pos) => tablePos + 1 + pos)
        const columnIds = columnPositions.map((pos) => String(state.doc.nodeAt(pos)?.attrs.sourceColumnId ?? ''))
        normalize(columnIds, columnPositions, previous)

        const rowIds: string[] = []
        const rowPositions: number[] = []
        table.forEach((row, offset, index) => {
          if (index === 0) return
          rowIds.push(String(row.attrs.sourceRowId ?? ''))
          rowPositions.push(tablePos + 1 + offset)
        })
        normalize(rowIds, rowPositions, previous)

        const set = (node: Node, pos: number, key: string, value: string): void => {
          if (node.attrs[key] !== value) tr.setNodeMarkup(pos, undefined, { ...node.attrs, [key]: value })
        }
        table.forEach((row, offset, rowIndex) => {
          const rowPos = tablePos + 1 + offset
          if (rowIndex > 0) set(row, rowPos, 'sourceRowId', rowIds[rowIndex - 1])
          row.forEach((cell, cellOffset) => {
            const column = cellColumns.get(offset + 1 + cellOffset) ?? -1
            if (Number(cell.attrs.colspan ?? 1) === 1 && columnIds[column] !== undefined) {
              set(cell, rowPos + 1 + cellOffset, 'sourceColumnId', columnIds[column])
            }
          })
        })
      }
      if (!tr.docChanged) return
      // Appended transactions are grouped with the edit in history, so undo restores both.
      return tr.setMeta(identityKey, true)
    }
  })
}
