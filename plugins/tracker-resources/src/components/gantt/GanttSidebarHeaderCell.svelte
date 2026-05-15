<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  /**
   * Phase 3a header cell: clickable label that cycles the sort state and
   * a thin resize handle on the right edge that emits live width updates.
   *
   * Resize semantics:
   *  - `mousedown` on `.resize-handle` registers window-level listeners and
   *    captures `startX` + `startWidth` so the move math is delta-based.
   *  - `mousemove` dispatches `resizePreview` with the clamped candidate
   *    width — the parent updates its widths-map immediately for live feedback.
   *  - `mouseup` dispatches `resizeCommit` once with the final clamped width
   *    so the parent can persist or debounce-write.
   *
   * Listeners are attached/removed deterministically; the component does not
   * leak a `mousemove` handler if the user drags off the window edge.
   */
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { Label } from '@hcengineering/ui'
  import type { IntlString } from '@hcengineering/platform'
  import type { SidebarColumnKey } from './lib/sidebar-columns'
  import { clampWidth } from './lib/sidebar-columns'
  import type { SortDirection } from './lib/sidebar-sort'

  export let column: SidebarColumnKey
  export let width: number
  export let label: IntlString
  export let sortDirection: SortDirection | null = null
  /** True if this column has a meaningful sort comparator (else label is non-clickable). */
  export let sortable: boolean = true

  const dispatch = createEventDispatcher<{
    sort: { column: SidebarColumnKey }
    resizePreview: { column: SidebarColumnKey, width: number }
    resizeCommit: { column: SidebarColumnKey, width: number }
  }>()

  let resizing = false
  let startX = 0
  let startWidth = 0

  function onMouseDown (evt: MouseEvent): void {
    evt.preventDefault()
    evt.stopPropagation()
    resizing = true
    startX = evt.clientX
    startWidth = width
    window.addEventListener('mousemove', onWindowMove)
    window.addEventListener('mouseup', onWindowUp)
  }

  function onWindowMove (evt: MouseEvent): void {
    if (!resizing) return
    const next = clampWidth(startWidth + (evt.clientX - startX))
    dispatch('resizePreview', { column, width: next })
  }

  function onWindowUp (evt: MouseEvent): void {
    if (!resizing) return
    const final = clampWidth(startWidth + (evt.clientX - startX))
    resizing = false
    window.removeEventListener('mousemove', onWindowMove)
    window.removeEventListener('mouseup', onWindowUp)
    dispatch('resizeCommit', { column, width: final })
  }

  function onLabelClick (): void {
    if (!sortable) return
    dispatch('sort', { column })
  }

  function ariaSort (dir: SortDirection | null): 'ascending' | 'descending' | 'none' {
    if (dir === 'asc') return 'ascending'
    if (dir === 'desc') return 'descending'
    return 'none'
  }

  onDestroy(() => {
    if (resizing) {
      window.removeEventListener('mousemove', onWindowMove)
      window.removeEventListener('mouseup', onWindowUp)
    }
  })
</script>

<div
  class="header-cell"
  class:resizing
  role="columnheader"
  aria-sort={ariaSort(sortDirection)}
  style="width: {width}px;"
>
  <button
    type="button"
    class="header-label"
    class:sortable
    disabled={!sortable}
    on:click={onLabelClick}
  >
    <span class="label-text"><Label {label} /></span>
    {#if sortDirection === 'asc'}
      <span class="sort-glyph" aria-hidden="true">▲</span>
    {:else if sortDirection === 'desc'}
      <span class="sort-glyph" aria-hidden="true">▼</span>
    {/if}
  </button>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="resize-handle"
    role="separator"
    aria-orientation="vertical"
    on:mousedown={onMouseDown}
  />
</div>

<style lang="scss">
  .header-cell {
    position: relative;
    display: inline-flex;
    align-items: center;
    height: 100%;
    box-sizing: border-box;
    padding: 0 6px;
    border-right: 1px solid var(--theme-divider-color);
    background: var(--theme-comp-header-color);
    flex: 0 0 auto;
    overflow: hidden;
  }
  .header-cell.resizing {
    background: var(--theme-button-hovered);
  }
  .header-label {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--theme-darker-color);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
    text-align: left;
    overflow: hidden;
    cursor: default;
  }
  .header-label.sortable {
    cursor: pointer;
  }
  .header-label.sortable:hover {
    color: var(--theme-content-color);
  }
  .header-label[disabled] {
    opacity: 0.85;
  }
  .label-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sort-glyph {
    font-size: 9px;
    color: var(--theme-content-trans-color);
    flex-shrink: 0;
  }
  .resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
  }
  .resize-handle:hover,
  .header-cell.resizing .resize-handle {
    background: color-mix(in srgb, var(--theme-content-color) 25%, transparent);
  }
</style>
