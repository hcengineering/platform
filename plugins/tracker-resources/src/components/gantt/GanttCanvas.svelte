<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation, Milestone } from '@hcengineering/tracker'
  import { type DragState, type DragTarget, type LayoutRow, type MilestoneMarker, type SummaryRange } from './lib/types'
  import { type LayoutMode, type TimeScale, type WorkingCalendar } from '@hcengineering/gantt'
  import { type BarLabelSlot } from './lib/bar-labels'
  import { filterVisibleRows } from './lib/layout'
  import GanttBar from './GanttBar.svelte'
  import GanttResizeOverlay from './GanttResizeOverlay.svelte'
  import GanttTodayMarker from './GanttTodayMarker.svelte'
  import { type BarRect, type YBounds } from './lib/dependency-router'
  import GanttDependencyLayer from './GanttDependencyLayer.svelte'
  import GanttConnectorDot from './GanttConnectorDot.svelte'
  import GanttBarResizeHandles from './GanttBarResizeHandles.svelte'
  import { activeDragTargetId, computeTickViewport, nonWorkingDaysInRange } from '@hcengineering/gantt'
  import { hasDeadline, isOverdue } from './lib/deadline-marker'
  import { ThrottledCaller } from '@hcengineering/ui'

  // Coalesce hover updates to roughly one per frame so a fast pointer does not
  // re-trigger GanttView reactivity on every mousemove pixel (leading-edge).
  const hoverThrottle = new ThrottledCaller(16)
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
    scrollToRow: { issue: Ref<Issue> }
  }>()

  function openIssue (i: { _id: any, _class: any }): void {
    dispatch('openIssue', { issue: { _id: i._id as string, _class: i._class as string } })
  }

  // Connector-drag dispatch lives entirely on <GanttConnectorDot>. This
  // canvas layer used to also delegate via a capture-phase pointerdown
  // listener (.closest('.gantt-connector')) which double-fired with the
  // dot's own Svelte event. The dot's event bubbles up through the
  // overlay <GanttConnectorDot> below straight into GanttView — one
  // source of truth, no delegation here.

  export let rows: LayoutRow[]
  export let milestones: MilestoneMarker[]
  export let timeScale: TimeScale
  export let summaryRanges: Map<string, SummaryRange>
  export let scrollTop: number = 0
  export let viewportHeight: number = 600
  export let viewport: { left: number, right: number }
  export let totalWidth: number
  export let dataWidth: number = totalWidth
  export let milestoneStripHeight: number = 0
  export let hoveredRowId: string | null = null
  export let statusCategoryMap: Map<string, string> | undefined = undefined

  // Edit-mode props. Defaulted so GanttCanvas remains usable from
  // contexts that don't wire the drag state (e.g. embedded preview).
  // editableIssueIds covers both Issues and Milestones — the Set stores
  // stringified _ids so a single Set serves both.
  // milestonesById is a lookup of full Milestone docs (keyed by _id) used
  // to build the DragTarget payload when a milestone bar is clicked.
  export let editableIssueIds = new Set<string>()
  // Date-mutation affordances (body drag, edge resize, sidebar unschedule grip)
  // are gated separately from `editableIssueIds` so the all-projects view can be
  // read-only for calendar-dependent edits while KEEPING selection, the context
  // menu, the manual date-picker and dependency/connector actions. Defaults true
  // so embedded/preview call-sites that don't wire it stay fully interactive.
  export let dateMutable = true
  export let activeDrag: Writable<DragState> = writable({ kind: 'idle' })
  export let focusedIssueId: string | null = null
  export let selectedIssueId: string | null = null
  export let milestonesById = new Map<string, Milestone>()

  // Dependency-layer props — defaulted so existing call-sites don't break.
  export let relations: IssueRelation[] = []
  export let connectedIds = new Set<Ref<Issue>>()
  export let hoveredIssue: Ref<Issue> | null = null
  export let hoveredEdge: { source: Ref<Issue>, target: Ref<Issue> } | null = null
  // Critical-path overlay state (forwarded down to GanttBar +
  // GanttDependencyLayer). showCriticalPath gates rendering so the
  // base view doesn't gain visual weight when the toggle is off.
  export let criticalSet = new Set<Ref<Issue>>()
  export let criticalRelations = new Set<Ref<IssueRelation>>()
  export let violatedRelations = new Set<Ref<IssueRelation>>()
  export let cpSlack = new Map<Ref<Issue>, number>()
  export let showCriticalPath: boolean = false
  // Configurable bar-label slots. Defaults: left=none, inside=title, right=none.
  export let barLabelLeft: BarLabelSlot = 'none'
  export let barLabelInside: BarLabelSlot = 'title'
  export let barLabelRight: BarLabelSlot = 'none'

  // Phase-2 working-days calendar. `undefined` = legacy mode (no tint, all
  // days treated as working). When set, every non-working day in the
  // viewport receives a low-alpha background fill so the user sees at a
  // glance which days the scheduler will skip.
  export let workingDaysConfig: WorkingCalendar | undefined = undefined
  /** Layout mode for mobile-friendly rendering. */
  export let layoutMode: LayoutMode = 'desktop'
  /** Bulk-select: set of selected issue id strings for co-drag highlighting. */
  export let multiSelectedIssueIds = new Set<string>()

  // Derive the set of issue ids touched by a violated relation once per
  // violatedRelations/relations change, instead of re-scanning every relation
  // for every rendered row (O(rows·relations)). Reactive `$:` — like the
  // isEditable pattern below — keeps the template dependency explicit so bars
  // repaint when the underlying set mutates. Used by GanttBar to paint a red
  // dashed border on the bar.
  $: violatedIssueIds = ((): Set<Ref<Issue>> => {
    const s = new Set<Ref<Issue>>()
    if (violatedRelations.size > 0) {
      for (const r of relations) {
        if (violatedRelations.has(r._id)) {
          s.add(r.attachedTo)
          s.add(r.target)
        }
      }
    }
    return s
  })()
  $: hasViolation = (issueId: Ref<Issue>): boolean => violatedIssueIds.has(issueId)

  function statusCategoryFor (issue: any): string | null {
    if (statusCategoryMap === undefined) return null
    const sid = issue?.status as string | undefined
    if (sid === undefined) return null
    return statusCategoryMap.get(String(sid)) ?? null
  }

  // The previous `function isEditable/isFocused/
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

  // Spotlight dim: while a drag is active, dim every row that is NOT the
  // active issue. Keeps the cursor's row at full opacity so the user can see
  // where the bar is being placed relative to other rows.
  $: dragState = $activeDrag
  $: activeIssueIdStr = activeDragTargetId(dragState)
  $: anyDragActive = dragState.kind !== 'idle' && dragState.kind !== 'hover-bar'

  function isDimmed (issueId: unknown): boolean {
    return anyDragActive && activeIssueIdStr !== null && String(issueId) !== activeIssueIdStr
  }

  $: visibleRows = filterVisibleRows(rows, scrollTop, viewportHeight)
  // Y-viewport bounds in canvas-pixel space so the
  // dependency layer can clip arrows to off-viewport bars. Bars in
  // barRects live at `milestoneStripHeight + row.y + 6` etc., already in
  // the canvas coordinate system, so the bounds are just the scroll
  // window expressed in the same space.
  $: depYBounds = { top: scrollTop, bottom: scrollTop + viewportHeight } satisfies YBounds
  $: rowsHeight = rows.length > 0 ? rows[rows.length - 1].y + rows[rows.length - 1].height : 0
  $: totalHeight = rowsHeight + milestoneStripHeight
  $: tickViewport = computeTickViewport(viewport.left, viewport.right, dataWidth)
  $: ticks = timeScale.ticks([timeScale.fromX(tickViewport.left), timeScale.fromX(tickViewport.right)])
  // Non-working-day backgrounds. Empty in legacy mode.
  $: nonWorkingDays = nonWorkingDaysInRange(
    timeScale.fromX(tickViewport.left),
    timeScale.fromX(tickViewport.right),
    workingDaysConfig
  )

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

  /**
   * Geometry of the resize handles for the currently selected bar, or `null`
   * when no bar qualifies.
   *
   * The handles are rendered in an overlay group AFTER the dependency layer
   * (see the template below) so an arrow's invisible hit-stroke can no longer
   * swallow the pointerdown aimed at a handle. Deriving the geometry here
   * instead of inside GanttBar is what makes that possible — and it is cheap,
   * because at most ONE bar is selected at a time.
   *
   * While a drag is in flight the overlay is suppressed: the pointer is
   * captured by the drag-controller anyway, and the static geometry below
   * (which deliberately does not follow GanttBar's live drag PREVIEW) would
   * otherwise leave a stale hover-tint behind the moving bar. The conditions
   * are otherwise identical to the ones GanttBar used before the move:
   * editable, selected, and at least 18 px wide.
   */
  $: resizeHandles = ((): {
    x: number
    w: number
    barY: number
    barH: number
    target: DragTarget
  } | null => {
    if (selectedIssueId === null || anyDragActive) return null
    for (const row of visibleRows) {
      let start: number | null = null
      let due: number | null = null
      let target: DragTarget | undefined
      if (row.kind === 'milestone' && row.milestone !== null) {
        if (String(row.milestone._id) !== selectedIssueId) continue
        const full = milestonesById.get(String(row.milestone._id))
        if (full === undefined) continue
        start = row.milestone.startDate
        due = row.milestone.targetDate
        target = { kind: 'milestone', doc: full }
      } else if (row.kind === 'issue' && row.issue !== null && !row.isSummary) {
        // Summary rows render an MS-Project claw, which never had handles.
        if (String(row.issue._id) !== selectedIssueId) continue
        start = row.issue.startDate
        due = row.issue.dueDate
        target = { kind: 'issue', doc: row.issue }
      } else {
        continue
      }
      if (start === null || due === null || target === undefined) return null
      if (!isEditable(selectedIssueId)) return null
      const x = timeScale.toX(Math.min(start, due))
      const x2 = timeScale.toX(Math.max(start, due))
      const w = Math.max(2, x2 - x + timeScale.pxPerDay)
      if (w < 18) return null
      return { x, w, barY: row.y + 6, barH: row.height - 12, target }
    }
    return null
  })()

  function rowKey (row: LayoutRow): string {
    return row.id
  }

  function getDeadline (issue: Issue): number | null {
    return issue.deadline ?? null
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
  xmlns="http://www.w3.org/2000/svg"
  class="gantt-canvas"
  width={totalWidth}
  height={totalHeight}
  viewBox="0 0 {totalWidth} {totalHeight}"
  preserveAspectRatio="none"
>
  <!-- Phase-2 working-days: paint a soft tint over weekends/holidays so the
       user can tell at a glance which days the scheduler will skip. Painted
       BEFORE the gridlines + bars so it forms a true background layer. -->
  {#if workingDaysConfig !== undefined && nonWorkingDays.length > 0}
    <g class="non-working-days" pointer-events="none">
      {#each nonWorkingDays as day (day)}
        <rect
          x={timeScale.toX(day)}
          y={0}
          width={Math.max(0, timeScale.pxPerDay)}
          height={totalHeight}
          class="non-working-day-rect"
        />
      {/each}
    </g>
  {/if}

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
       bars so they appear behind the bar geometry. Group-header
       rows get an explicit tint band so the swimlane is visually distinct
       across the canvas, matching the sidebar's group-header row. -->
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
        class:group-header-bg={row.kind === 'group-header'}
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
        on:mousemove={(e) => {
          hoverThrottle.call(() => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY }))
        }}
        on:mouseleave={() => dispatch('hoverRow', { id: null })}
      >
        <!-- transparent hit-area covering the row width to capture hover -->
        <rect x={0} y={row.y} width={totalWidth} height={row.height} fill="transparent" />
        {#if row.kind === 'milestone' && row.milestone !== null}
          {@const ms = row.milestone}
          {@const fullMs = milestonesById.get(String(ms._id))}
          {#if ms.startDate !== null && fullMs !== undefined}
            <!-- Milestone row renders an editable bar at the milestone's
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
                {dateMutable}
                focused={isFocused(ms._id)}
                selected={isSelected(ms._id)}
                {activeDrag}
                issueRef={ms._id}
                dragTarget={{ kind: 'milestone', doc: fullMs }}
                {barLabelLeft}
                {barLabelInside}
                {barLabelRight}
                {layoutMode}
                on:barMouseDown
                on:barClick
              />
            </g>
          {/if}
        {:else if row.issue !== null}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- Mobile A11Y: on phones, iOS/Android intercept
               double-tap for system zoom, which collides with our
               openIssue trigger. On phone layout we therefore drop the
               dblclick handler entirely; users open the full editor
               through the GanttQuickInfoPopup "Open full editor" button
               (single-tap → quick-info → button). Desktop/tablet keep
               the dblclick shortcut. -->
          <g
            class="bar-wrap"
            data-issue-id={String(row.issue._id)}
            on:dblclick|stopPropagation={layoutMode === 'phone'
              ? undefined
              : () => {
                  if (row.issue !== null) openIssue(row.issue)
                }}
          >
            <GanttBar
              issue={row.issue}
              row={{ y: row.y, height: row.height }}
              {timeScale}
              isSummary={row.isSummary}
              summaryRange={summaryFor(row)}
              statusCategory={statusCategoryFor(row.issue)}
              editable={isEditable(row.issue._id)}
              {dateMutable}
              focused={isFocused(row.issue._id)}
              selected={isSelected(row.issue._id)}
              multiSelected={multiSelectedIssueIds.has(String(row.issue._id))}
              {activeDrag}
              issueRef={row.issue._id}
              dragTarget={{ kind: 'issue', doc: row.issue }}
              isCritical={showCriticalPath && criticalSet.has(row.issue._id)}
              isViolated={showCriticalPath && hasViolation(row.issue._id)}
              slackMs={cpSlack.get(row.issue._id) ?? 0}
              showSlackGlyph={showCriticalPath}
              schedulingMode={row.issue.schedulingMode}
              {layoutMode}
              on:barMouseDown
              on:barClick
              on:contextMenu
              on:barHover
            />
          </g>
        {/if}
      </g>
    {/each}
  </g>

  <g class="deadline-layer" transform="translate(0, {milestoneStripHeight})">
    {#each visibleRows as row (rowKey(row))}
      {#if row.kind === 'issue' && row.issue !== null && hasDeadline(row.issue)}
        {@const dlVal = getDeadline(row.issue)}
        {#if dlVal !== null}
          {@const dx = timeScale.toX(dlVal)}
          {@const dy = row.y + 4}
          {@const overdue = isOverdue(row.issue)}
          <g class="deadline-marker" class:overdue>
            <line
              x1={dx}
              y1={dy}
              x2={dx}
              y2={dy + 26}
              stroke={overdue ? 'var(--theme-state-negative-color)' : 'var(--theme-warning-color)'}
              stroke-width="1.5"
              stroke-dasharray="2 2"
              pointer-events="none"
            />
            <polygon
              points="{dx},{dy} {dx + 8},{dy + 4} {dx},{dy + 8}"
              fill={overdue ? 'var(--theme-state-negative-color)' : 'var(--theme-warning-color)'}
              pointer-events="none"
            >
              <title
                >{overdue ? 'Overdue (past deadline)' : 'Deadline'}: {new Date(dlVal).toISOString().slice(0, 10)}</title
              >
            </polygon>
          </g>
        {/if}
      {/if}
    {/each}
  </g>

  <GanttDependencyLayer
    {relations}
    {barRects}
    {activeDrag}
    {connectedIds}
    {hoveredIssue}
    {hoveredEdge}
    {criticalRelations}
    {violatedRelations}
    {showCriticalPath}
    yBounds={depYBounds}
    on:openEditor
    on:hoverEdge
    on:scrollToRow
  />

  <!--
    Connector-dot overlay — rendered AFTER GanttDependencyLayer so the dot
    sits ABOVE arrow paths. The dep-arrow's invisible 12 px click-target
    (in GanttDependencyArrow.svelte) used to intercept clicks meant for
    the connector dot when they overlapped, leaving the dot un-grabbable.
    Rendering the dot in a sibling group later in the document order
    flips paint order without touching the dep-arrow click target.

    The overlay also renders a "drop here" indicator on every editable
    target bar's left edge while a connector drag is in progress, growing
    + colouring up when that bar is the current connector-target-hover.
  -->
  <g class="connector-overlay" transform="translate(0, {milestoneStripHeight})">
    {#each visibleRows as row (rowKey(row))}
      {#if row.kind === 'issue' && row.issue !== null}
        {#if row.issue.startDate != null && row.issue.dueDate != null && isEditable(row.issue._id)}
          {@const rowIssueId = String(row.issue._id)}
          {@const dragKind = dragState.kind}
          {@const dragSourceId =
            dragKind === 'connector-drawing' || dragKind === 'connector-target-hover'
              ? String(dragState.source._id)
              : null}
          {@const dragTargetIssueId = dragKind === 'connector-target-hover' ? String(dragState.target._id) : null}
          {@const xOv = timeScale.toX(row.issue.startDate)}
          {@const x2Ov = timeScale.toX(row.issue.dueDate)}
          {@const wOv = Math.max(2, x2Ov - xOv + timeScale.pxPerDay)}
          {@const barYOv = row.y + 6}
          {@const barHOv = row.height - 12}
          {@const isSource = dragSourceId !== null && dragSourceId === rowIssueId}
          {@const isCurrentTarget = dragTargetIssueId === rowIssueId}
          {@const showSourceDot = wOv >= 18 && (isSelected(rowIssueId) || isSource)}
          {@const showTargetDot =
            wOv >= 18 && (dragKind === 'connector-drawing' || dragKind === 'connector-target-hover') && !isSource}
          {#if showSourceDot}
            <GanttConnectorDot
              cx={xOv + wOv + 12}
              cy={barYOv + barHOv - 2}
              sourceId={rowIssueId}
              sourceSpace={String(row.issue.space)}
              hitR={10}
              on:connectorDown={(e) => {
                if (row.issue === null) return
                const rect = barRects.get(rowIssueId)
                if (rect === undefined) return
                void e
                dispatch('connectorDown', {
                  source: row.issue,
                  originPx: { x: rect.right + 12, y: rect.bottom - 2 }
                })
              }}
            />
          {/if}
          {#if showTargetDot}
            <!-- Drop-here indicator at the FS target anchor (left edge of bar).
               Static state: small grey dot, signals "you can drop here".
               Hovered state: bigger indigo dot matching the source-dot palette,
               signals "release now to create the dependency". -->
            <circle
              class="gantt-connector-target-dot"
              class:active={isCurrentTarget}
              cx={xOv - 8}
              cy={barYOv + barHOv / 2}
              r={isCurrentTarget ? 6 : 4}
              fill={isCurrentTarget ? 'var(--theme-state-info-color, #6366f1)' : 'var(--theme-state-regular-color)'}
              stroke="#ffffff"
              stroke-width={isCurrentTarget ? 1.5 : 1}
              opacity={isCurrentTarget ? 1 : 0.55}
              pointer-events="none"
            />
          {/if}
        {/if}
      {/if}
    {/each}
  </g>

  <!--
    Resize-handle overlay — rendered AFTER GanttDependencyLayer for the same
    reason the connector-dot overlay above is: SVG hit-testing follows paint
    order, and the dep-arrows' invisible 12 px hit-stroke is painted on top of
    the bar layer. An arrow crossing a FOREIGN bar therefore captured the
    pointerdown meant for that bar's resize handle and the canvas panned
    instead of resizing (trimming the arrow's own endpoints, which the router
    already does, cannot help in the middle of a curve). Only the selected bar
    ever has handles, so this layer holds at most one pair.
  -->
  {#if dateMutable && resizeHandles !== null}
    <g class="resize-handle-overlay" transform="translate(0, {milestoneStripHeight})">
      <GanttBarResizeHandles
        x={resizeHandles.x}
        w={resizeHandles.w}
        barY={resizeHandles.barY}
        barH={resizeHandles.barH}
        dragTarget={resizeHandles.target}
        {layoutMode}
        on:barMouseDown
      />
    </g>
  {/if}

  <!-- Milestone target-date markers as short tick + diamond at the top
       of the canvas only (redesign: less visual noise than a
       full-height dashed line). -->
  <g class="milestones">
    {#each milestones as ms (ms._id)}
      {@const x = timeScale.toX(ms.targetDate)}
      <line x1={x} x2={x} y1={0} y2={14} stroke="var(--theme-state-info-color, #6366f1)" stroke-width={1.5} />
      <polygon points="{x - 5},2 {x + 5},2 {x},10" fill="var(--theme-state-info-color, #6366f1)">
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
    /* Lighter than --theme-bg-color so the canvas reads as a distinct
       workspace surface against the rest of the Huly chrome. In light
       theme: ~#FBFBFC (nearly white). In dark theme: #1E2024
       (slightly lifted off the page background). */
    background: var(--theme-comp-header-color);
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
  /* Swimlane header band painted behind the group-header row
     so the lane boundary reads across the entire canvas width. */
  :global(svg.gantt-canvas .row-rect.group-header-bg) {
    fill: var(--theme-divider-color);
    opacity: 0.7;
  }
  /* Phase-2 weekend / holiday tint — theme-aware via divider colour so it
     stays subtle in both light and dark themes. */
  :global(svg.gantt-canvas .non-working-day-rect) {
    fill: var(--theme-divider-color);
    opacity: 0.1;
  }
</style>
