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

import { type Editor } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { showPopup } from '@hcengineering/ui'
import view, { tableMetadataColumnIds, type ResolvedTableSnapshot } from '@hcengineering/view'
import { attachTableSnapshot, summarizeTableEdits } from '../snapshot'
import { getTableMetadata } from '../tableMetadata'
import { findTable } from '../utils'
import { showTableError, showTableMessage } from './errors'
import TableRefreshConfirmation from './TableRefreshConfirmation.svelte'
import { loadTableComparison } from './tableUtils'

/**
 * Follows a table's position through every later transaction, local or collaborative. The position
 * is lost when the table is deleted, so a refresh never lands on another, possibly identical, table.
 */
export interface TableBookmark {
  position: () => number | undefined
  dispose: () => void
}

export function trackTable (editor: Editor, pos: number): TableBookmark {
  let current: number | undefined = pos
  const onTransaction = ({ transaction }: { transaction: Transaction }): void => {
    if (current === undefined || !transaction.docChanged) return
    const result = transaction.mapping.mapResult(current, 1)
    current = result.deletedAfter ? undefined : result.pos
  }
  editor.on('transaction', onTransaction)
  return {
    position: () => current,
    dispose: () => {
      editor.off('transaction', onTransaction)
    }
  }
}

/**
 * Replace the previewed table only if it is still in place and unchanged since the preview opened;
 * otherwise explain that the preview is stale.
 */
export function applyTableRefresh (
  editor: Editor,
  original: Node,
  bookmark: TableBookmark,
  resolved: ResolvedTableSnapshot
): void {
  if (editor.isDestroyed) return
  const target = bookmark.position()
  const node = target === undefined ? null : editor.state.doc.nodeAt(target)
  if (target === undefined || node === null || !node.eq(original)) {
    showTableMessage(view.string.TableChangedDuringPreview)
    return
  }
  let replacement: Node | undefined
  Node.fromJSON(editor.state.schema, markdownToMarkup(resolved.markdown)).forEach((child) => {
    if (child.type.name === 'table' && replacement === undefined) replacement = child
  })
  if (replacement === undefined) throw new Error('Source snapshot contains no table')
  const next = attachTableSnapshot(replacement, resolved.metadata, resolved.snapshot.rowIds)
  editor.view.dispatch(editor.state.tr.replaceWith(target, target + original.nodeSize, next))
}

/** Preview the exact replacement, including local edits and conflicts, before applying it. */
export async function refreshTable (editor: Editor): Promise<void> {
  const table = findTable(editor.state.selection)
  const metadata = table === undefined ? undefined : getTableMetadata(table.node)
  if (table === undefined || metadata === undefined) return
  // Edits made while the source loads or the preview is open are followed too.
  const bookmark = trackTable(editor, table.pos)
  try {
    const { fresh, current, source, state } = await loadTableComparison(table.node, metadata)
    // Rows a relationship table should contain are not stored, so only its columns are checked.
    const expected = {
      rowIds: metadata.source?.kind === 'relationship' ? [] : metadata.documentIds.map(String),
      columnIds: tableMetadataColumnIds(metadata)
    }
    const summary =
      state === undefined
        ? { localChanges: false, conflicts: false }
        : summarizeTableEdits(state, fresh.snapshot, expected)
    showPopup(
      TableRefreshConfirmation,
      {
        current,
        fresh: source,
        metadata: fresh.metadata,
        ...summary,
        onApply: () => {
          try {
            applyTableRefresh(editor, table.node, bookmark, fresh)
          } catch (error) {
            console.error('Failed to apply table refresh:', error)
            showTableError(error)
          }
        }
      },
      'center',
      () => {
        bookmark.dispose()
      }
    )
  } catch (error) {
    bookmark.dispose()
    console.error('Failed to refresh table:', error)
    showTableError(error)
  }
}
