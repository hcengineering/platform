<!--
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
-->
<script lang="ts">
  import { Button, CheckBox, Label, Loading, TimeSince, humanReadableFileSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import type { LargestFileRow } from '../stores/largestFiles'
  import plugin from '../plugin'

  export let rows: LargestFileRow[] = []
  export let loading: boolean = false
  export let loadingMore: boolean = false
  export let hasMore: boolean = false
  export let selected = new Set<string>()

  const dispatch = createEventDispatcher<{
    select: { id: string, checked: boolean }
    selectAll: { checked: boolean }
    clearSelection: null
    deleteSelected: null
    loadMore: null
  }>()

  $: visibleIds = rows.map((r) => r.id as unknown as string)
  $: allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  $: someSelected = visibleIds.some((id) => selected.has(id))
  $: selectedRows = rows.filter((r) => selected.has(r.id as unknown as string))
  $: selectedBytes = selectedRows.reduce((sum, r) => sum + r.size, 0)
  $: selectionCount = selectedRows.length

  function onRowClick (row: LargestFileRow): void {
    const id = row.id as unknown as string
    dispatch('select', { id, checked: !selected.has(id) })
  }

  function onSelectAll (): void {
    dispatch('selectAll', { checked: !allSelected })
  }
</script>

<div class="largest-files">
  {#if selectionCount > 0}
    <div class="selection-bar">
      <div class="selection-summary text-md">
        <Label
          label={plugin.string.SelectionSummary}
          params={{ count: selectionCount, size: humanReadableFileSize(selectedBytes, 10, 0) }}
        />
      </div>
      <div class="selection-actions">
        <Button label={plugin.string.ClearSelection} kind="ghost" on:click={() => dispatch('clearSelection')} />
        <Button label={plugin.string.DeleteSelected} kind="dangerous" on:click={() => dispatch('deleteSelected')} />
      </div>
    </div>
  {/if}

  <div class="table" role="table">
    <div class="row header" role="row">
      <div class="cell select" role="columnheader">
        <CheckBox
          checked={allSelected}
          symbol={someSelected && !allSelected ? 'minus' : 'check'}
          on:value={onSelectAll}
        />
      </div>
      <div class="cell name" role="columnheader">
        <Label label={plugin.string.FileName} />
      </div>
      <div class="cell type" role="columnheader">
        <Label label={plugin.string.FileType} />
      </div>
      <div class="cell size" role="columnheader">
        <Label label={plugin.string.FileSize} />
      </div>
      <div class="cell modified" role="columnheader">
        <Label label={plugin.string.FileModified} />
      </div>
    </div>

    {#if loading}
      <div class="state"><Loading /></div>
    {:else if rows.length === 0}
      <div class="state empty text-md">
        <Label label={plugin.string.NoFilesYet} />
      </div>
    {:else}
      {#each rows as row (row.id)}
        {@const id = row.id}
        {@const isChecked = selected.has(id)}
        <div
          class="row data"
          class:selected={isChecked}
          role="row"
          on:click={() => {
            onRowClick(row)
          }}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onRowClick(row)
            }
          }}
          tabindex="0"
        >
          <div class="cell select" role="cell" on:click|stopPropagation>
            <CheckBox
              checked={isChecked}
              on:value={() => {
                onRowClick(row)
              }}
            />
          </div>
          <div class="cell name" role="cell" title={row.name}>
            <span class="filename">{row.name}</span>
          </div>
          <div class="cell type" role="cell">
            {#if row.source === 'attachment'}
              <Label label={plugin.string.FileTypeAttachment} />
            {:else}
              <Label label={plugin.string.FileTypeDrive} />
            {/if}
          </div>
          <div class="cell size" role="cell">
            {humanReadableFileSize(row.size, 10, 1)}
          </div>
          <div class="cell modified" role="cell">
            {#if row.lastModified > 0}
              <TimeSince value={row.lastModified} />
            {:else}
              —
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  {#if !loading && hasMore && rows.length > 0}
    <div class="load-more">
      <Button
        label={plugin.string.LoadMore}
        kind="regular"
        loading={loadingMore}
        on:click={() => dispatch('loadMore')}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .largest-files {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .selection-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-1_5) var(--spacing-2);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    background-color: var(--theme-button-default);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .selection-actions {
    display: flex;
    gap: var(--spacing-1);
  }

  .table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    overflow: hidden;
  }

  .row {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 3fr) 7rem 7rem 7rem;
    align-items: center;
    column-gap: var(--spacing-2);
    padding: var(--spacing-1_5) var(--spacing-2);
    border-bottom: 1px solid var(--theme-divider-color);

    &:last-child {
      border-bottom: none;
    }

    &.data {
      cursor: pointer;

      &:hover {
        background-color: var(--theme-button-hovered);
      }

      &.selected {
        background-color: var(--highlight-select);
      }
    }

    &.header {
      background-color: var(--theme-list-row-color);
      font-weight: 500;
      font-size: 0.8125rem;
      color: var(--theme-content-color);
    }
  }

  .cell {
    min-width: 0;

    &.size {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    &.name {
      overflow: hidden;
    }
  }

  .filename {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--spacing-4);
    color: var(--theme-dark-color);
  }

  .load-more {
    display: flex;
    justify-content: center;
    padding-top: var(--spacing-1);
  }
</style>
