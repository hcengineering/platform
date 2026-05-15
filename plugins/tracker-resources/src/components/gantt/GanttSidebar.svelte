<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Label, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import type { LayoutRow } from './lib/types'
  import type { TimeScale } from './lib/time-scale'
  import IssuePresenter from '../issues/IssuePresenter.svelte'
  import StatusBadge from './StatusBadge.svelte'

  export let rows: LayoutRow[]
  export let width: number = 280
  export let timeScale: TimeScale | undefined = undefined
  export let viewportLeft: number = 0
  export let viewportRight: number = 0
  export let showIssueCode: boolean = false
  export let showTitle: boolean = true
  export let showStatus: boolean = true
  export let hoveredRowId: string | null = null

  const dispatch = createEventDispatcher<{
    jump: { x: number }
    toggle: { id: string }
    openIssue: { issue: { _id: string, _class: string } }
    hoverRow: { id: string | null, row?: LayoutRow, mouseX?: number, mouseY?: number }
    addIssue: undefined
  }>()

  function openIssue (issue: { _id: any, _class: any }): void {
    dispatch('openIssue', { issue: { _id: issue._id as string, _class: issue._class as string } })
  }

  function jumpDirection (
    obj: { startDate: number | null, dueDate: number | null }
  ): 'left' | 'right' | null {
    if (timeScale === undefined) return null
    if (viewportRight <= viewportLeft) return null
    if (obj.startDate == null && obj.dueDate == null) return null
    const startX = obj.startDate != null ? timeScale.toX(obj.startDate) : null
    const dueX = obj.dueDate != null ? timeScale.toX(obj.dueDate) : null
    const minX = Math.min(startX ?? Infinity, dueX ?? Infinity)
    const maxX = Math.max(startX ?? -Infinity, dueX ?? -Infinity)
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

  function rowJumpX (row: LayoutRow): number | null {
    if (timeScale === undefined) return null
    const tgt = rowJumpTarget(row)
    if (tgt === null) return null
    const start = tgt.startDate ?? tgt.dueDate
    if (start === null) return null
    return timeScale.toX(start)
  }
</script>

<div class="sidebar-rows" class:has-hover={hoveredRowId !== null} style="width: {width}px;">
  {#each rows as row (row.id)}
    {@const indent = row.depth * 16}
    {@const tgt = rowJumpTarget(row)}
    {@const dir = tgt !== null ? jumpDirection(tgt) : null}
    {@const jumpX = rowJumpX(row)}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="sidebar-row"
      class:summary={row.isSummary}
      class:milestone={row.kind === 'milestone'}
      class:hovered={hoveredRowId === row.id}
      style="height: {row.height}px; padding-left: {8 + indent}px;"
      on:mouseenter={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
      on:mousemove={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
      on:mouseleave={() => dispatch('hoverRow', { id: null })}
    >
      <span class="col-toggle">
        {#if row.collapsible}
          <button
            type="button"
            class="toggle-btn"
            use:tooltip={{ label: row.collapsed ? tracker.string.GanttExpand : tracker.string.GanttCollapse }}
            on:click={() => dispatch('toggle', { id: row.id })}
          >
            {row.collapsed ? '▶' : '▼'}
          </button>
        {/if}
      </span>
      {#if row.kind === 'milestone' && row.milestone !== null}
        {#if showStatus}<span class="cell-status ms-icon" title="Milestone">◆</span>{/if}
        {#if showIssueCode}
          <span class="cell-id">
            <span class="ms-tag">MS</span>
          </span>
        {/if}
        {#if showTitle}
          <span class="cell-title" title={row.milestone.label}>
            {row.milestone.label}
          </span>
        {/if}
      {:else if row.issue !== null}
        {#if showStatus}
          <span class="cell-status"><StatusBadge issue={row.issue} /></span>
        {/if}
        {#if showIssueCode}
          <span class="cell-id">
            <IssuePresenter value={row.issue} disabled={false} />
          </span>
        {/if}
        {#if showTitle}
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <span
            class="cell-title clickable"
            title={row.issue.title}
            role="link"
            tabindex="0"
            on:click={() => row.issue !== null && openIssue(row.issue)}
            on:keydown={(e) => { if (e.key === 'Enter' && row.issue !== null) openIssue(row.issue) }}
          >
            {row.issue.title}
          </span>
        {/if}
      {:else}
        {#if showStatus}<span class="cell-status" />{/if}
        {#if showIssueCode}
          <span class="cell-id" />
        {/if}
        {#if showTitle}
          <span class="cell-title" />
        {/if}
      {/if}
      <span class="cell-jump">
        {#if dir !== null && jumpX !== null}
          <button
            type="button"
            class="jump-btn"
            use:tooltip={{ label: dir === 'left' ? tracker.string.GanttScrollLeftToBar : tracker.string.GanttScrollRightToBar }}
            on:click={() => dispatch('jump', { x: jumpX })}
          >
            {dir === 'left' ? '←' : '→'}
          </button>
        {/if}
      </span>
    </div>
  {/each}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="add-issue-row"
    role="button"
    tabindex="0"
    on:click={() => dispatch('addIssue')}
    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') dispatch('addIssue') }}
  >
    <span class="plus-glyph">+</span>
    <span class="add-issue-label"><Label label={tracker.string.AddIssue} /></span>
  </div>
</div>

<style lang="scss">
  .sidebar-rows {
    background: var(--theme-comp-header-color);
  }
  .col-toggle {
    flex: 0 0 18px;
    display: flex;
    align-items: center;
    justify-content: center;
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
    background: var(--theme-comp-header-color);
  }
  .cell-status {
    flex: 0 0 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cell-status.ms-icon {
    color: var(--theme-state-info-color, #6366f1);
    font-size: 14px;
  }
  .ms-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 15%, transparent);
    color: var(--theme-state-info-color, #6366f1);
  }
  .cell-id {
    flex: 0 0 80px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-title {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-title.clickable { cursor: pointer; }
  .cell-title.clickable:hover { text-decoration: underline; }
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
  .toggle-btn:hover { color: var(--theme-content-color); }
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
  .jump-btn:hover { filter: brightness(1.1); }
  .sidebar-row.summary { font-weight: 600; }
  .sidebar-row.milestone {
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 6%, transparent);
  }
  .sidebar-row.hovered {
    background: var(--theme-button-hovered);
  }
  /* When ANY row is hovered, dim non-hovered rows for a Stitch-style
     spotlight effect — implemented by the parent setting a data attr. */
  :global(.sidebar-rows.has-hover) .sidebar-row:not(.hovered) {
    opacity: 0.55;
  }
  .sidebar-row.milestone.hovered {
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 14%, transparent);
  }
  .add-issue-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px dashed var(--theme-divider-color);
    color: var(--theme-darker-color);
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    background: var(--theme-comp-header-color);
  }
  .add-issue-row:hover {
    background: var(--theme-button-hovered);
    color: var(--theme-content-color);
  }
  .add-issue-row .plus-glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 14px;
    line-height: 1;
    border-radius: 3px;
    background: color-mix(in srgb, var(--theme-content-color) 8%, transparent);
  }
  .add-issue-row:hover .plus-glyph {
    background: color-mix(in srgb, var(--theme-content-color) 16%, transparent);
  }
</style>
