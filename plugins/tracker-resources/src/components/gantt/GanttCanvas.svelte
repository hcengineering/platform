<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import type { Issue } from '@hcengineering/tracker'
  import { type DragState, type LayoutRow, type MilestoneMarker, type SummaryRange } from './lib/types'
  import { filterVisibleRows } from './lib/layout'
  import GanttBar from './GanttBar.svelte'
  import GanttResizeOverlay from './GanttResizeOverlay.svelte'
  import GanttTodayMarker from './GanttTodayMarker.svelte'
  import { type TimeScale } from './lib/time-scale'

  const dispatch = createEventDispatcher<{
    openIssue: { issue: { _id: string, _class: string } }
    hoverRow: { id: string | null, row?: LayoutRow, mouseX?: number, mouseY?: number }
    barMouseDown: { issue: Issue, edge: 'left' | 'right' | 'body', cursorX: number }
  }>()
  function openIssue (i: { _id: any, _class: any }): void {
    dispatch('openIssue', { issue: { _id: i._id as string, _class: i._class as string } })
  }

  export let rows: LayoutRow[]
  export let milestones: MilestoneMarker[]
  export let timeScale: TimeScale
  export let summaryRanges: Map<string, SummaryRange>
  export let scrollTop: number = 0
  export let viewportHeight: number = 600
  export let viewport: { left: number; right: number }
  export let totalWidth: number
  export let milestoneStripHeight: number = 0
  export let hoveredRowId: string | null = null
  export let statusCategoryMap: Map<string, string> | undefined = undefined

  // PR 3 edit-mode props. Defaulted so GanttCanvas remains usable from
  // contexts that don't wire the drag state (e.g. embedded preview).
  export let editableIssueIds: Set<string> = new Set()
  export let activeDrag: Writable<DragState> = writable({ kind: 'idle' })

  function statusCategoryFor (issue: any): string | null {
    if (statusCategoryMap === undefined) return null
    const sid = issue?.status as string | undefined
    if (sid === undefined) return null
    return statusCategoryMap.get(String(sid)) ?? null
  }

  function isEditable (issueId: unknown): boolean {
    return editableIssueIds.has(String(issueId))
  }

  $: visibleRows = filterVisibleRows(rows, scrollTop, viewportHeight)
  $: rowsHeight = rows.length > 0 ? rows[rows.length - 1].y + rows[rows.length - 1].height : 0
  $: totalHeight = rowsHeight + milestoneStripHeight
  $: ticks = timeScale.ticks([
    timeScale.fromX(Math.max(0, viewport.left - 100)),
    timeScale.fromX(viewport.right + 100)
  ])

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
  width={totalWidth}
  height={totalHeight}
  viewBox="0 0 {totalWidth} {totalHeight}"
  preserveAspectRatio="none"
>
  <!-- Vertical gridlines aligned to the time-scale ticks for visual rhythm. -->
  <g class="gridlines">
    {#each ticks as tick (tick.date)}
      {@const x = timeScale.toX(tick.date)}
      <line
        x1={x}
        x2={x}
        y1={0}
        y2={totalHeight}
        stroke="var(--theme-divider-color)"
        stroke-width={tick.level === 'major' ? 1 : 0.5}
        opacity={tick.level === 'major' ? 0.7 : 0.35}
      />
    {/each}
  </g>

  <!-- Row backgrounds: alternating zebra + hover highlight. Painted before
       bars so they appear behind the bar geometry. -->
  <g class="row-bg" transform="translate(0, {milestoneStripHeight})">
    {#each visibleRows as row (rowKey(row))}
      {@const isHover = hoveredRowId === row.id}
      <rect
        x={0}
        y={row.y}
        width={totalWidth}
        height={row.height}
        class="row-rect"
        class:hovered={isHover}
        class:milestone-bg={row.kind === 'milestone'}
      />
    {/each}
  </g>

  <g class="bars" transform="translate(0, {milestoneStripHeight})">
    {#each visibleRows as row (rowKey(row))}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <g
        class="row-hit"
        on:mouseenter={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
        on:mousemove={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
        on:mouseleave={() => dispatch('hoverRow', { id: null })}
      >
        <!-- transparent hit-area covering the row width to capture hover -->
        <rect
          x={0}
          y={row.y}
          width={totalWidth}
          height={row.height}
          fill="transparent"
        />
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
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <g
            class="bar-wrap"
            on:dblclick|stopPropagation={() => row.issue !== null && openIssue(row.issue)}
          >
            <GanttBar
              issue={row.issue}
              row={{ y: row.y, height: row.height }}
              {timeScale}
              isSummary={row.isSummary}
              summaryRange={summaryFor(row)}
              statusCategory={statusCategoryFor(row.issue)}
              editable={isEditable(row.issue._id)}
              {activeDrag}
              issueRef={row.issue._id}
              issueObj={row.issue}
              on:barMouseDown
            />
          </g>
        {/if}
      </g>
    {/each}
  </g>

  <!-- Milestone target-date markers as short tick + diamond at the top
       of the canvas only (redesign: less visual noise than a
       full-height dashed line). -->
  <g class="milestones">
    {#each milestones as ms (ms._id)}
      {@const x = timeScale.toX(ms.targetDate)}
      <line
        x1={x} x2={x} y1={0} y2={14}
        stroke="var(--theme-state-info-color, #6366f1)"
        stroke-width={1.5}
      />
      <polygon
        points="{x - 5},2 {x + 5},2 {x},10"
        fill="var(--theme-state-info-color, #6366f1)"
      >
        <title>{ms.label}</title>
      </polygon>
    {/each}
  </g>

  <GanttTodayMarker {timeScale} canvasHeight={totalHeight} {viewport} />

  <!-- Resize-overlay layer (ghost outline + guide line + date pill + duration
       tooltip). Reads from $activeDrag — renders nothing in idle/hover state. -->
  <GanttResizeOverlay {activeDrag} {timeScale} canvasHeight={totalHeight} />
</svg>

<style lang="scss">
  .gantt-canvas {
    display: block;
    background: var(--theme-bg-color);
  }
  :global(svg.gantt-canvas g.bar-wrap) {
    cursor: pointer;
  }
  :global(svg.gantt-canvas .row-rect) {
    fill: transparent;
  }
  :global(svg.gantt-canvas .row-rect.hovered) {
    fill: var(--theme-button-hovered);
    opacity: 0.5;
  }
  :global(svg.gantt-canvas .row-rect.milestone-bg) {
    fill: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 6%, transparent);
  }
  :global(svg.gantt-canvas .row-rect.milestone-bg.hovered) {
    fill: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 14%, transparent);
  }
</style>
