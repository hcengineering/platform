<!--
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
-->
<script lang="ts">
  import type { MarkupNode } from '@hcengineering/text'
  import { markdownToMarkup } from '@hcengineering/text-markdown'
  import { tooltip } from '@hcengineering/ui'
  import view, { tableSnapshotToMarkup } from '@hcengineering/view'
  import MarkupDiffViewer from '../../../MarkupDiffViewer.svelte'
  import StringDiffViewer from '../../../StringDiffViewer.svelte'
  import type { TableConflictCell } from '../snapshot'
  import { buildTableDiff, type TableDiffSide } from './tableDiff'

  /** Markdown for legacy tables, snapshots (with identities) otherwise. */
  export let oldTable: TableDiffSide
  export let newTable: TableDiffSide
  export let conflictCells: TableConflictCell[] = []

  $: conflicts = new Set(conflictCells.map(({ rowId, columnId }) => JSON.stringify([rowId, columnId])))

  function ids (side: TableDiffSide): { rowIds: string[], columnIds: string[] } | undefined {
    return typeof side === 'string' ? undefined : side
  }

  function hasConflict (row: { oldIndex?: number, newIndex?: number } | undefined, columnIndex: number): boolean {
    if (conflicts.size === 0) return false
    const column = diff?.columns[columnIndex]
    const rowId =
      row === undefined
        ? ''
        : row.newIndex !== undefined
          ? ids(newTable)?.rowIds[row.newIndex]
          : row.oldIndex !== undefined
            ? ids(oldTable)?.rowIds[row.oldIndex]
            : undefined
    const columnId =
      column?.newIndex !== undefined
        ? ids(newTable)?.columnIds[column.newIndex]
        : column?.oldIndex !== undefined
          ? ids(oldTable)?.columnIds[column.oldIndex]
          : undefined
    return rowId !== undefined && columnId !== undefined && conflicts.has(JSON.stringify([rowId, columnId]))
  }

  function safeHref (href: string | undefined): string | undefined {
    if (href === undefined) return undefined
    try {
      const url = new URL(href)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
    } catch {
      return undefined
    }
  }

  function documentOf (side: TableDiffSide): MarkupNode {
    return typeof side === 'string'
      ? markdownToMarkup(side)
      : ({ type: 'doc', content: [tableSnapshotToMarkup(side)] } as unknown as MarkupNode)
  }

  $: diff = buildTableDiff(oldTable, newTable)
  $: oldContent = diff === undefined ? documentOf(oldTable) : undefined
  $: newContent = diff === undefined ? documentOf(newTable) : undefined
</script>

{#if diff !== undefined}
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th class="indicator" scope="col"></th>
          {#each diff.columns as column, columnIndex}
            <th
              scope="col"
              class:conflict={hasConflict(undefined, columnIndex)}
              use:tooltip={hasConflict(undefined, columnIndex) ? { label: view.string.TableConflicts } : undefined}
              class:added={column.oldIndex === undefined}
              class:removed={column.newIndex === undefined}
            >
              {#if column.oldIndex === undefined}+{:else if column.newIndex === undefined}−{/if}
              {#if column.oldIndex !== undefined && column.newIndex !== undefined && column.oldHeader !== column.newHeader}
                <StringDiffViewer value={column.newHeader} compareTo={column.oldHeader} method="diffWordsWithSpace" />
              {:else}{column.newIndex === undefined ? column.oldHeader : column.newHeader}{/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each diff.rows as row}
          <tr class:added={row.oldIndex === undefined} class:removed={row.newIndex === undefined}>
            <th class="indicator" scope="row">
              {row.oldIndex === undefined ? '+' : row.newIndex === undefined ? '−' : row.moved ? '↕' : ''}
            </th>
            {#each row.cells as cell, index}
              <td
                class:conflict={hasConflict(row, index)}
                use:tooltip={hasConflict(row, index) ? { label: view.string.TableConflicts } : undefined}
                class:added={row.oldIndex === undefined || diff.columns[index].oldIndex === undefined}
                class:removed={row.newIndex === undefined || diff.columns[index].newIndex === undefined}
              >
                {#if row.oldIndex === undefined || diff.columns[index].oldIndex === undefined}
                  {#if safeHref(cell.newHref) !== undefined}
                    <a href={safeHref(cell.newHref)} target="_blank" rel="noopener noreferrer">{cell.newValue}</a>
                  {:else}{cell.newValue}{/if}
                {:else if row.newIndex === undefined || diff.columns[index].newIndex === undefined}
                  {#if safeHref(cell.oldHref) !== undefined}
                    <a href={safeHref(cell.oldHref)} target="_blank" rel="noopener noreferrer">{cell.oldValue}</a>
                  {:else}{cell.oldValue}{/if}
                {:else if cell.oldMarkup !== undefined && cell.newMarkup !== undefined}
                  <MarkupDiffViewer content={cell.newMarkup} comparedVersion={cell.oldMarkup} />
                {:else if cell.oldValue !== cell.newValue}
                  <StringDiffViewer value={cell.newValue} compareTo={cell.oldValue} method="diffWordsWithSpace" />
                {:else if safeHref(cell.newHref) !== undefined}
                  <a href={safeHref(cell.newHref)} target="_blank" rel="noopener noreferrer">{cell.newValue}</a>
                {:else}{cell.newValue}{/if}
                {#if row.oldIndex !== undefined && row.newIndex !== undefined && diff.columns[index].oldIndex !== undefined && diff.columns[index].newIndex !== undefined && cell.oldHref !== cell.newHref}
                  <div class="link-change">
                    {#if cell.oldHref !== undefined}<span class="removed-link">− {cell.oldHref}</span>{/if}
                    {#if cell.newHref !== undefined}<span class="added-link">+ {cell.newHref}</span>{/if}
                  </div>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else if oldContent !== undefined && newContent !== undefined}
  <MarkupDiffViewer content={newContent} comparedVersion={oldContent} />
{/if}

<style>
  .table-scroll {
    overflow: auto;
    max-height: 80vh;
  }

  table {
    border-collapse: collapse;
    min-width: 100%;
  }

  th,
  td {
    border: 1px solid var(--theme-divider-color);
    padding: 0.4rem 0.6rem;
    text-align: left;
    vertical-align: top;
    min-width: 8rem;
    white-space: pre-wrap;
  }

  .indicator {
    min-width: 1.5rem;
    width: 1.5rem;
    text-align: center;
  }

  .added {
    background-color: var(--text-editor-highlighted-node-add-background-color);
    color: var(--text-editor-highlighted-node-add-font-color);
  }

  .removed {
    background-color: var(--text-editor-highlighted-node-delete-background-color);
    color: var(--text-editor-highlighted-node-delete-font-color);
    text-decoration: line-through;
  }

  .conflict {
    outline: 2px solid var(--theme-warning-color);
    outline-offset: -2px;
  }

  .link-change {
    display: flex;
    flex-direction: column;
    overflow-wrap: anywhere;
    margin-top: 0.25rem;
    font-size: 0.85em;
  }

  .removed-link {
    color: var(--text-editor-highlighted-node-delete-font-color);
    background-color: var(--text-editor-highlighted-node-delete-background-color);
    text-decoration: line-through;
  }

  .added-link {
    color: var(--text-editor-highlighted-node-add-font-color);
    background-color: var(--text-editor-highlighted-node-add-background-color);
  }
</style>
