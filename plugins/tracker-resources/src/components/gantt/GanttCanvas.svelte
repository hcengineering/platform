<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation, Milestone } from '@hcengineering/tracker'
  import { type DragState, type DragTarget, type LayoutRow, type MilestoneMarker, type SummaryRange } from './lib/types'
  import { filterVisibleRows } from './lib/layout'
  import GanttBar from './GanttBar.svelte'
  import GanttResizeOverlay from './GanttResizeOverlay.svelte'
  import GanttTodayMarker from './GanttTodayMarker.svelte'
  import { type TimeScale } from './lib/time-scale'
  import { type BarRect } from './lib/dependency-router'
  import GanttDependencyLayer from './GanttDependencyLayer.svelte'
  import { activeDragTargetId } from './lib/drag-state'
  import { computeTickViewport } from './lib/viewport'

  const dispatch = createEventDispatcher<{
    openIssue: { issue: { _id: string, _class: string } }
    hoverRow: { id: string | null, row?: LayoutRow, mouseX?: number, mouseY?: number }
    barMouseDown: { target: DragTarget, edge: 'left' | 'right' | 'body', cursorX: number }
    barClick: { target: DragTarget }
    contextMenu: { issue: Issue, event: MouseEvent }
    connectorDown: { source: Issue, originPx: { x: number, y: number } }
    barHover: { issue: Issue | null }
    openEditor: { relation: IssueRelation }
    hoverEdge: { source: Ref<Issue>, target: Ref<Issue> } | null
  }>()
  let canvasEl: SVGSVGElement | null = null

  function openIssue (i: { _id: any, _class: any }): void {
    dispatch('openIssue', { issue: { _id: i._id as string, _class: i._class as string } })
  }

  function forwardConnectorDown (e: CustomEvent<{ source: Issue, cursorClientX: number, cursorClientY: number }>): void {
    const rect = barRects.get(String(e.detail.source._id))
    if (rect === undefined) return
    dispatch('connectorDown', {
      source: e.detail.source,
      originPx: { x: rect.right + 12, y: rect.bottom - 2 }
    })
  }

  function startConnectorFromIssueId (sourceId: string | null): void {
    if (sourceId === null) return
    const source = rows.find((row) => row.issue !== null && String(row.issue._id) === sourceId)?.issue
    const rect = barRects.get(sourceId)
    if (source === undefined || source === null || rect === undefined) return
    dispatch('connectorDown', {
      source,
      originPx: { x: rect.right + 12, y: rect.bottom - 2 }
    })
  }

  function onCanvasConnectorDown (e: MouseEvent | PointerEvent): void {
    const target = e.target as Element | null
    const connector = target?.closest('.gantt-connector') as SVGElement | null
    if (connector === null) return
    e.preventDefault()
    e.stopPropagation()
    startConnectorFromIssueId(connector.getAttribute('data-source-id'))
  }

  onMount(() => {
    if (canvasEl === null) return
    canvasEl.addEventListener('pointerdown', onCanvasConnectorDown)
    canvasEl.addEventListener('mousedown', onCanvasConnectorDown)
  })

  onDestroy(() => {
    if (canvasEl === null) return
    canvasEl.removeEventListener('pointerdown', onCanvasConnectorDown)
    canvasEl.removeEventListener('mousedown', onCanvasConnectorDown)
  })

  export let rows: LayoutRow[]
  export let milestones: MilestoneMarker[]
  export let timeScale: TimeScale
  export let summaryRanges: Map<string, SummaryRange>
  export let scrollTop: number = 0
  export let viewportHeight: number = 600
  export let viewport: { left: number; right: number }
  export let totalWidth: number
  export let dataWidth: number = totalWidth
  export let milestoneStripHeight: number = 0
  export let hoveredRowId: string | null = null
  export let statusCategoryMap: Map<string, string> | undefined = undefined

  // PR 3 edit-mode props. Defaulted so GanttCanvas remains usable from
  // contexts that don't wire the drag state (e.g. embedded preview).
  // editableIssueIds covers both Issues and Milestones — the Set stores
  // stringified _ids (PR3.3 2026-05-11) so a single Set serves both.
  // milestonesById is a lookup of full Milestone docs (keyed by _id) used
  // to build the DragTarget payload when a milestone bar is clicked.
  export let editableIssueIds: Set<string> = new Set()
  export let activeDrag: Writable<DragState> = writable({ kind: 'idle' })
  export let focusedIssueId: string | null = null
  export let selectedIssueId: string | null = null
  export let milestonesById: Map<string, Milestone> = new Map()

  // PR4a dependency-layer props — defaulted so existing call-sites don't break.
  export let relations: IssueRelation[] = []
  export let connectedIds: Set<Ref<Issue>> = new Set()
  export let hoveredIssue: Ref<Issue> | null = null
  export let hoveredEdge: { source: Ref<Issue>, target: Ref<Issue> } | null = null
  // PR5 critical-path overlay state (forwarded down to GanttBar +
  // GanttDependencyLayer). showCriticalPath gates rendering so the
  // base view doesn't gain visual weight when the toggle is off.
  export let criticalSet: Set<Ref<Issue>> = new Set()
  export let criticalRelations: Set<Ref<IssueRelation>> = new Set()
  export let violatedRelations: Set<Ref<IssueRelation>> = new Set()
  export let cpSlack: Map<Ref<Issue>, number> = new Map()
  export let showCriticalPath: boolean = false

  /**
   * Returns true iff any IssueRelation involving this issue is in the
   * CP module's violatedRelations set. Used by GanttBar to paint a red
   * dashed border on the bar.
   */
  function hasViolation (issueId: Ref<Issue>): boolean {
    if (violatedRelations.size === 0) return false
    for (const r of relations) {
      if ((r.attachedTo === issueId || r.target === issueId) && violatedRelations.has(r._id)) return true
    }
    return false
  }

  function statusCategoryFor (issue: any): string | null {
    if (statusCategoryMap === undefined) return null
    const sid = issue?.status as string | undefined
    if (sid === undefined) return null
    return statusCategoryMap.get(String(sid)) ?? null
  }

  // PR3.1 fix (2026-05-11): the previous `function isEditable/isFocused/
  // isSelected (id)` indirection hid the Set / id dependency from Svelte's
  // template dependency tracker — `editable={isEditable(row.issue._id)}`
  // only re-evaluated when `isEditable` or `row.issue._id` changed, never
  // when the underlying `editableIssueIds` Set mutated. Result: bars stayed
  // editable=false even after the async canEditIssue loop populated the Set,
  // so click/drag/resize all silently failed because GanttBar.onBarDown
  // early-returns on `!editable`. Reactive `$:` declarations make the deps
  // explicit; closures stay closures, but template re-runs when the inputs
  // change.
  $: isEditable = (issueId: unknown): boolean => editableIssueIds.has(String(issueId))
  $: isFocused = (issueId: unknown): boolean => focusedIssueId !== null && String(issueId) === focusedIssueId
  $: isSelected = (issueId: unknown): boolean => selectedIssueId !== null && String(issueId) === selectedIssueId

  // PR 3 spotlight dim: while a drag is active, dim every row that is NOT the
  // active issue. Keeps the cursor's row at full opacity so the user can see
  // where the bar is being placed relative to other rows.
  $: dragState = $activeDrag
  $: activeIssueIdStr = activeDragTargetId(dragState)
  $: anyDragActive = dragState.kind !== 'idle' && dragState.kind !== 'hover-bar'

  function isDimmed (issueId: unknown): boolean {
    return anyDragActive && activeIssueIdStr !== null && String(issueId) !== activeIssueIdStr
  }

  $: visibleRows = filterVisibleRows(rows, scrollTop, viewportHeight)
  $: rowsHeight = rows.length > 0 ? rows[rows.length - 1].y + rows[rows.length - 1].height : 0
  $: totalHeight = rowsHeight + milestoneStripHeight
  $: tickViewport = computeTickViewport(viewport.left, viewport.right, dataWidth)
  $: ticks = timeScale.ticks([
    timeScale.fromX(tickViewport.left),
    timeScale.fromX(tickViewport.right)
  ])

  /**
   * Per-bar pixel rectangle for the dependency router. Re-derives from the
   * same row geometry the canvas uses to position GanttBar; the dependency
   * layer reads this Map to anchor arrows. Cache keyed by stringified
   * Ref<Issue> for parity with editableIssueIds.
   */
  $: barRects = (() => {
    const map = new Map<string, BarRect>()
    for (const row of rows) {
      if (row.kind !== 'issue' || row.issue === null) continue
      const start = row.issue.startDate
      const due = row.issue.dueDate
      if (start === null || due === null) continue
      const left = timeScale.toX(Math.min(start, due))
      const right = timeScale.toX(Math.max(start, due)) + timeScale.pxPerDay
      const top = milestoneStripHeight + row.y + 6
      const bottom = milestoneStripHeight + row.y + row.height - 6
      map.set(String(row.issue._id), { left, top, right, bottom })
    }
    return map
  })()

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
  bind:this={canvasEl}
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
        class:dimmed={row.issue !== null && isDimmed(row.issue._id)}
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
          {@const ms = row.milestone}
          {@const fullMs = milestonesById.get(String(ms._id))}
          {#if ms.startDate !== null && fullMs !== undefined}
            <!-- PR3.3: Milestone row renders an editable bar at the milestone's
                 OWN [startDate, targetDate]. Synthetic children-aggregate
                 summary-claw is dropped from milestone rows — the milestone
                 IS the milestone, not its assigned-issues range. When startDate
                 is null the milestone is "open-ended" and only the diamond on
                 the top strip represents it (per brainstorm decision A). -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <g class="bar-wrap">
              <GanttBar
                issue={{
                  title: ms.label,
                  startDate: ms.startDate,
                  dueDate: ms.targetDate
                }}
                row={{ y: row.y, height: row.height }}
                {timeScale}
                statusCategory={null}
                editable={isEditable(ms._id)}
                focused={isFocused(ms._id)}
                selected={isSelected(ms._id)}
                {activeDrag}
                issueRef={ms._id}
                dragTarget={{ kind: 'milestone', doc: fullMs }}
                on:barMouseDown
                on:barClick
              />
            </g>
          {/if}
        {:else if row.issue !== null}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <g
            class="bar-wrap"
            data-issue-id={String(row.issue._id)}
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
              focused={isFocused(row.issue._id)}
              selected={isSelected(row.issue._id)}
              {activeDrag}
              issueRef={row.issue._id}
              dragTarget={{ kind: 'issue', doc: row.issue }}
              isCritical={showCriticalPath && criticalSet.has(row.issue._id)}
              isViolated={showCriticalPath && hasViolation(row.issue._id)}
              slackMs={cpSlack.get(row.issue._id) ?? 0}
              showSlackGlyph={showCriticalPath}
              on:barMouseDown
              on:barClick
              on:contextMenu
              on:connectorDown={forwardConnectorDown}
              on:barHover
            />
          </g>
        {/if}
      </g>
    {/each}
  </g>

  <GanttDependencyLayer
    {relations}
    barRects={barRects}
    {activeDrag}
    {connectedIds}
    {hoveredIssue}
    {hoveredEdge}
    {criticalRelations}
    {violatedRelations}
    {showCriticalPath}
    on:openEditor
    on:hoverEdge
  />

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
  :global(svg.gantt-canvas .row-rect.dimmed) {
    fill: var(--theme-bg-color);
    opacity: 0.55;
  }
  :global(svg.gantt-canvas .row-rect.milestone-bg.hovered) {
    fill: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 14%, transparent);
  }
</style>
