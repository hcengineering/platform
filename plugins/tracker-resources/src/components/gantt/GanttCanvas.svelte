<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type LayoutRow, type MilestoneMarker, type SummaryRange } from './lib/types'
  import { filterVisibleRows } from './lib/layout'
  import GanttBar from './GanttBar.svelte'
  import GanttTodayMarker from './GanttTodayMarker.svelte'
  import GanttMilestoneFlag from './GanttMilestoneFlag.svelte'
  import { type TimeScale } from './lib/time-scale'

  export let rows: LayoutRow[]
  export let milestones: MilestoneMarker[]
  export let timeScale: TimeScale
  export let summaryRanges: Map<string, SummaryRange>
  export let scrollTop: number = 0
  export let viewportHeight: number = 600
  export let viewport: { left: number; right: number }
  // Vertical band reserved at the top of the canvas for milestone-flag
  // labels, so they don't collide with the first issue row.
  export let milestoneStripHeight: number = 22

  $: visibleRows = filterVisibleRows(rows, scrollTop, viewportHeight)
  $: rowsHeight = rows.length > 0 ? rows[rows.length - 1].y + rows[rows.length - 1].height : 0
  $: totalHeight = rowsHeight + milestoneStripHeight

  function rowKey (row: LayoutRow): string {
    return row.id
  }

  function summaryFor (row: LayoutRow): SummaryRange | null {
    if (row.kind === 'milestone' && row.milestone !== null) {
      return summaryRanges.get(row.id) ?? null
    }
    if (row.issue === null) return null
    const id = row.issue._id as unknown as string
    return summaryRanges.get(id) ?? null
  }
</script>

<svg
  class="gantt-canvas"
  width={viewport.right - viewport.left}
  height={totalHeight}
  viewBox="{viewport.left} 0 {viewport.right - viewport.left} {totalHeight}"
  preserveAspectRatio="none"
>
  <g class="bars" transform="translate(0, {milestoneStripHeight})">
    {#each visibleRows as row (rowKey(row))}
      {#if row.kind === 'milestone' && row.milestone !== null}
        {@const range = summaryFor(row)}
        {#if range !== null && range.startDate !== null && range.dueDate !== null}
          <GanttBar
            issue={{
              title: row.milestone.label,
              startDate: range.startDate,
              dueDate: range.dueDate
            }}
            row={{ y: row.y, height: row.height }}
            {timeScale}
            isSummary
            summaryRange={range}
          />
        {/if}
      {:else if row.issue !== null}
        <GanttBar
          issue={row.issue}
          row={{ y: row.y, height: row.height }}
          {timeScale}
          isSummary={row.isSummary}
          summaryRange={summaryFor(row)}
        />
      {/if}
    {/each}
  </g>

  <g class="milestones">
    {#each milestones as ms (ms._id)}
      <GanttMilestoneFlag
        milestone={ms}
        {timeScale}
        canvasHeight={totalHeight}
        {viewport}
        labelStripHeight={milestoneStripHeight - 2}
      />
    {/each}
  </g>

  <GanttTodayMarker {timeScale} canvasHeight={totalHeight} {viewport} />
</svg>

<style lang="scss">
  .gantt-canvas {
    display: block;
    background: var(--theme-bg-color);
  }
</style>
