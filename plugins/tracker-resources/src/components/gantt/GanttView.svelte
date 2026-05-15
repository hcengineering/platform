<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
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
  import GanttToolbar from './GanttToolbar.svelte'
  import { buildLayout } from './lib/layout'
  import { createTimeScale } from './lib/time-scale'
  import { type LayoutRow, type MilestoneMarker, type SummaryRange, type ZoomLevel } from './lib/types'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc> = {}
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions

  const ROW_HEIGHT = 28
  const SIDEBAR_WIDTH = 360
  const HEADER_HEIGHT = 56
  const MILESTONE_STRIP_HEIGHT = 22

  let issues: Issue[] = []
  let milestones: Milestone[] = []
  let loadingIssues = true
  let loadingMilestones = true

  // viewport for the canvas (px). horizontal scroll updates these.
  let canvasViewportLeft = 0
  let canvasViewportWidth = 1200
  let scrollTop = 0
  let viewportHeight = 600

  let containerEl: HTMLDivElement | undefined
  let scrollerEl: HTMLDivElement | undefined

  // Zoom is local component state in PR 2 — keeps the diff small and avoids
  // touching the ViewletPreference plumbing. Per-user persistence is a
  // follow-up PR.
  let zoom: ZoomLevel = 'week'

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

  // Determine the date range to display: min(startDate, dueDate) of all issues, expanded by 14d each side.
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

  // Set of row ids currently collapsed (children hidden). Local state in PR 2.
  let collapsedIds: Set<string> = new Set()
  function onToggle (e: CustomEvent<{ id: string }>): void {
    const next = new Set(collapsedIds)
    if (next.has(e.detail.id)) next.delete(e.detail.id)
    else next.add(e.detail.id)
    collapsedIds = next
  }

  $: rows = buildLayout(issues, milestoneMarkers, 'none', { rowHeight: ROW_HEIGHT, collapsedIds })

  // Compute summary ranges for parent issues + milestones — aggregate of children's
  // startDate/dueDate.
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
    return containerEl !== undefined ? containerEl.clientWidth - SIDEBAR_WIDTH : 1200
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

  // Initialise viewport dimensions after mount and on resize so jump-buttons /
  // virtualisation start with correct values instead of waiting for the first
  // user-driven scroll event.
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

  $: loading = loadingIssues || loadingMilestones
</script>

<div class="gantt-root" bind:this={containerEl}>
  <GanttToolbar bind:zoom />
  {#if loading}
    <Loading />
  {:else}
    <div class="gantt-body">
      <GanttSidebar
        {rows}
        {scrollTop}
        viewportHeight={viewportHeight}
        width={SIDEBAR_WIDTH}
        headerHeight={HEADER_HEIGHT + MILESTONE_STRIP_HEIGHT}
        {timeScale}
        viewportLeft={viewport.left}
        viewportRight={viewport.right}
        on:jump={onJump}
        on:toggle={onToggle}
      />
      <div class="canvas-scroller" bind:this={scrollerEl} on:scroll={handleScroll}>
        <div class="canvas-stack" style="width: {totalCanvasWidth}px;">
          <div class="header-sticky" style="height: {HEADER_HEIGHT}px;">
            <GanttHeader {timeScale} {viewport} height={HEADER_HEIGHT} />
          </div>
          <GanttCanvas
            {rows}
            milestones={milestoneMarkers}
            {timeScale}
            {summaryRanges}
            {scrollTop}
            {viewportHeight}
            {viewport}
            milestoneStripHeight={MILESTONE_STRIP_HEIGHT}
          />
        </div>
      </div>
    </div>
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
  .gantt-body {
    display: flex;
    flex: 1 1 auto;
    overflow: hidden;
    min-height: 0;
  }
  .canvas-scroller {
    flex: 1 1 auto;
    overflow: auto;
    min-width: 0;
    min-height: 0;
  }
  .canvas-stack {
    position: relative;
  }
  .header-sticky {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
