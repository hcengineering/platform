<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { type Class, type Doc, type DocumentQuery, type Ref, type Space, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { type Issue, type Milestone } from '@hcengineering/tracker'
  import { Loading } from '@hcengineering/ui'
  import { type Viewlet, type ViewOptions } from '@hcengineering/view'
  import { onDestroy, onMount } from 'svelte'
  import tracker from '../../plugin'
  import GanttCanvas from './GanttCanvas.svelte'
  import GanttHeader from './GanttHeader.svelte'
  import GanttSidebar from './GanttSidebar.svelte'
  import { buildLayout } from './lib/layout'
  import { createTimeScale } from './lib/time-scale'
  import { type LayoutRow, type MilestoneMarker, type SummaryRange, type ZoomLevel } from './lib/types'
  import { showPanel } from '@hcengineering/ui'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc> = {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let viewlet: Viewlet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let viewOptions: ViewOptions

  const ROW_HEIGHT = 36
  const MIN_SIDEBAR_WIDTH = 120
  const MAX_SIDEBAR_WIDTH = 600
  const DEFAULT_SIDEBAR_WIDTH = 280
  const HEADER_HEIGHT = 40
  const MILESTONE_STRIP_HEIGHT = 0
  const TOOLBAR_HEIGHT = 40

  let hoveredRowId: string | null = null
  let tooltipState: { visible: boolean, x: number, y: number, row: LayoutRow | null } = {
    visible: false, x: 0, y: 0, row: null
  }
  function onRowHover (e: CustomEvent<{ id: string | null, row?: LayoutRow, mouseX?: number, mouseY?: number }>): void {
    hoveredRowId = e.detail.id
    if (e.detail.id !== null && e.detail.row !== undefined && e.detail.mouseX !== undefined) {
      tooltipState = { visible: true, x: e.detail.mouseX, y: e.detail.mouseY ?? 0, row: e.detail.row }
    } else {
      tooltipState = { ...tooltipState, visible: false }
    }
  }

  let issues: Issue[] = []
  let milestones: Milestone[] = []
  let loadingIssues = true
  let loadingMilestones = true

  let canvasViewportLeft = 0
  let canvasViewportWidth = 1200
  let scrollTop = 0
  let viewportHeight = 600

  let containerEl: HTMLDivElement | undefined
  let scrollerEl: HTMLDivElement | undefined

  let zoom: ZoomLevel = 'week'
  const ZOOM_LEVELS: readonly ZoomLevel[] = ['day', 'week', 'month', 'quarter']

  let userSidebarWidth: number = DEFAULT_SIDEBAR_WIDTH
  let showIssueCode: boolean = true
  let showTitle: boolean = true
  let showSettings: boolean = false

  function setZoom (z: ZoomLevel): void {
    zoom = z
    if (scrollerEl !== undefined) {
      scrollerEl.scrollLeft = 0
    }
    queueMicrotask(syncViewport)
  }

  const issueQuery = createQuery()
  const milestoneQuery = createQuery()

  $: issueDocQuery = (space !== undefined
    ? { space, ...(query as DocumentQuery<Issue>) }
    : { ...(query as DocumentQuery<Issue>) }) as DocumentQuery<Issue>
  $: milestoneDocQuery = (space !== undefined ? { space } : {}) as DocumentQuery<Milestone>
  $: issueQuery.query(
    tracker.class.Issue,
    issueDocQuery,
    (res: Issue[]) => {
      issues = res
      loadingIssues = false
    },
    {
      sort: { startDate: SortingOrder.Ascending, rank: SortingOrder.Ascending }
    }
  )
  $: milestoneQuery.query(
    tracker.class.Milestone,
    milestoneDocQuery,
    (res: Milestone[]) => {
      milestones = res
      loadingMilestones = false
    }
  )

  $: dateRange = computeDateRange(issues, milestones)

  function computeDateRange (
    iss: Issue[],
    ms: Milestone[]
  ): { from: number, to: number } {
    const all: number[] = []
    for (const i of iss) {
      if (i.startDate !== null && i.startDate !== undefined) all.push(i.startDate)
      if (i.dueDate !== null && i.dueDate !== undefined) all.push(i.dueDate)
    }
    for (const m of ms) {
      if (m.targetDate !== null && m.targetDate !== undefined) all.push(m.targetDate)
    }
    const dayMs = 86_400_000
    if (all.length === 0) {
      const today = Date.now()
      return { from: today - 30 * dayMs, to: today + 60 * dayMs }
    }
    return {
      from: Math.min(...all) - 14 * dayMs,
      to: Math.max(...all) + 14 * dayMs
    }
  }

  $: timeScale = createTimeScale(zoom, dateRange.from)
  $: milestoneMarkers = milestones.map<MilestoneMarker>(m => ({
    _id: m._id,
    label: m.label,
    startDate: (m as Milestone & { startDate: number | null }).startDate ?? null,
    targetDate: m.targetDate
  }))

  let collapsedIds: Set<string> = new Set()
  function onToggle (e: CustomEvent<{ id: string }>): void {
    const next = new Set(collapsedIds)
    if (next.has(e.detail.id)) next.delete(e.detail.id)
    else next.add(e.detail.id)
    collapsedIds = next
  }

  $: rows = buildLayout(issues, milestoneMarkers, 'none', { rowHeight: ROW_HEIGHT, collapsedIds })
  $: summaryRanges = computeSummaryRanges(rows, issues)

  function computeSummaryRanges (
    layoutRows: LayoutRow[],
    allIssues: Issue[]
  ): Map<string, SummaryRange> {
    const result = new Map<string, SummaryRange>()
    const childrenOf = new Map<string, Issue[]>()
    const issuesByMilestone = new Map<string, Issue[]>()
    for (const i of allIssues) {
      const p = i.parents?.[0]?.parentId
      if (p !== undefined && p !== null) {
        const k = p as unknown as string
        const list = childrenOf.get(k) ?? []
        list.push(i)
        childrenOf.set(k, list)
      }
      const ms = (i as unknown as { milestone?: string | null }).milestone
      if (ms != null) {
        const list = issuesByMilestone.get(ms) ?? []
        list.push(i)
        issuesByMilestone.set(ms, list)
      }
    }
    for (const row of layoutRows) {
      if (!row.isSummary) continue
      if (row.kind === 'milestone' && row.milestone !== null) {
        const msId = row.milestone._id as unknown as string
        const kids = issuesByMilestone.get(msId) ?? []
        const starts = kids.map(k => k.startDate).filter((v): v is number => v !== null && v !== undefined)
        const dues = kids.map(k => k.dueDate).filter((v): v is number => v !== null && v !== undefined)
        result.set(row.id, {
          startDate: starts.length > 0 ? Math.min(...starts) : null,
          dueDate: dues.length > 0 ? Math.max(...dues) : null
        })
        continue
      }
      if (row.issue === null) continue
      const id = (row.issue as Issue)._id as unknown as string
      const kids = childrenOf.get(id) ?? []
      const starts = kids.map(k => k.startDate).filter((v): v is number => v !== null && v !== undefined)
      const dues = kids.map(k => k.dueDate).filter((v): v is number => v !== null && v !== undefined)
      result.set(id, {
        startDate: starts.length > 0 ? Math.min(...starts) : null,
        dueDate: dues.length > 0 ? Math.max(...dues) : null
      })
    }
    return result
  }

  $: totalCanvasWidth = Math.max(viewportWidth(), timeScale.toX(dateRange.to) - timeScale.toX(dateRange.from))

  function viewportWidth (): number {
    return containerEl !== undefined ? containerEl.clientWidth - sidebarWidthPx : 1200
  }

  function handleScroll (e: Event): void {
    const t = e.target as HTMLDivElement
    canvasViewportLeft = t.scrollLeft
    canvasViewportWidth = t.clientWidth
    scrollTop = t.scrollTop
    viewportHeight = t.clientHeight
  }

  function onJump (e: CustomEvent<{ x: number }>): void {
    if (scrollerEl !== undefined) {
      scrollerEl.scrollTo({ left: Math.max(0, e.detail.x - 80), behavior: 'smooth' })
    }
  }

  function onIssueOpen (e: CustomEvent<{ issue: { _id: string, _class: string } }>): void {
    showPanel(
      tracker.component.EditIssue,
      e.detail.issue._id as Ref<Doc>,
      e.detail.issue._class as Ref<Class<Doc>>,
      'content'
    )
  }

  function jumpToToday (): void {
    if (scrollerEl === undefined) return
    const x = timeScale.toX(Date.now())
    scrollerEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'smooth' })
  }
  function pageScroll (dir: -1 | 1): void {
    if (scrollerEl === undefined) return
    scrollerEl.scrollBy({ left: dir * canvasViewportWidth * 0.8, behavior: 'smooth' })
  }
  function jumpToStart (): void {
    if (scrollerEl === undefined) return
    scrollerEl.scrollTo({ left: 0, behavior: 'smooth' })
  }
  function jumpToEnd (): void {
    if (scrollerEl === undefined) return
    scrollerEl.scrollTo({ left: scrollerEl.scrollWidth, behavior: 'smooth' })
  }
  function jumpToDate (iso: string): void {
    if (scrollerEl === undefined || iso === '') return
    const t = Date.parse(iso)
    if (isNaN(t)) return
    const x = timeScale.toX(t)
    scrollerEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'smooth' })
  }
  let datePickerValue: string = ''

  // Forward wheel events from the sidebar to the canvas-scroller so users can
  // scroll vertically while hovering the issue list. Direct scrollTop/scrollLeft
  // assignment matches the browser's native wheel-to-scroll speed; smooth
  // scrolling would feel laggy against the canvas.
  function forwardSidebarWheel (e: WheelEvent): void {
    if (scrollerEl === undefined) return
    e.preventDefault()
    // deltaMode 1 = lines, 2 = pages; scale to pixels.
    const factor = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? scrollerEl.clientHeight : 1)
    scrollerEl.scrollTop += e.deltaY * factor
    scrollerEl.scrollLeft += e.deltaX * factor
  }

  // Click-and-drag panning across empty canvas area.
  let panning = false
  let panStartX = 0
  let panStartY = 0
  let panStartScrollLeft = 0
  let panStartScrollTop = 0
  function onCanvasPanStart (e: PointerEvent): void {
    if (scrollerEl === undefined) return
    // Only pan with primary mouse button on empty space — let SVG/HTML
    // children (bars, buttons, links) handle their own click/dblclick.
    const target = e.target as HTMLElement
    if (target.closest('.bar-wrap, button, a, .toggle-btn, .jump-btn, .settings-popover')) return
    panning = true
    panStartX = e.clientX
    panStartY = e.clientY
    panStartScrollLeft = scrollerEl.scrollLeft
    panStartScrollTop = scrollerEl.scrollTop
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onCanvasPanMove (e: PointerEvent): void {
    if (!panning || scrollerEl === undefined) return
    scrollerEl.scrollLeft = panStartScrollLeft - (e.clientX - panStartX)
    scrollerEl.scrollTop = panStartScrollTop - (e.clientY - panStartY)
  }
  function onCanvasPanEnd (e: PointerEvent): void {
    panning = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Drag-resize the sidebar.
  let resizing = false
  let resizeStartX = 0
  let resizeStartWidth = 0
  function onResizeStart (e: PointerEvent): void {
    resizing = true
    resizeStartX = e.clientX
    resizeStartWidth = userSidebarWidth
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onResizeMove (e: PointerEvent): void {
    if (!resizing) return
    const next = resizeStartWidth + (e.clientX - resizeStartX)
    userSidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, next))
    queueMicrotask(syncViewport)
  }
  function onResizeEnd (e: PointerEvent): void {
    resizing = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  let resizeObs: ResizeObserver | undefined
  function syncViewport (): void {
    if (scrollerEl === undefined) return
    canvasViewportLeft = scrollerEl.scrollLeft
    canvasViewportWidth = scrollerEl.clientWidth
    scrollTop = scrollerEl.scrollTop
    viewportHeight = scrollerEl.clientHeight
  }
  onMount(() => {
    syncViewport()
    if (typeof ResizeObserver !== 'undefined' && scrollerEl !== undefined) {
      resizeObs = new ResizeObserver(() => syncViewport())
      resizeObs.observe(scrollerEl)
    }
  })
  onDestroy(() => {
    resizeObs?.disconnect()
  })

  $: viewport = { left: canvasViewportLeft, right: canvasViewportLeft + canvasViewportWidth }
  $: sidebarWidthPx = (showIssueCode || showTitle) ? userSidebarWidth : 60

  $: loading = loadingIssues || loadingMilestones
</script>

<div class="gantt-root" bind:this={containerEl}>
  {#if loading}
    <Loading />
  {:else}
    <div class="gantt-toolbar" style="height: {TOOLBAR_HEIGHT}px;">
      <div class="toolbar-left">
        <button class="nav-btn" type="button" title="Jump to start" on:click={jumpToStart}>⏮</button>
        <button class="nav-btn" type="button" title="Previous period" on:click={() => pageScroll(-1)}>«</button>
        <button class="nav-btn today-btn" type="button" on:click={jumpToToday}>Today</button>
        <button class="nav-btn" type="button" title="Next period" on:click={() => pageScroll(1)}>»</button>
        <button class="nav-btn" type="button" title="Jump to end" on:click={jumpToEnd}>⏭</button>
        <input
          type="date"
          class="date-input"
          title="Jump to date"
          bind:value={datePickerValue}
          on:change={() => jumpToDate(datePickerValue)}
        />
      </div>
      <div class="toolbar-center">
        {#each ZOOM_LEVELS as z (z)}
          <button
            type="button"
            class="zoom-btn"
            class:active={zoom === z}
            on:click={() => setZoom(z)}
          >{z[0].toUpperCase() + z.slice(1)}</button>
        {/each}
      </div>
      <div class="toolbar-right">
        <button
          type="button"
          class="settings-btn"
          title="Display settings"
          on:click={() => { showSettings = !showSettings }}
        >⚙</button>
        {#if showSettings}
          <div class="settings-popover">
            <label>
              <input type="checkbox" bind:checked={showIssueCode} />
              Issue code
            </label>
            <label>
              <input type="checkbox" bind:checked={showTitle} />
              Title
            </label>
          </div>
        {/if}
      </div>
    </div>

    <div class="gantt-body">
      <div
        class="sidebar-host"
        style="width: {sidebarWidthPx}px;"
        on:wheel|nonpassive={forwardSidebarWheel}
      >
        <GanttSidebar
          {rows}
          {scrollTop}
          viewportHeight={viewportHeight}
          width={sidebarWidthPx}
          headerHeight={HEADER_HEIGHT + MILESTONE_STRIP_HEIGHT}
          {timeScale}
          viewportLeft={viewport.left}
          viewportRight={viewport.right}
          {showIssueCode}
          {showTitle}
          {hoveredRowId}
          on:jump={onJump}
          on:toggle={onToggle}
          on:openIssue={onIssueOpen}
          on:hoverRow={onRowHover}
        />
      </div>
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="resize-handle"
        class:active={resizing}
        on:pointerdown={onResizeStart}
        on:pointermove={onResizeMove}
        on:pointerup={onResizeEnd}
        on:pointercancel={onResizeEnd}
      />
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="canvas-scroller"
        class:panning
        bind:this={scrollerEl}
        on:scroll={handleScroll}
        on:pointerdown={onCanvasPanStart}
        on:pointermove={onCanvasPanMove}
        on:pointerup={onCanvasPanEnd}
        on:pointercancel={onCanvasPanEnd}
      >
        <div class="canvas-stack" style="width: {totalCanvasWidth}px;">
          <div class="header-sticky" style="height: {HEADER_HEIGHT}px;">
            <GanttHeader {timeScale} {viewport} totalWidth={totalCanvasWidth} height={HEADER_HEIGHT} />
          </div>
          <GanttCanvas
            {rows}
            milestones={milestoneMarkers}
            {timeScale}
            {summaryRanges}
            {scrollTop}
            {viewportHeight}
            {viewport}
            totalWidth={totalCanvasWidth}
            milestoneStripHeight={MILESTONE_STRIP_HEIGHT}
            {hoveredRowId}
            on:openIssue={onIssueOpen}
            on:hoverRow={onRowHover}
          />
        </div>
      </div>
    </div>
    {#if tooltipState.visible && tooltipState.row !== null}
      {@const row = tooltipState.row}
      {@const issue = row.issue}
      {@const ms = row.milestone}
      <div
        class="hover-tooltip"
        style="left: {tooltipState.x + 14}px; top: {tooltipState.y + 14}px;"
      >
        {#if row.kind === 'milestone' && ms !== null}
          <div class="tt-head">◆ Milestone</div>
          <div class="tt-title">{ms.label}</div>
          {#if ms.startDate !== null}
            <div class="tt-line">Start: {new Date(ms.startDate).toISOString().slice(0, 10)}</div>
          {/if}
          <div class="tt-line">Target: {new Date(ms.targetDate).toISOString().slice(0, 10)}</div>
        {:else if issue !== null}
          <div class="tt-head">Issue</div>
          <div class="tt-title">{issue.title}</div>
          {#if issue.startDate !== null}
            <div class="tt-line">Start: {new Date(issue.startDate).toISOString().slice(0, 10)}</div>
          {/if}
          {#if issue.dueDate !== null}
            <div class="tt-line">Due: {new Date(issue.dueDate).toISOString().slice(0, 10)}</div>
          {/if}
          {#if issue.startDate !== null && issue.dueDate !== null}
            {@const days = Math.round((Math.max(issue.dueDate, issue.startDate) - Math.min(issue.dueDate, issue.startDate)) / 86_400_000) + 1}
            <div class="tt-line">Duration: {days} day{days === 1 ? '' : 's'}</div>
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .gantt-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  .gantt-toolbar {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 12px;
    border-bottom: 1px solid var(--theme-divider-color);
    background: var(--theme-comp-header-color);
  }
  .toolbar-left { display: flex; gap: 4px; }
  .toolbar-center { display: flex; gap: 2px; justify-self: center; }
  .toolbar-right { display: flex; gap: 4px; justify-self: end; position: relative; }
  .nav-btn {
    height: 26px;
    min-width: 28px;
    padding: 0 10px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
  }
  .nav-btn:hover {
    background: var(--theme-button-hovered);
  }
  .today-btn {
    font-weight: 600;
  }
  .date-input {
    height: 26px;
    margin-left: 8px;
    padding: 0 6px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
  }
  .zoom-btn {
    height: 26px;
    padding: 0 12px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    cursor: pointer;
  }
  .zoom-btn:first-child { border-radius: 4px 0 0 4px; }
  .zoom-btn:last-child  { border-radius: 0 4px 4px 0; }
  .zoom-btn:not(:first-child) { border-left: none; }
  .zoom-btn:hover { background: var(--theme-button-hovered); }
  .zoom-btn.active {
    background: var(--theme-button-pressed);
    font-weight: 600;
  }
  .settings-btn {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
  }
  .settings-btn:hover { background: var(--theme-button-hovered); }
  .settings-popover {
    position: absolute;
    top: 32px;
    right: 0;
    background: var(--theme-popup-color, var(--theme-comp-header-color));
    border: 1px solid var(--theme-divider-color);
    border-radius: 4px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--theme-content-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 5;
  }
  .settings-popover label {
    display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap;
  }
  .gantt-body {
    display: flex;
    flex: 1 1 auto;
    overflow: hidden;
    min-height: 0;
  }
  .sidebar-host { flex: 0 0 auto; min-height: 0; }
  .resize-handle {
    flex: 0 0 5px;
    cursor: col-resize;
    background: var(--theme-divider-color);
    transition: background 80ms ease;
    user-select: none;
    touch-action: none;
  }
  .resize-handle:hover, .resize-handle.active {
    background: var(--theme-state-info-color, #6366f1);
  }
  .canvas-scroller {
    flex: 1 1 auto;
    overflow: auto;
    min-width: 0;
    min-height: 0;
    cursor: grab;
  }
  .canvas-scroller.panning {
    cursor: grabbing;
  }
  .canvas-stack { position: relative; }
  .header-sticky {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .hover-tooltip {
    position: fixed;
    z-index: 100;
    background: var(--theme-popup-color, var(--theme-comp-header-color));
    border: 1px solid var(--theme-divider-color);
    border-radius: 4px;
    padding: 8px 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    pointer-events: none;
    font-size: 12px;
    color: var(--theme-content-color);
    max-width: 320px;
  }
  .tt-head {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-darker-color);
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }
  .tt-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .tt-line {
    font-size: 12px;
    line-height: 1.5;
  }
</style>
