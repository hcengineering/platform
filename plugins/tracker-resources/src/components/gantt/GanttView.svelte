<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { type Class, type Doc, type DocumentQuery, type Ref, type Space, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { type Issue, type Milestone } from '@hcengineering/tracker'
  import { Loading, addNotification, NotificationSeverity } from '@hcengineering/ui'
  import { translate } from '@hcengineering/platform'
  import { type Viewlet, type ViewOptions } from '@hcengineering/view'
  import { onDestroy, onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import tracker from '../../plugin'
  import { canEditIssue } from '../../utils'
  import GanttCanvas from './GanttCanvas.svelte'
  import GanttHeader from './GanttHeader.svelte'
  import GanttSidebar from './GanttSidebar.svelte'
  import { reduce } from './lib/drag-controller'
  import { buildLayout } from './lib/layout'
  import { descendantsWithDates } from './lib/scheduler'
  import { createTimeScale } from './lib/time-scale'
  import { type DragState, type LayoutRow, type MilestoneMarker, type SummaryRange, type ZoomLevel } from './lib/types'
  import { Icon, Label, showPanel, showPopup, tooltip } from '@hcengineering/ui'
  import CreateIssue from '../CreateIssue.svelte'
  import { showMenu, statusStore } from '@hcengineering/view-resources'
  import { getEventPositionElement } from '@hcengineering/ui'
  import { ganttExtraActions } from './lib/menu-actions'
  import ArrowLeft from '@hcengineering/ui/src/components/icons/ArrowLeft.svelte'
  import ArrowRight from '@hcengineering/ui/src/components/icons/ArrowRight.svelte'
  import NavPrev from '@hcengineering/ui/src/components/icons/NavPrev.svelte'
  import NavNext from '@hcengineering/ui/src/components/icons/NavNext.svelte'
  import Calendar from '@hcengineering/ui/src/components/icons/Calendar.svelte'

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
  const HEADER_HEIGHT = 56
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

  // PR 3 edit-mode state: a single source of truth for the active drag/resize
  // interaction. GanttBar / GanttCanvas / GanttSidebar / GanttResizeOverlay
  // subscribe to this store; the reducer in lib/drag-controller.ts mutates it.
  // editableIssueIds gates the resize handles + the Set-start-date menu entry
  // per issue based on canEditIssue() (utils.ts:280).
  const activeDrag = writable<DragState>({ kind: 'idle' })
  let editableIssueIds: Set<string> = new Set()

  let canvasViewportLeft = 0
  let canvasViewportWidth = 1200
  let scrollTop = 0
  let viewportHeight = 600

  let containerEl: HTMLDivElement | undefined
  let scrollerEl: HTMLDivElement | undefined
  let hScrollEl: HTMLDivElement | undefined

  let zoom: ZoomLevel = 'week'
  const ZOOM_LEVELS: readonly ZoomLevel[] = ['day', 'week', 'month', 'quarter']

  let userSidebarWidth: number = DEFAULT_SIDEBAR_WIDTH

  // Sidebar column visibility is wired to two ToggleViewOptions registered
  // in models/tracker/src/viewlets.ts (Customize-View dropdown). Issue-code
  // defaults OFF — the code is still surfaced in the hover tooltip.
  $: showIssueCode = (viewOptions as Record<string, unknown>)?.ganttShowIssueCode === true
  $: showTitle = ((viewOptions as Record<string, unknown>)?.ganttShowTitle ?? true) !== false
  $: showStatus = ((viewOptions as Record<string, unknown>)?.ganttShowStatus ?? true) !== false

  function setZoom (z: ZoomLevel): void {
    zoom = z
    if (hScrollEl !== undefined) {
      hScrollEl.scrollLeft = 0
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

  // Resolve per-issue edit permission off the async canEditIssue() into a Set
  // the renderers can hit synchronously. Re-runs each time the issue query
  // delivers a new array. The IIFE pattern is required because Svelte's `$:`
  // doesn't await; the Set assignment fires later, which is fine because the
  // reactive renderers re-run again then.
  $: void (async () => {
    const next = new Set<string>()
    for (const i of issues) {
      if (await canEditIssue(i)) next.add(i._id as unknown as string)
    }
    editableIssueIds = next
  })()
  $: milestoneQuery.query(
    tracker.class.Milestone,
    milestoneDocQuery,
    (res: Milestone[]) => {
      milestones = res
      loadingMilestones = false
    }
  )

  $: dateRange = computeDateRange(issues, milestones, zoom)

  function paddingDays (z: ZoomLevel): number {
    switch (z) {
      case 'day': return 1
      case 'week': return 7
      case 'month': return 30
      case 'quarter': return 90
      default: return 7
    }
  }

  function computeDateRange (
    iss: Issue[],
    ms: Milestone[],
    z: ZoomLevel
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
      return { from: today - 7 * dayMs, to: today + 30 * dayMs }
    }
    // Pad by exactly one zoom-unit on each side so the visible timeline
    // never extends far past the actual issue range.
    const pad = paddingDays(z) * dayMs
    return {
      from: Math.min(...all) - pad,
      to: Math.max(...all) + pad
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
  $: statusCategoryMap = buildStatusCategoryMap($statusStore.byId)
  function buildStatusCategoryMap (byId: Map<any, any>): Map<string, string> {
    const out = new Map<string, string>()
    for (const [id, status] of byId.entries()) {
      out.set(String(id), String(status.category ?? ''))
    }
    return out
  }

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

  // totalCanvasWidth is the data-range width only — never inflated to fit
  // the viewport. If the issue range is short, the canvas fits entirely
  // on screen and the horizontal scrollbar hides itself.
  $: totalCanvasWidth = Math.max(
    1,
    Math.ceil(timeScale.toX(dateRange.to) - timeScale.toX(dateRange.from))
  )

  function handleVScroll (e: Event): void {
    const t = e.target as HTMLDivElement
    scrollTop = t.scrollTop
    viewportHeight = t.clientHeight
  }
  function handleHScroll (e: Event): void {
    const t = e.target as HTMLDivElement
    canvasViewportLeft = t.scrollLeft
    canvasViewportWidth = t.clientWidth
  }

  function onJump (e: CustomEvent<{ x: number }>): void {
    if (hScrollEl !== undefined) {
      hScrollEl.scrollTo({ left: Math.max(0, e.detail.x - 80), behavior: 'smooth' })
    }
  }

  function issueCode (i: Issue): string {
    return (i as unknown as { identifier?: string }).identifier ?? 'Issue'
  }

  function onIssueOpen (e: CustomEvent<{ issue: { _id: string, _class: string } }>): void {
    showPanel(
      tracker.component.EditIssue,
      e.detail.issue._id as Ref<Doc>,
      e.detail.issue._class as Ref<Class<Doc>>,
      'content'
    )
  }

  function newIssue (): void {
    if (space === undefined) return
    showPopup(CreateIssue, { space, shouldSaveDraft: true }, 'top')
  }

  // -------------------------------------------------------------------------
  // PR 3 edit-mode: bar mousedown → reducer; window mousemove/mouseup; commit.
  // -------------------------------------------------------------------------

  function handleBarMouseDown (e: CustomEvent<{ issue: Issue, edge: 'left' | 'right' | 'body', cursorX: number }>): void {
    activeDrag.update((s) => reduce(s, {
      type: 'mousedown-bar',
      issue: e.detail.issue,
      edge: e.detail.edge,
      cursorX: e.detail.cursorX
    }, timeScale))
  }

  /**
   * Translate the window-space `MouseEvent.clientX` into the canvas's content
   * coordinate. Used for `dragging-unscheduled` so the bar lands at the date
   * under the cursor, not at a delta from "today". Returns undefined when
   * the cursor is outside the canvas (e.g., still over the sidebar) so the
   * reducer keeps its default preview.
   */
  function computeCanvasX (e: MouseEvent): number | undefined {
    if (scrollerEl === undefined) return undefined
    const rect = scrollerEl.getBoundingClientRect()
    const sidebarEdge = rect.left + sidebarWidthPx
    if (e.clientX < sidebarEdge) return undefined
    return e.clientX - sidebarEdge + canvasViewportLeft
  }

  function handleCanvasMouseMove (e: MouseEvent): void {
    activeDrag.update((s) =>
      reduce(s, { type: 'mousemove', cursorX: e.clientX, canvasX: computeCanvasX(e) }, timeScale)
    )
  }

  async function handleCanvasMouseUp (): Promise<void> {
    const state = $activeDrag
    activeDrag.set({ kind: 'idle' })
    if (state.kind === 'idle' || state.kind === 'hover-bar') return
    try {
      await commitDrag(state)
    } catch (err) {
      const title = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  async function commitDrag (state: DragState): Promise<void> {
    if (state.kind === 'idle' || state.kind === 'hover-bar') return
    // Guard: an unscheduled-drag that never reached the canvas (e.g. the user
    // clicked the drag-grip and released without moving) must NOT silently
    // schedule the issue to "today". Codex review-3 (2026-05-10).
    if (state.kind === 'dragging-unscheduled' && !state.hasCanvasTarget) return
    const client = getClient()
    const ops = client.apply('gantt-drag')
    if (state.kind === 'dragging-body' || state.kind === 'dragging-unscheduled') {
      await ops.update(state.issue, { startDate: state.previewStart, dueDate: state.previewDue })
      const delta = state.previewStart - state.originStart
      if (delta !== 0) {
        for (const child of descendantsWithDates(state.issue, issues)) {
          await ops.update(child, {
            startDate: (child.startDate as number) + delta,
            dueDate: (child.dueDate as number) + delta
          })
        }
      }
    } else if (state.kind === 'resizing-left') {
      await ops.update(state.issue, { startDate: state.previewStart })
    } else if (state.kind === 'resizing-right') {
      await ops.update(state.issue, { dueDate: state.previewDue })
    }
    const result = await ops.commit()
    if (!result.result) {
      const title = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(title, '', undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  // Attach/detach window-level mousemove + mouseup only while a drag is active.
  $: if ($activeDrag.kind !== 'idle' && $activeDrag.kind !== 'hover-bar') {
    window.addEventListener('mousemove', handleCanvasMouseMove)
    window.addEventListener('mouseup', handleCanvasMouseUp)
  } else {
    window.removeEventListener('mousemove', handleCanvasMouseMove)
    window.removeEventListener('mouseup', handleCanvasMouseUp)
  }
  onDestroy(() => {
    window.removeEventListener('mousemove', handleCanvasMouseMove)
    window.removeEventListener('mouseup', handleCanvasMouseUp)
  })

  /**
   * Slim the Gantt context menu by deny-listing actions that are noise for a
   * Gantt-specific right-click. Keeps Open (Issue's overridden EditIssue
   * action), Status/Priority/Assignee submenus (›), Set start/due date,
   * Add sub-issue, Set parent issue, Copy ID/URL, Duplicate, Delete.
   *
   * Deny-list (vs. allow-list) is needed because tracker registers a custom
   * Open action for `tracker.class.Issue` with an auto-generated ID; allow-
   * listing by static ID misses it. Codex review-style cleanup + user UX
   * feedback 2026-05-11: too tall, slimmer + keep parent/sub-issue access.
   */
  const GANTT_MENU_EXCLUDED_ACTIONS = [
    'tracker:action:SetComponent',
    'tracker:action:SetMilestone',
    'tracker:action:SetLabels',
    'tracker:action:CopyIssueTitle',
    'tracker:action:Relations',
    'tracker:action:NewRelatedIssue',
    'tracker:action:EditRelatedTargets',
    'tracker:action:MoveToProject',
    'tracker:action:CopyAsMarkdownTable',
    'tracker:action:UnsetParent'
  ]

  function openGanttMenu (event: MouseEvent, issue: Issue): void {
    const anchor = getEventPositionElement(event)
    const editable = editableIssueIds.has(String(issue._id))
    const extra = editable ? ganttExtraActions(issue, anchor) : []
    showMenu(event, {
      object: issue,
      baseMenuClass: tracker.class.Issue,
      actions: extra,
      excludedActions: GANTT_MENU_EXCLUDED_ACTIONS
    })
  }

  function handleBarContextMenu (e: CustomEvent<{ issue: Issue, event: MouseEvent }>): void {
    openGanttMenu(e.detail.event, e.detail.issue)
  }

  function handleRowDragStart (e: CustomEvent<{ issue: Issue, cursorX: number }>): void {
    activeDrag.update((s) => reduce(s, {
      type: 'mousedown-unscheduled',
      issue: e.detail.issue,
      cursorX: e.detail.cursorX
    }, timeScale))
  }

  function handleRowContextMenu (e: CustomEvent<{ issue: { _id: string, _class: string }, event: MouseEvent }>): void {
    const found = issues.find((i) => String(i._id) === e.detail.issue._id)
    if (found === undefined) return
    openGanttMenu(e.detail.event, found)
  }

  // -------------------------------------------------------------------------
  // PR 3 keyboard: Tab cycles bars with dates, arrows shift focused bar by 1d
  // (or 7d with Shift). Escape cancels an active drag.
  // -------------------------------------------------------------------------

  let focusedIssueId: string | null = null
  const DAY_MS = 86_400_000

  $: scheduledIssues = issues.filter((i) => i.startDate != null && i.dueDate != null)

  function moveFocus (dir: 1 | -1): void {
    if (scheduledIssues.length === 0) return
    const ids = scheduledIssues.map((i) => String(i._id))
    const cur = focusedIssueId !== null ? ids.indexOf(focusedIssueId) : -1
    const nextIdx = (cur + dir + ids.length) % ids.length
    focusedIssueId = ids[nextIdx]
  }

  async function shiftFocused (days: number): Promise<void> {
    if (focusedIssueId === null) return
    const i = scheduledIssues.find((it) => String(it._id) === focusedIssueId)
    if (i === undefined || i.startDate == null || i.dueDate == null) return
    if (!editableIssueIds.has(focusedIssueId)) return
    const client = getClient()
    const ops = client.apply('gantt-keyshift')
    await ops.update(i, {
      startDate: i.startDate + days * DAY_MS,
      dueDate: i.dueDate + days * DAY_MS
    })
    for (const child of descendantsWithDates(i, issues)) {
      await ops.update(child, {
        startDate: (child.startDate as number) + days * DAY_MS,
        dueDate: (child.dueDate as number) + days * DAY_MS
      })
    }
    const r = await ops.commit()
    if (!r.result) {
      const title = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(title, '', undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  function onKey (e: KeyboardEvent): void {
    // Only react when focus is inside the Gantt root — otherwise we'd hijack
    // global shortcuts.
    if (!(containerEl?.contains(document.activeElement) ?? false)) return
    if (e.key === 'Tab') {
      moveFocus(e.shiftKey ? -1 : 1)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowRight') {
      void shiftFocused(e.shiftKey ? 7 : 1)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowLeft') {
      void shiftFocused(e.shiftKey ? -7 : -1)
      e.preventDefault()
      return
    }
    if (e.key === 'Escape' && $activeDrag.kind !== 'idle') {
      activeDrag.set({ kind: 'idle' })
      e.preventDefault()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
  })
  onDestroy(() => {
    window.removeEventListener('keydown', onKey)
  })

  function jumpToToday (): void {
    if (hScrollEl === undefined) return
    const x = timeScale.toX(Date.now())
    hScrollEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'smooth' })
  }
  function pageScroll (dir: -1 | 1): void {
    if (hScrollEl === undefined) return
    hScrollEl.scrollBy({ left: dir * canvasViewportWidth * 0.8, behavior: 'smooth' })
  }
  function jumpToStart (): void {
    if (hScrollEl === undefined) return
    hScrollEl.scrollTo({ left: 0, behavior: 'smooth' })
  }
  function jumpToEnd (): void {
    if (hScrollEl === undefined) return
    hScrollEl.scrollTo({ left: hScrollEl.scrollWidth, behavior: 'smooth' })
  }
  function jumpToDate (iso: string): void {
    if (hScrollEl === undefined || iso === '') return
    const t = Date.parse(iso)
    if (isNaN(t)) return
    const x = timeScale.toX(t)
    hScrollEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'smooth' })
  }
  let datePickerValue: string = ''

  function formatRange (ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }

  // Custom horizontal scrollbar thumb geometry (proxy for hScrollEl).
  $: hTrackWidth = canvasViewportWidth > 0 ? canvasViewportWidth : 1
  $: hThumbWidth = totalCanvasWidth > 0
    ? Math.max(40, (hTrackWidth * hTrackWidth) / totalCanvasWidth)
    : hTrackWidth
  $: hThumbMax = Math.max(0, hTrackWidth - hThumbWidth)
  $: hScrollMax = Math.max(1, totalCanvasWidth - hTrackWidth)
  $: hThumbLeft = canvasViewportLeft <= 0 ? 0 : (canvasViewportLeft / hScrollMax) * hThumbMax
  $: hHasOverflow = totalCanvasWidth > hTrackWidth + 1

  // Custom vertical scrollbar thumb geometry (proxy for the existing
  // gantt-scroller native scrollTop — Huly globally hides native bars
  // so we render our own in DOM and let the native bar drive scrollTop).
  $: vTrackHeight = viewportHeight > 0 ? viewportHeight : 1
  $: vTotalHeight = ROW_HEIGHT * rows.length + HEADER_HEIGHT
  $: vThumbHeight = vTotalHeight > 0
    ? Math.max(40, (vTrackHeight * vTrackHeight) / vTotalHeight)
    : vTrackHeight
  $: vThumbMax = Math.max(0, vTrackHeight - vThumbHeight)
  $: vScrollMax = Math.max(1, vTotalHeight - vTrackHeight)
  $: vThumbTop = scrollTop <= 0 ? 0 : (scrollTop / vScrollMax) * vThumbMax
  $: vHasOverflow = vTotalHeight > vTrackHeight + 1

  let dragVThumb = false
  let dragVThumbStartY = 0
  let dragVThumbStartScroll = 0
  function onVThumbDragStart (e: PointerEvent): void {
    e.stopPropagation()
    e.preventDefault()
    if (scrollerEl === undefined) return
    dragVThumb = true
    dragVThumbStartY = e.clientY
    dragVThumbStartScroll = scrollerEl.scrollTop
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onVThumbDragMove (e: PointerEvent): void {
    if (!dragVThumb || scrollerEl === undefined) return
    const dy = e.clientY - dragVThumbStartY
    const ratio = vThumbMax > 0 ? dy / vThumbMax : 0
    scrollerEl.scrollTop = dragVThumbStartScroll + ratio * vScrollMax
  }
  function onVThumbDragEnd (e: PointerEvent): void {
    if (!dragVThumb) return
    dragVThumb = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  let dragThumb = false
  let dragThumbStartX = 0
  let dragThumbStartScroll = 0
  function onThumbDragStart (e: PointerEvent): void {
    e.stopPropagation()
    e.preventDefault()
    if (hScrollEl === undefined) return
    dragThumb = true
    dragThumbStartX = e.clientX
    dragThumbStartScroll = hScrollEl.scrollLeft
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onThumbDragMove (e: PointerEvent): void {
    if (!dragThumb || hScrollEl === undefined) return
    const dx = e.clientX - dragThumbStartX
    const ratio = hThumbMax > 0 ? dx / hThumbMax : 0
    hScrollEl.scrollLeft = dragThumbStartScroll + ratio * hScrollMax
  }
  function onThumbDragEnd (e: PointerEvent): void {
    if (!dragThumb) return
    dragThumb = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }
  function onProxyTrackClick (e: PointerEvent): void {
    // Click on track (not thumb): page-scroll towards click position.
    if ((e.target as HTMLElement).classList.contains('hscroll-thumb')) return
    if (hScrollEl === undefined) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const dir = clickX < hThumbLeft ? -1 : 1
    hScrollEl.scrollBy({ left: dir * hTrackWidth * 0.8, behavior: 'smooth' })
  }

  // Wheel-forwarding is no longer needed: sidebar lives inside the same
  // .gantt-scroller as the canvas, with position:sticky;left:0. Browser
  // handles native scrolling at the right speed regardless of where the
  // mouse hovers inside the scroller.

  // Click-and-drag panning across empty canvas area.
  let panning = false
  let panStartX = 0
  let panStartY = 0
  let panStartScrollLeft = 0
  let panStartScrollTop = 0
  function onCanvasPanStart (e: PointerEvent): void {
    if (scrollerEl === undefined || hScrollEl === undefined) return
    // Only pan with primary mouse button on empty space — let SVG/HTML
    // children (bars, buttons, links, resize-handle) handle their own
    // click/drag without competing with the canvas pan.
    const target = e.target as HTMLElement
    // Sidebar-cell + drag-grip + resize-handle excluded so the sidebar's
    // unscheduled-drag-grip doesn't compete with canvas pan for the same
    // pointerdown. Codex review 2026-05-11.
    if (target.closest('.bar-wrap, .sidebar-cell, .drag-grip, .resize-handle, button, a, .toggle-btn, .jump-btn, .settings-popover, .resize-cell')) return
    panning = true
    panStartX = e.clientX
    panStartY = e.clientY
    panStartScrollLeft = hScrollEl.scrollLeft
    panStartScrollTop = scrollerEl.scrollTop
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onCanvasPanMove (e: PointerEvent): void {
    if (!panning || scrollerEl === undefined || hScrollEl === undefined) return
    hScrollEl.scrollLeft = panStartScrollLeft - (e.clientX - panStartX)
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
    e.stopPropagation()
    e.preventDefault()
    resizing = true
    resizeStartX = e.clientX
    resizeStartWidth = userSidebarWidth
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onResizeMove (e: PointerEvent): void {
    if (!resizing) return
    e.stopPropagation()
    const next = resizeStartWidth + (e.clientX - resizeStartX)
    userSidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, next))
  }
  function onResizeEnd (e: PointerEvent): void {
    if (!resizing) return
    e.stopPropagation()
    resizing = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    queueMicrotask(syncViewport)
  }

  let resizeObs: ResizeObserver | undefined
  function syncViewport (): void {
    if (scrollerEl !== undefined) {
      scrollTop = scrollerEl.scrollTop
      viewportHeight = scrollerEl.clientHeight
    }
    if (hScrollEl !== undefined) {
      canvasViewportLeft = hScrollEl.scrollLeft
      canvasViewportWidth = hScrollEl.clientWidth
    }
  }
  onMount(() => {
    syncViewport()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => syncViewport())
      if (scrollerEl !== undefined) resizeObs.observe(scrollerEl)
      if (hScrollEl !== undefined) resizeObs.observe(hScrollEl)
    }
  })
  onDestroy(() => {
    resizeObs?.disconnect()
  })

  $: viewport = { left: canvasViewportLeft, right: canvasViewportLeft + canvasViewportWidth }
  $: sidebarWidthPx = (showIssueCode || showTitle || showStatus) ? userSidebarWidth : 60

  $: loading = loadingIssues || loadingMilestones
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="gantt-root" tabindex="0" bind:this={containerEl}>
  {#if loading}
    <Loading />
  {:else}
    <div class="gantt-toolbar" style="height: {TOOLBAR_HEIGHT}px;">
      <div class="toolbar-left">
        <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttJumpToStart }} on:click={jumpToStart}>
          <Icon icon={ArrowLeft} size="small" />
        </button>
        <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttPreviousPeriod }} on:click={() => pageScroll(-1)}>
          <Icon icon={NavPrev} size="small" />
        </button>
        <button class="nav-btn today-btn" type="button" on:click={jumpToToday}>
          <Label label={tracker.string.GanttToday} />
        </button>
        <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttNextPeriod }} on:click={() => pageScroll(1)}>
          <Icon icon={NavNext} size="small" />
        </button>
        <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttJumpToEnd }} on:click={jumpToEnd}>
          <Icon icon={ArrowRight} size="small" />
        </button>
        <label class="date-input-wrap" use:tooltip={{ label: tracker.string.GanttJumpToDate }}>
          <Icon icon={Calendar} size="small" />
          <input
            type="date"
            class="date-input"
            bind:value={datePickerValue}
            on:change={() => jumpToDate(datePickerValue)}
          />
        </label>
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
      <div class="toolbar-right" />
    </div>

    <!-- Plane-style two-axis scrolling: gantt-scroller handles vertical only,
         while a separate sticky-bottom proxy bar handles horizontal so the
         user always sees the time-scale scrollbar at the bottom of the
         visible viewport instead of at the bottom of the entire content. -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="gantt-scroller"
      class:panning
      bind:this={scrollerEl}
      on:scroll={handleVScroll}
      on:pointerdown={onCanvasPanStart}
      on:pointermove={onCanvasPanMove}
      on:pointerup={onCanvasPanEnd}
      on:pointercancel={onCanvasPanEnd}
    >
      <div
        class="gantt-grid"
        style="grid-template-columns: {sidebarWidthPx}px 5px 1fr; --sidebar-w: {sidebarWidthPx}px;"
      >
        <!-- Row 1: corner / resize-corner / time-axis header (all sticky-top).
             The corner shows column labels on the top half + an inline
             date-range navigation strip on the bottom half (). -->
        <div class="cell corner" style="height: {HEADER_HEIGHT}px;">
          <div class="corner-cols">
            <span class="col-toggle" />
            {#if showStatus}<span class="col-status" />{/if}
            {#if showIssueCode}<span class="col-id"><Label label={tracker.string.Issue} /></span>{/if}
            {#if showTitle}<span class="col-title"><Label label={tracker.string.Title} /></span>{/if}
            <span class="col-jump" />
          </div>
          <div class="corner-range">
            <button class="range-nav" type="button"
              use:tooltip={{ label: tracker.string.GanttPreviousPeriod }}
              on:click={() => pageScroll(-1)}>«</button>
            <span class="range-text" on:click={jumpToToday} on:keydown={(e) => { if (e.key === 'Enter') jumpToToday() }} role="button" tabindex="0">
              {formatRange(dateRange.from)} – {formatRange(dateRange.to)}
            </span>
            <button class="range-nav" type="button"
              use:tooltip={{ label: tracker.string.GanttNextPeriod }}
              on:click={() => pageScroll(1)}>»</button>
          </div>
        </div>
        <div class="cell resize-corner" style="height: {HEADER_HEIGHT}px;" />
        <div class="cell header-cell" style="height: {HEADER_HEIGHT}px;">
          <div class="hscroll-inner" style="width: {totalCanvasWidth}px; transform: translateX(-{canvasViewportLeft}px);">
            <GanttHeader {timeScale} {viewport} totalWidth={totalCanvasWidth} height={HEADER_HEIGHT} />
          </div>
        </div>
        <!-- Row 2: sidebar (sticky-left) / resize handle (sticky-left) / canvas -->
        <div class="cell sidebar-cell">
          <GanttSidebar
            {rows}
            width={sidebarWidthPx}
            {timeScale}
            viewportLeft={viewport.left}
            viewportRight={viewport.right}
            {showIssueCode}
            {showTitle}
            {showStatus}
            {hoveredRowId}
            {activeDrag}
            on:jump={onJump}
            on:toggle={onToggle}
            on:openIssue={onIssueOpen}
            on:hoverRow={onRowHover}
            on:addIssue={newIssue}
            on:rowContextMenu={handleRowContextMenu}
            on:rowDragStart={handleRowDragStart}
          />
        </div>
        <div
          class="cell resize-cell"
          class:active={resizing}
          on:pointerdown={onResizeStart}
          on:pointermove={onResizeMove}
          on:pointerup={onResizeEnd}
          on:pointercancel={onResizeEnd}
        />
        <div class="cell canvas-cell">
          <div class="hscroll-inner" style="width: {totalCanvasWidth}px; transform: translateX(-{canvasViewportLeft}px);">
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
              {statusCategoryMap}
              {editableIssueIds}
              {activeDrag}
              {focusedIssueId}
              on:openIssue={onIssueOpen}
              on:hoverRow={onRowHover}
              on:barMouseDown={handleBarMouseDown}
              on:contextMenu={handleBarContextMenu}
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Custom vertical scrollbar — DOM thumb absolutely positioned at
         the right edge of gantt-root so Huly's globally-hidden native
         bar doesn't deny the user a visible scroll affordance. -->
    {#if vHasOverflow}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="gantt-vscrollbar"
        style="top: {TOOLBAR_HEIGHT}px; bottom: 11px;">
        <div
          class="vscroll-thumb"
          style="top: {vThumbTop}px; height: {vThumbHeight}px;"
          on:pointerdown={onVThumbDragStart}
          on:pointermove={onVThumbDragMove}
          on:pointerup={onVThumbDragEnd}
          on:pointercancel={onVThumbDragEnd}
        />
      </div>
    {/if}
    <!-- Sticky-bottom horizontal scrollbar proxy. Only rendered when
         the canvas actually overflows; otherwise the track is dead
         visual noise and the thumb math goes degenerate. Thumb is a
         sibling of the (hidden-native-scrollbar) track so it stays in
         viewport coordinates instead of being carried by
         track.scrollLeft. -->
    {#if hHasOverflow}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="gantt-hscrollbar"
        style="padding-left: {sidebarWidthPx + 5}px;"
      >
        <div class="hscroll-shell">
          <div
            class="hscroll-track-custom"
            bind:this={hScrollEl}
            on:scroll={handleHScroll}
            on:pointerdown={onProxyTrackClick}
          >
            <div class="hscroll-spacer" style="width: {totalCanvasWidth}px;" />
          </div>
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="hscroll-thumb"
            style="left: {hThumbLeft}px; width: {Math.min(hThumbWidth, hTrackWidth)}px;"
            on:pointerdown={onThumbDragStart}
            on:pointermove={onThumbDragMove}
            on:pointerup={onThumbDragEnd}
            on:pointercancel={onThumbDragEnd}
          />
        </div>
      </div>
    {/if}
    {#if tooltipState.visible && tooltipState.row !== null}
      {@const row = tooltipState.row}
      {@const issue = row.issue}
      {@const ms = row.milestone}
      <div
        class="hover-tooltip"
        style="left: {tooltipState.x + 14}px; top: {tooltipState.y + 14}px;"
      >
        {#if row.kind === 'milestone' && ms !== null}
          <div class="tt-head">◆ <Label label={tracker.string.Milestone} /></div>
          <div class="tt-title">{ms.label}</div>
          {#if ms.startDate !== null}
            <div class="tt-line"><Label label={tracker.string.StartDate} />: {new Date(ms.startDate).toISOString().slice(0, 10)}</div>
          {/if}
          <div class="tt-line"><Label label={tracker.string.TargetDate} />: {new Date(ms.targetDate).toISOString().slice(0, 10)}</div>
        {:else if issue !== null}
          {@const code = issueCode(issue)}
          <div class="tt-head">{code}</div>
          <div class="tt-title">{issue.title}</div>
          {#if issue.startDate !== null}
            <div class="tt-line"><Label label={tracker.string.StartDate} />: {new Date(issue.startDate).toISOString().slice(0, 10)}</div>
          {/if}
          {#if issue.dueDate !== null}
            <div class="tt-line"><Label label={tracker.string.DueDate} />: {new Date(issue.dueDate).toISOString().slice(0, 10)}</div>
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
    position: relative;
    outline: none;
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
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .date-input-wrap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    margin-left: 8px;
    padding: 0 6px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    border-radius: 4px;
    cursor: pointer;
  }
  .date-input {
    height: 22px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--theme-content-color);
    font-size: 12px;
    cursor: pointer;
    outline: none;
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
  .gantt-scroller {
    flex: 1 1 auto;
    overflow-x: hidden;
    overflow-y: auto;
    min-width: 0;
    min-height: 0;
    cursor: grab;
    /* Reserve space at the bottom + right so the absolute scrollbars
       never paint over the canvas area. */
    padding-bottom: 11px;
    padding-right: 10px;
  }
  .gantt-scroller.panning {
    cursor: grabbing;
  }
  .gantt-grid {
    display: grid;
    /* grid-template-columns set inline */
    grid-template-rows: auto auto;
    width: 100%;
  }
  .header-cell, .canvas-cell { overflow: hidden; }
  .hscroll-inner { will-change: transform; }
  /* robustness fix: absolutely-pin the bar at the bottom of
     gantt-root instead of relying on the flex chain to enforce a
     constrained height. This way the bar can never slip below the
     visible viewport even if a parent forgets to set min-height:0. */
  .gantt-hscrollbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    height: 10px;
    border-top: 1px solid var(--theme-divider-color);
    background: var(--theme-bg-color);
    display: flex;
    box-sizing: border-box;
  }
  /* Custom horizontal scrollbar — DOM-based thumb sits on top of a
     hidden native scroll track. Bypasses Huly's global
     `* { scrollbar-width: none }` and any browser overlay-scrollbar
     differences so the bar is unambiguously visible. */
  .hscroll-shell {
    flex: 1 1 0;
    min-width: 0;
    position: relative;
    height: 100%;
    overflow: hidden;
  }
  .hscroll-track-custom {
    width: 100%;
    height: 100%;
    overflow-x: scroll;
    overflow-y: hidden;
    scrollbar-width: none;            /* Firefox: hide native */
  }
  .hscroll-track-custom::-webkit-scrollbar { display: none; } /* WebKit: hide */
  .hscroll-spacer { height: 1px; }
  .hscroll-thumb {
    position: absolute;
    top: 1px;
    bottom: 1px;
    background: var(--theme-content-color, #4b5563);
    opacity: 0.45;
    border-radius: 4px;
    cursor: grab;
    pointer-events: auto;
    transition: opacity 100ms ease, background 100ms ease;
  }
  .hscroll-thumb:hover { opacity: 0.85; background: var(--theme-state-info-color, #6366f1); }
  .hscroll-thumb:active { cursor: grabbing; opacity: 1; background: var(--theme-state-info-color, #6366f1); }
  /* Vertical scrollbar — same DOM-thumb pattern, anchored at the right
     edge of gantt-root between the toolbar and the horizontal bar. */
  .gantt-vscrollbar {
    position: absolute;
    right: 0;
    width: 10px;
    background: var(--theme-bg-color);
    border-left: 1px solid var(--theme-divider-color);
    box-sizing: border-box;
    z-index: 10;
  }
  .vscroll-thumb {
    position: absolute;
    left: 1px;
    right: 1px;
    background: var(--theme-content-color, #4b5563);
    opacity: 0.45;
    border-radius: 4px;
    cursor: grab;
    pointer-events: auto;
    transition: opacity 100ms ease, background 100ms ease;
  }
  .vscroll-thumb:hover { opacity: 0.85; background: var(--theme-state-info-color, #6366f1); }
  .vscroll-thumb:active { cursor: grabbing; opacity: 1; background: var(--theme-state-info-color, #6366f1); }
  .cell {
    box-sizing: border-box;
  }
  .corner {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 4;
    display: flex;
    flex-direction: column;
    background: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);
    border-right: 1px solid var(--theme-divider-color);
  }
  .corner-cols {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px 2px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-darker-color);
    letter-spacing: 0.05em;
  }
  .corner-range {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 2px 8px 4px;
    font-size: 12px;
    color: var(--theme-content-color);
  }
  .range-nav {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--theme-divider-color);
    background: transparent;
    color: var(--theme-darker-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  .range-nav:hover { background: var(--theme-button-hovered); }
  .range-text {
    cursor: pointer;
    user-select: none;
    font-weight: 500;
  }
  .range-text:hover { color: var(--theme-state-info-color, #6366f1); text-decoration: underline; }
  .corner .col-toggle { flex: 0 0 18px; }
  .corner .col-status { flex: 0 0 22px; }
  .corner .col-id { flex: 0 0 80px; }
  .corner .col-title { flex: 1 1 auto; }
  .corner .col-jump { flex: 0 0 28px; }
  .resize-corner {
    position: sticky;
    top: 0;
    z-index: 3;
    background: var(--theme-divider-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .header-cell {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .sidebar-cell {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--theme-comp-header-color);
    border-right: 1px solid var(--theme-divider-color);
  }
  .resize-cell {
    position: sticky;
    left: var(--sidebar-w, 280px);
    z-index: 2;
    background: var(--theme-divider-color);
    cursor: col-resize;
    transition: background 80ms ease;
    user-select: none;
    touch-action: none;
  }
  .resize-cell:hover, .resize-cell.active {
    background: var(--theme-state-info-color, #6366f1);
  }
  .canvas-cell {
    position: relative;
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
