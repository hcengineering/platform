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
  const SIDEBAR_WIDTH = 320
  const HEADER_HEIGHT = 32

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
  $: rows = buildLayout(issues, 'none', ROW_HEIGHT)

  // Compute summary ranges for parent issues — aggregate of children's startDate/dueDate
  $: summaryRanges = computeSummaryRanges(rows, issues)

  function computeSummaryRanges (
    layoutRows: LayoutRow[],
    allIssues: Issue[]
  ): Map<string, SummaryRange> {
    const result = new Map<string, SummaryRange>()
    const childrenOf = new Map<string, Issue[]>()
    for (const i of allIssues) {
      const p = i.parents?.[0]?.parentId
      if (p !== undefined && p !== null) {
        const k = p as unknown as string
        const list = childrenOf.get(k) ?? []
        list.push(i)
        childrenOf.set(k, list)
      }
    }
    for (const row of layoutRows) {
      if (!row.isSummary || row.issue === null) continue
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

  $: milestoneMarkers = milestones.map<MilestoneMarker>(m => ({
    _id: m._id,
    label: m.label,
    startDate: (m as Milestone & { startDate: number | null }).startDate ?? null,
    targetDate: m.targetDate
  }))

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

  $: viewport = { left: canvasViewportLeft, right: canvasViewportLeft + canvasViewportWidth }

  $: loading = loadingIssues || loadingMilestones
</script>

<div class="gantt-root" bind:this={containerEl}>
  <GanttToolbar bind:zoom />
  {#if loading}
    <Loading />
  {:else}
    <div class="gantt-body">
      <GanttSidebar {rows} {scrollTop} viewportHeight={viewportHeight} width={SIDEBAR_WIDTH} />
      <div class="canvas-scroller" bind:this={scrollerEl} on:scroll={handleScroll}>
        <div style="width: {totalCanvasWidth}px;">
          <GanttHeader {timeScale} {viewport} height={HEADER_HEIGHT} />
          <GanttCanvas
            {rows}
            milestones={milestoneMarkers}
            {timeScale}
            {summaryRanges}
            {scrollTop}
            {viewportHeight}
            {viewport}
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
  }
  .canvas-scroller {
    flex: 1 1 auto;
    overflow: auto;
  }
</style>
