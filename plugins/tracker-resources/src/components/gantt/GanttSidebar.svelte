<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { LayoutRow } from './lib/types'
  import type { TimeScale } from './lib/time-scale'
  import IssuePresenter from '../issues/IssuePresenter.svelte'

  export let rows: LayoutRow[]
  export let scrollTop: number = 0
  export let viewportHeight: number = 600
  $: void viewportHeight
  export let width: number = 360
  export let headerHeight: number = 56
  export let timeScale: TimeScale | undefined = undefined
  export let viewportLeft: number = 0
  export let viewportRight: number = 0

  const dispatch = createEventDispatcher<{
    jump: { x: number }
    toggle: { id: string }
  }>()

  function jumpDirection (
    obj: { startDate: number | null, dueDate: number | null }
  ): 'left' | 'right' | null {
    if (timeScale === undefined) return null
    if (obj.startDate == null && obj.dueDate == null) return null
    const startX = obj.startDate != null ? timeScale.toX(obj.startDate) : null
    const dueX = obj.dueDate != null ? timeScale.toX(obj.dueDate) : null
    const minX = startX ?? dueX!
    const maxX = dueX ?? startX!
    if (maxX < viewportLeft) return 'left'
    if (minX > viewportRight) return 'right'
    return null
  }

  function rowJumpTarget (
    row: LayoutRow
  ): { startDate: number | null, dueDate: number | null } | null {
    if (row.kind === 'issue' && row.issue !== null) {
      return { startDate: row.issue.startDate, dueDate: row.issue.dueDate }
    }
    if (row.kind === 'milestone' && row.milestone !== null) {
      return { startDate: row.milestone.startDate, dueDate: row.milestone.targetDate }
    }
    return null
  }
</script>

<div class="gantt-sidebar" style="width: {width}px;">
  <div class="sidebar-header" style="height: {headerHeight}px;">
    <span class="col-toggle" />
    <span class="col-id">Issue</span>
    <span class="col-title">Title</span>
    <span class="col-jump" />
  </div>
  <div class="sidebar-rows" style="transform: translateY({-scrollTop}px);">
    {#each rows as row (row.id)}
      {@const indent = row.depth * 16}
      {@const tgt = rowJumpTarget(row)}
      {@const dir = tgt !== null ? jumpDirection(tgt) : null}
      {@const ts = timeScale}
      <div
        class="sidebar-row"
        class:summary={row.isSummary}
        class:milestone={row.kind === 'milestone'}
        style="height: {row.height}px; padding-left: {8 + indent}px;"
      >
        <span class="col-toggle">
          {#if row.collapsible}
            <button
              type="button"
              class="toggle-btn"
              title={row.collapsed ? 'Expand' : 'Collapse'}
              on:click={() => dispatch('toggle', { id: row.id })}
            >
              {row.collapsed ? '▶' : '▼'}
            </button>
          {/if}
        </span>
        {#if row.kind === 'milestone' && row.milestone !== null}
          <span class="cell-id ms-icon" title="Milestone">◆</span>
          <span class="cell-title" title={row.milestone.label}>
            {row.milestone.label}
          </span>
        {:else if row.issue !== null}
          <span class="cell-id">
            <IssuePresenter value={row.issue} disabled={false} />
          </span>
          <span class="cell-title" title={row.issue.title}>
            {row.issue.title}
          </span>
        {:else}
          <span class="cell-id" />
          <span class="cell-title" />
        {/if}
        <span class="cell-jump">
          {#if dir !== null && ts !== undefined && tgt !== null}
            {@const targetX = ts.toX(tgt.startDate ?? tgt.dueDate ?? 0)}
            <button
              type="button"
              class="jump-btn"
              title={dir === 'left' ? 'Scroll left to bar' : 'Scroll right to bar'}
              on:click={() => dispatch('jump', { x: targetX })}
            >
              {dir === 'left' ? '←' : '→'}
            </button>
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .gantt-sidebar {
    flex: 0 0 auto;
    border-right: 1px solid var(--theme-divider-color);
    overflow: hidden;
    background: var(--theme-comp-header-color);
  }
  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    border-bottom: 1px solid var(--theme-divider-color);
    background: var(--theme-comp-header-color);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-darker-color);
    letter-spacing: 0.05em;
    box-sizing: border-box;
  }
  .col-toggle {
    flex: 0 0 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .col-id {
    flex: 0 0 88px;
  }
  .col-title {
    flex: 1 1 auto;
  }
  .col-jump {
    flex: 0 0 28px;
  }
  .sidebar-rows {
    will-change: transform;
  }
  .sidebar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 8px;
    border-bottom: 1px solid var(--theme-divider-color);
    color: var(--theme-content-color);
    font-size: 13px;
    overflow: hidden;
    white-space: nowrap;
    box-sizing: border-box;
  }
  .cell-id {
    flex: 0 0 88px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-id.ms-icon {
    text-align: center;
    color: var(--theme-state-info-color, #6366f1);
    font-size: 14px;
  }
  .cell-title {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-jump {
    flex: 0 0 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .toggle-btn {
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--theme-darker-color);
    font-size: 10px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .toggle-btn:hover {
    color: var(--theme-content-color);
  }
  .jump-btn {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--theme-button-border);
    border-radius: 3px;
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .jump-btn:hover {
    filter: brightness(1.1);
  }
  .sidebar-row.summary {
    font-weight: 600;
  }
  .sidebar-row.milestone {
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 6%, transparent);
  }
</style>
