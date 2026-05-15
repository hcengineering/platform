<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type LayoutRow } from './lib/types'
  import IssuePresenter from '../issues/IssuePresenter.svelte'

  export let rows: LayoutRow[]
  export let scrollTop: number = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let viewportHeight: number = 600
  export let width: number = 320
</script>

<div class="gantt-sidebar" style="width: {width}px;">
  <div class="sidebar-rows" style="transform: translateY({-scrollTop}px);">
    {#each rows as row (row.issue?._id ?? `swimlane-${row.y}`)}
      {#if row.issue !== null}
        {@const indent = row.depth * 16}
        <div
          class="sidebar-row"
          class:summary={row.isSummary}
          style="height: {row.height}px; padding-left: {8 + indent}px;"
        >
          <IssuePresenter value={row.issue} disabled={false} />
        </div>
      {/if}
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
  .sidebar-rows {
    will-change: transform;
  }
  .sidebar-row {
    display: flex;
    align-items: center;
    padding-right: 8px;
    border-bottom: 1px solid var(--theme-divider-color);
    color: var(--theme-content-color);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sidebar-row.summary {
    font-weight: 600;
  }
</style>
