<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { type ApplyOperations, type Class, type Doc, type DocumentQuery, generateId, getCurrentAccount, type Ref, type Space, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { type Component, type Issue, type IssueRelation, type Milestone, type Project, type WorkingDaysConfig, IssuePriority } from '@hcengineering/tracker'
  import { type TagElement } from '@hcengineering/tags'
  import { type Person } from '@hcengineering/contact'
  import tags from '@hcengineering/tags'
  import contact from '@hcengineering/contact'
  import { issuePriorities } from '../../types'
  import { connectedIssueIds } from './lib/dependency-router'
  import { wouldCreateCycle, simulateCascade, addScheduleDays } from './lib/scheduler'
  import { newCascadeToken } from './lib/cascade-token'
  import { sendDependencyShiftedNotifications } from './lib/dependency-shift-send'
  import { toggleSelection, selectRange, selectAll, clearSelection } from './lib/bulk-selection'
  import { computeBulkDeltaBounds } from './lib/bulk-boundary'
  import { fsAnchor, ssAnchor, ffAnchor, sfAnchor } from './lib/working-days'
  import { computeCriticalPath } from './lib/critical-path'
  import type { CriticalPathResult } from './lib/types'
  import { exportElementAndDownloadPng, exportElementToPdf } from './lib/exporter'
  import { ganttToolbarApi } from './lib/gantt-toolbar-bus'
  import GanttHelpPopup from './GanttHelpPopup.svelte'
  import GanttQuickInfoPopup from './GanttQuickInfoPopup.svelte'
  import type { PrimaryEdit, SimulateResult, CascadeShift } from './lib/types'
  import ConfirmCascadePopup from './ConfirmCascadePopup.svelte'
  import DependencyEditor from '../DependencyEditor.svelte'
  import EditMilestone from '../milestones/EditMilestone.svelte'
  import { Loading, addNotification, NotificationSeverity } from '@hcengineering/ui'
  import { translate } from '@hcengineering/platform'
  import { type FilteredView, type Viewlet, type ViewOptions } from '@hcengineering/view'
  import view from '@hcengineering/view'
  import { selectedFilterStore } from '@hcengineering/view-resources'
  import core from '@hcengineering/core'
  import { getCurrentResolvedLocation } from '@hcengineering/ui'
  import { onDestroy, onMount, tick } from 'svelte'
  import { writable } from 'svelte/store'
  import tracker from '../../plugin'
  import { canEditIssue, canEditMilestone } from '../../utils'
  import GanttCanvas from './GanttCanvas.svelte'
  import GanttConfirmCommitPopup from './GanttConfirmCommitPopup.svelte'
  import GanttHeader from './GanttHeader.svelte'
  import GanttSaveViewPopup from './GanttSaveViewPopup.svelte'
  import GanttSidebar from './GanttSidebar.svelte'
  import {
    extractGanttSavedView,
    isoDateForTimestamp,
    mergeGanttSavedView,
    timestampForIsoDate
  } from './lib/gantt-view-options'
  import { filterGanttFilteredViews } from './lib/saved-views'
  import { DEFAULT_COLUMNS, DEFAULT_WIDTHS, computeTotalWidth, type SidebarColumnKey } from './lib/sidebar-columns'
  import { setConfirming, isConfirming } from './lib/confirm-gate'
  import { cycleSort, comparatorFor, type GanttSortState } from './lib/sidebar-sort'
  import { createTreeExpandStore, type TreeExpandStore } from './lib/tree-expand-store'
  import { GROUP_BY_KEYS, type GroupByKey } from './lib/group-by'
  import { buildGroupedRows, groupRowsToLayoutRows } from './lib/build-rows'
  // v121.3-E — GanttFilter / applyFilter removed in favour of the standard
  // FilterBar (FilterButton in IssuesView.svelte). The standard filter
  // flows into `query` via `resultQuery`, so the issue-side filtering is
  // already done at the data-query layer. `lib/filter-predicate` is
  // retained for ad-hoc future use but no longer wired into the Gantt
  // toolbar — the toolbar Filter button + Ctrl+F popup were redundant
  // with the FilterBar and confused users (two state-sets per session).
  import { UndoManager, type UndoEntry, type UndoResult } from './lib/undo-manager'
  import { createFlashStore, flashIssues } from './lib/flash-store'
  import { reduce } from './lib/drag-controller'
  import { buildLayout } from './lib/layout'
  import { shouldPromoteCanvasPan, shouldStartCanvasPan } from './lib/pan-target'
  import { descendantsWithDates } from './lib/scheduler'
  import { createTimeScale } from './lib/time-scale'
  import {
    applyWheelZoom,
    cursorAnchoredScrollLeft,
    pxPerDayToTickZoom,
    ZOOM_PX_PER_DAY
  } from './lib/zoom'
  // Tier-4 Item 13 — Mobile-Friendly Gantt.
  import { detectLayoutMode, type LayoutMode } from './lib/breakpoint'
  import {
    initial as pinchInitial,
    reducePinch,
    computePxPerDayFromRatio,
    type PinchState
  } from './lib/pinch-zoom'
  import { type DragState, type DragTarget, type LayoutRow, type MilestoneMarker, type SummaryRange, type ZoomLevel } from './lib/types'
  import { type BarLabelSlot } from './lib/bar-labels'
  import { computeAdaptivePxPerDay, computeCanvasRenderWidth, computeCanvasViewportWidth } from './lib/viewport'
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
  import IconUndo from '@hcengineering/ui/src/components/icons/Undo.svelte'
  import IconRedo from '@hcengineering/ui/src/components/icons/Redo.svelte'

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
  // Phase 2 — toolbar moved to IssuesView header; gantt-root now
  // starts directly with the canvas. Kept as 0 so the v-scrollbar
  // top offset math below stays simple.
  const TOOLBAR_HEIGHT = 0

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

  // PR 3 edit-mode state: a single source of truth for explicit drag/resize
  // interactions. Normal bar-body mouse drags are no longer issue moves; they
  // pan the canvas like empty-space drags (user feedback 2026-05-11).
  // GanttCanvas / GanttSidebar / GanttResizeOverlay subscribe to this store;
  // the reducer in lib/drag-controller.ts mutates it.
  // editableIssueIds gates the resize handles + the Set-start-date menu entry
  // per issue based on canEditIssue() (utils.ts:280).
  const activeDrag = writable<DragState>({ kind: 'idle' })
  // PR3.3: single Set holds editable Issue _ids AND Milestone _ids — both
  // are stringified Ref<...> so a single Set lookup serves the bar
  // editable={} flag for both row kinds without parallel data structures.
  let editableIssueIds: Set<string> = new Set()

  // PR4a: dependency state
  let relations: IssueRelation[] = []
  let optimisticRelations: IssueRelation[] = []
  // PR5: critical path + slack. ViewOptions toggle the visual layer;
  // the algorithm runs on every (issues, relations) change with a
  // 200 ms debounce so interactive drag updates settle quickly without
  // hammering the BFS per pointermove.
  let cpResult: CriticalPathResult = {
    critical: new Set(),
    criticalRelations: new Set(),
    slack: new Map(),
    violatedRelations: new Set(),
    cycle: false
  }
  let cpDirtyTimer: ReturnType<typeof setTimeout> | null = null
  let lastCpCycleNotifiedAt = 0
  let hoveredIssue: Ref<Issue> | null = null
  let hoveredEdge: { source: Ref<Issue>, target: Ref<Issue> } | null = null
  $: displayedRelations = [...relations, ...optimisticRelations.filter((pending) =>
    !relations.some((rel) => rel.attachedTo === pending.attachedTo && rel.target === pending.target && rel.kind === pending.kind)
  )]
  $: connectedIds = connectedIssueIds(hoveredIssue, hoveredEdge, displayedRelations)
  $: showPredecessors = ((viewOptions as Record<string, unknown>)?.ganttShowPredecessors ?? false) !== false

  /**
   * Two-stage edit gate (user feedback 2026-05-11): an unselected bar remains
   * a canvas-pan surface during click-and-hold, while a plain click arms it.
   * Once armed, body drag moves the issue/milestone and edge handles resize.
   */
  let selectedIssueId: string | null = null
  // Tier-2 Item 6 — Bulk-Select + Bulk-Drag.
  // Holds the multi-selection set as stringified issue ids so it can be
  // diffed cheaply against the bar's `String(row.issue._id)`. The
  // `selectedIssueId` flag stays separate because it governs the
  // single-bar "armed" cursor + resize-handle UI; multi-selected bars
  // share the outline but never expose resize. `lastClickedIssueId` is
  // the Shift-Click anchor (Spec §"Shift-Click").
  let multiSelectedIssueIds: Set<Ref<Issue>> = new Set()
  let lastClickedIssueId: Ref<Issue> | null = null
  let lastCanvasPanEndedAt = 0

  let canvasViewportLeft = 0
  let canvasViewportWidth = 1200
  let scrollTop = 0
  let viewportHeight = 600

  let containerEl: HTMLDivElement | undefined
  let scrollerEl: HTMLDivElement | null = null
  let hScrollEl: HTMLDivElement | null = null

  // Tier-4 Item 13 — Mobile-Friendly Gantt. layoutMode is driven by the
  // viewport width on mount + on resize. Phone (≤640) hides the sidebar
  // behind a slide-out drawer + gates the canvas to read-only; Tablet
  // (641-1024) keeps the full edit UX but routes touch-drag through a
  // long-press; Desktop (>1024) is the legacy behaviour bit-for-bit.
  let layoutMode: LayoutMode =
    typeof window !== 'undefined' ? detectLayoutMode(window.innerWidth) : 'desktop'
  let mobileDrawerOpen: boolean = false
  // Phone is strictly read-only (Spec §1). All drag/connector/resize
  // gates derive from this flag.
  $: phoneReadOnly = layoutMode === 'phone'

  // Pinch-zoom 2-pointer tracker. The reducer is pure; the wiring lives
  // in onScrollerPointerDown / Move / Up / Cancel below. Triggered on
  // touch input only (mouse + pen fall through to the existing wheel
  // zoom / click-drag handlers).
  let pinchState: PinchState = pinchInitial()

  let zoom: ZoomLevel = 'week'
  const ZOOM_LEVELS: readonly ZoomLevel[] = ['day', 'week', 'month', 'quarter']
  // v121.3-C — continuous Ctrl+Wheel zoom. `userPxPerDay` is the
  // single-source-of-truth for the horizontal scale when set; when null
  // we fall back to the preset table (`ZOOM_PX_PER_DAY[zoom]`). The
  // preset buttons clear the override; Ctrl+Wheel sets it.
  let userPxPerDay: number | null = null

  let userSidebarWidth: number = DEFAULT_SIDEBAR_WIDTH

  // Sidebar column visibility is wired to two ToggleViewOptions registered
  // in models/tracker/src/viewlets.ts (Customize-View dropdown). Issue-code
  // defaults OFF — the code is still surfaced in the hover tooltip.
  $: showIssueCode = (viewOptions as Record<string, unknown>)?.ganttShowIssueCode === true
  $: showTitle = ((viewOptions as Record<string, unknown>)?.ganttShowTitle ?? true) !== false
  $: showStatus = ((viewOptions as Record<string, unknown>)?.ganttShowStatus ?? true) !== false
  $: confirmMove = ((viewOptions as Record<string, unknown>)?.ganttConfirmMove ?? true) !== false
  $: confirmResize = ((viewOptions as Record<string, unknown>)?.ganttConfirmResize ?? true) !== false
  // PR5: critical-path + slack visualization. Toggled via the
  // Customize-view panel (same pattern as ganttConfirmMove etc.).
  $: showCriticalPath = ((viewOptions as Record<string, unknown>)?.ganttCriticalPath ?? false) === true
  $: showSlackColumn = ((viewOptions as Record<string, unknown>)?.ganttSlackColumn ?? false) === true
  // Phase 3a: extended sidebar grid. Toggled via Customize-view; default OFF
  // so existing users see the legacy compact layout. When ON, the sidebar
  // renders a sortable header row + per-column cells via GanttSidebarColumn.
  $: extendedColumns = ((viewOptions as Record<string, unknown>)?.ganttSidebarColumnsExtended ?? false) === true

  // Phase 3b — Filter-Bar + Group-By Swimlanes.
  // Both pieces of state are in-memory only for v1 (mirrors Phase 3a):
  // persisting them as workspace-stored ViewOptions is deferred to 3b.v2
  // once `view.update(...)` from a Svelte component is wired through the
  // Customize-view drawer's storage path. The current `viewOptions` prop
  // is read-only from this side.
  let ganttGroupBy: GroupByKey = (() => {
    const v = (viewOptions as Record<string, unknown>)?.ganttGroupBy
    return typeof v === 'string' && (GROUP_BY_KEYS as readonly string[]).includes(v) ? v as GroupByKey : 'none'
  })()
  let collapsedGroups: Set<string> = new Set()
  // v121.3-E — `ganttFilter` / `filterPopupOpen` / `filterCount` removed
  // with the gantt-toolbar Filter button. Filter state lives on the
  // standard FilterBar in IssuesView.svelte and reaches us via `query`.

  // Phase 3c — Undo/Redo. One manager per GanttView mount; the stack lives
  // in memory and is dropped on navigation-away (Spec §"Open Q2"). The
  // flash-store drives a transient highlight on bars touched by an undo/redo
  // so the user sees what just rolled back (Spec §"Visual Feedback").
  // TxOperations & Client has the structural subset UndoApplyClient needs;
  // the cast lives at the construction site so the manager itself stays free
  // of any tracker/core imports beyond pure types.
  const undoManager = new UndoManager(getClient() as unknown as ConstructorParameters<typeof UndoManager>[0])
  const canUndo = undoManager.canUndo
  const canRedo = undoManager.canRedo
  const nextUndoDescription = undoManager.nextUndoDescription
  const nextRedoDescription = undoManager.nextRedoDescription
  const undoFlashStore = createFlashStore()
  onDestroy(() => undoManager.clear())
  /**
   * When the user picks a new group-by mode, drop the collapsed-state — it
   * was indexed by keys from the previous mode and would either be a no-op
   * or accidentally collapse a same-named bucket in the new mode.
   */
  function setGroupBy (next: GroupByKey): void {
    if (next === ganttGroupBy) return
    ganttGroupBy = next
    collapsedGroups = new Set()
  }
  function toggleGroup (key: string): void {
    const next = new Set(collapsedGroups)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    collapsedGroups = next
  }
  function onGroupBySelectChange (e: Event): void {
    const target = e.target
    if (target instanceof HTMLSelectElement) {
      setGroupBy(target.value as GroupByKey)
    }
  }

  // 200 ms debounced recompute on issues / relations / toggle / cfg change.
  $: void scheduleCpRecompute(issues, relations, showCriticalPath, workingDaysCfg)

  function setZoom (z: ZoomLevel): void {
    zoom = z
    // v121.3-C — preset button clears any wheel-zoom override so the
    // canonical preset px/day takes over again.
    userPxPerDay = null
    if (hScrollEl != null) {
      hScrollEl.scrollLeft = 0
    }
    queueMicrotask(syncViewport)
  }

  // v121.3-C — derived px/day used by both the time-scale and the tick
  // generator: prefer the wheel-zoom override when set, else the preset.
  $: effectivePxPerDay = userPxPerDay !== null ? userPxPerDay : ZOOM_PX_PER_DAY[zoom]
  // Tick granularity follows pxPerDay (continuous zoom). On preset clicks
  // this resolves back to the matching ZoomLevel via the same table.
  $: tickZoomLevel = userPxPerDay !== null ? pxPerDayToTickZoom(userPxPerDay) : zoom

  // Tier-2 #7 — Saved Gantt-Views.
  // Re-hydrate the Gantt zoom + optional pan anchor from a FilteredView's
  // viewOptions blob. Called from the reactive `$selectedFilterStore`
  // block below. The reverse direction (writing) lives in
  // saveCurrentGanttView() / updateCurrentGanttView() further down.
  let lastAppliedSavedViewId: string | null = null
  async function applyGanttSavedView (raw: Record<string, unknown> | undefined): Promise<void> {
    const opts = extractGanttSavedView(raw)
    zoom = opts.zoomLevel
    userPxPerDay = null
    // Wait one tick so the new zoom propagates into `timeScale` before we
    // scroll — otherwise toX() uses the previous pxPerDay and the anchor
    // lands at the wrong column (Spec §"Pan-Anchor-Race bei langsamem Mount").
    await tick()
    if (opts.panAnchorDate !== undefined) {
      const t = timestampForIsoDate(opts.panAnchorDate)
      if (Number.isFinite(t) && hScrollEl != null) {
        const x = timeScale.toX(t)
        hScrollEl.scrollTo({ left: Math.max(0, x), behavior: 'auto' })
        queueMicrotask(syncViewport)
      }
    } else if (hScrollEl != null) {
      // No anchor → Today-center is the natural mount behaviour.
      const x = timeScale.toX(Date.now())
      hScrollEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'auto' })
      queueMicrotask(syncViewport)
    }
  }

  // Only react to FilteredViews whose viewletId matches our Gantt viewlet.
  // The SavedView sidebar in workbench-resources sets the store globally,
  // so we must guard against stale list/kanban view selections.
  $: {
    const fv = $selectedFilterStore
    const ourViewletId = viewlet?._id
    if (fv !== undefined && ourViewletId !== undefined && fv.viewletId === ourViewletId) {
      const idStr = String(fv._id)
      if (idStr !== lastAppliedSavedViewId) {
        lastAppliedSavedViewId = idStr
        void applyGanttSavedView(fv.viewOptions as Record<string, unknown> | undefined)
      }
    } else if (fv === undefined) {
      lastAppliedSavedViewId = null
    }
  }

  function buildSavedViewOptions (fixTimeWindow: boolean): Record<string, unknown> {
    const base = (viewOptions as Record<string, unknown> | undefined) ?? {}
    const payload: { zoomLevel: ZoomLevel, panAnchorDate?: string } = { zoomLevel: zoom }
    if (fixTimeWindow && hScrollEl != null) {
      // Anchor = the visible-left date in the time scale (UTC midnight).
      const t = timeScale.fromX(hScrollEl.scrollLeft)
      payload.panAnchorDate = isoDateForTimestamp(t)
    }
    return mergeGanttSavedView(base, payload)
  }

  async function saveCurrentGanttView (
    name: string,
    fixTimeWindow: boolean,
    sharable: boolean
  ): Promise<void> {
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    const viewletId = viewlet?._id
    if (viewletId === undefined) return
    const merged = buildSavedViewOptions(fixTimeWindow)
    const id = await getClient().createDoc(view.class.FilteredView, core.space.Workspace, {
      name,
      location: loc,
      filterClass: _class,
      filters: '[]',
      attachedTo: 'tracker',
      viewOptions: merged as unknown as ViewOptions,
      viewletId,
      sharable,
      users: [getCurrentAccount().uuid]
    })
    // Auto-select the freshly-created view so the modified-indicator clears.
    const created = await getClient().findOne(view.class.FilteredView, { _id: id })
    if (created !== undefined) {
      selectedFilterStore.set(created)
    }
  }

  async function updateCurrentGanttView (fv: FilteredView, fixTimeWindow: boolean): Promise<void> {
    const merged = buildSavedViewOptions(fixTimeWindow)
    await getClient().update(fv, { viewOptions: merged as unknown as ViewOptions })
    selectedFilterStore.set({ ...fv, viewOptions: merged as unknown as ViewOptions })
  }

  function openSaveViewPopup (): void {
    const cur = $selectedFilterStore
    const currentlyFixed = (cur?.viewletId === viewlet?._id)
      ? ((cur?.viewOptions as Record<string, unknown> | undefined)?.ganttPanAnchorDate !== undefined)
      : false
    showPopup(GanttSaveViewPopup, { fixTimeWindow: currentlyFixed }, 'top', (result) => {
      if (result === undefined) return
      const r = result as { name?: string, fixTimeWindow?: boolean, sharable?: boolean }
      if (r.name === undefined) return
      void saveCurrentGanttView(r.name, r.fixTimeWindow === true, r.sharable !== false)
    })
  }

  function onSavedViewSelectChange (e: Event): void {
    const target = e.target
    if (!(target instanceof HTMLSelectElement)) return
    const value = target.value
    if (value === '__NEW__') {
      // Reset the select before opening the popup so the dropdown reflects
      // the previous (or default) selection while the popup is open. The
      // popup callback re-sets selectedFilterStore on success.
      target.value = $selectedFilterStore?._id !== undefined && $selectedFilterStore.viewletId === viewlet?._id
        ? String($selectedFilterStore._id)
        : '__DEFAULT__'
      openSaveViewPopup()
      return
    }
    if (value === '__DEFAULT__') {
      selectedFilterStore.set(undefined)
      lastAppliedSavedViewId = null
      return
    }
    const next = allFilteredViews.find((v) => String(v._id) === value)
    if (next !== undefined) {
      selectedFilterStore.set(next)
    }
  }

  function isCurrentGanttViewModified (fv: FilteredView | undefined): boolean {
    if (fv === undefined || fv.viewletId !== viewlet?._id) return false
    const saved = (fv.viewOptions as Record<string, unknown> | undefined) ?? {}
    if (saved.ganttZoomLevel !== zoom) return true
    return false
  }

  $: savedViewModified = isCurrentGanttViewModified($selectedFilterStore)

  // Inline-extracted handler — keeping the TS cast out of an `on:click={…}`
  // attribute, which the Svelte 4 parser does not tolerate (Phase-Tier-2
  // build-fix: inline `as Record<…>` inside an attribute value tripped
  // `Unexpected token (ts)` during svelte-check).
  function onUpdateSavedViewClick (): void {
    const cur = $selectedFilterStore
    if (cur === undefined) return
    const opts = cur.viewOptions as Record<string, unknown> | undefined
    const fix = opts?.ganttPanAnchorDate !== undefined
    void updateCurrentGanttView(cur, fix)
  }

  const issueQuery = createQuery()
  const milestoneQuery = createQuery()
  const relationQuery = createQuery()
  const projectQuery = createQuery()
  // v121 fix — id→display-name lookups needed by group-by swimlanes so the
  // sidebar shows "Backend" instead of the raw Mongo-id "comp-1". The label
  // group needs TagElement.title (issue.labels is a TagReference[] keyed
  // by tag), so a separate query loads the TagElements directly.
  const componentQuery = createQuery()
  const personQuery = createQuery()
  const tagElementQuery = createQuery()
  let components: Component[] = []
  let persons: Person[] = []
  let tagElements: TagElement[] = []

  // Tier-2 #7 — Saved Gantt-Views.
  // Live-query every FilteredView the current account can see (the server
  // already enforces visibility via FilteredView's `users` field + sharable
  // flag — same as SavedView in workbench-resources). We then partition
  // client-side via the helper into (mine | shared) buckets, filtered to
  // our viewlet so a Gantt-view doesn't surface in a List/Kanban context.
  const filteredViewQuery = createQuery()
  let allFilteredViews: FilteredView[] = []
  $: filteredViewQuery.query(
    view.class.FilteredView,
    { attachedTo: 'tracker' },
    (res: FilteredView[]) => {
      allFilteredViews = res
    }
  )
  $: ganttBuckets = filterGanttFilteredViews(
    allFilteredViews,
    viewlet?._id ?? ('' as Ref<Viewlet>),
    getCurrentAccount().uuid as unknown as string
  )

  // Phase-2 working-days calendar. `undefined` keeps legacy calendar-day
  // semantics; an explicit config (week mask + holidays) makes the scheduler
  // and critical-path treat lag/slack in working days and paints non-working
  // days in the canvas background.
  let workingDaysCfg: WorkingDaysConfig | undefined = undefined
  $: if (space !== undefined) {
    projectQuery.query(
      tracker.class.Project,
      { _id: space as Ref<Project> },
      (res: Project[]) => {
        workingDaysCfg = res[0]?.workingDaysConfig
      },
      { limit: 1 }
    )
  } else {
    workingDaysCfg = undefined
  }

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
    // PR3.3: milestones share the same Set (their _ids are also branded
    // strings and don't collide with Issue _ids in practice — both are
    // ObjectId hex strings, and the Set lookup in GanttCanvas is just
    // 'has(String(id))').
    for (const m of milestones) {
      if (await canEditMilestone(m)) next.add(m._id as unknown as string)
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

  // v121 group-by lookup — components, persons, tag-labels live alongside
  // milestones. `space` scopes the query to the active project just like
  // milestones / issues. Persons are cross-project (no `space` filter).
  $: componentDocQuery = (space !== undefined ? { space } : {}) as DocumentQuery<Component>
  $: componentQuery.query(
    tracker.class.Component,
    componentDocQuery,
    (res: Component[]) => { components = res }
  )
  $: personQuery.query(
    contact.class.Person,
    {},
    (res: Person[]) => { persons = res }
  )
  $: tagElementQuery.query(
    tags.class.TagElement,
    { targetClass: tracker.class.Issue },
    (res: TagElement[]) => { tagElements = res }
  )

  $: relationDocQuery = (space !== undefined ? { space } : {}) as DocumentQuery<IssueRelation>
  // The Huly/CockroachDB adapter doesn't translate `$or` at the top level
  // (it stringifies it as a JSONB path and crashes). Query the entire
  // space's relations instead and let the dependency-layer filter
  // client-side via barRects (only relations whose endpoints are in
  // visible barRects get rendered). Relations are typically sparse so
  // this is cheap. Predecessor column does its own client-side filter.
  $: relationQuery.query(
    tracker.class.IssueRelation,
    relationDocQuery,
    (res: IssueRelation[]) => {
      relations = res
      optimisticRelations = optimisticRelations.filter((pending) =>
        !res.some((rel) => rel.attachedTo === pending.attachedTo && rel.target === pending.target && rel.kind === pending.kind)
      )
    }
  )

  // v121.3-C — padding follows the active tick granularity, so a
  // wheel-zoomed view also gets sensible left/right padding.
  $: dateRange = computeDateRange(issues, milestones, tickZoomLevel)

  // PR3.3: lookup so GanttCanvas can build a `DragTarget` for a milestone
  // bar without having to thread the full Milestone[] down.
  $: milestonesById = new Map<string, Milestone>(
    milestones.map((m) => [m._id as unknown as string, m])
  )

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

  // v121.3-C — base scale uses `effectivePxPerDay` (preset OR wheel-zoom
  // override) and `tickZoomLevel` for tick granularity. When the user has
  // an explicit override (Ctrl+Wheel), we skip the adaptive widen-to-fill
  // pass so the user's chosen scale is respected literally.
  $: baseTimeScale = createTimeScale(tickZoomLevel, dateRange.from, effectivePxPerDay)
  $: baseDataCanvasWidth = Math.max(
    1,
    Math.ceil(baseTimeScale.toX(dateRange.to) - baseTimeScale.toX(dateRange.from))
  )
  $: adaptivePxPerDay = userPxPerDay !== null
    ? effectivePxPerDay
    : computeAdaptivePxPerDay(baseTimeScale.pxPerDay, baseDataCanvasWidth, canvasViewportWidth)
  $: timeScale = createTimeScale(tickZoomLevel, dateRange.from, adaptivePxPerDay)
  $: milestoneMarkers = milestones.map<MilestoneMarker>(m => ({
    _id: m._id,
    label: m.label,
    startDate: (m as Milestone & { startDate: number | null }).startDate ?? null,
    targetDate: m.targetDate
  }))

  // Tier-4 Item 12 — Tree-View — persisted collapsed-row-id set per project.
  // The store is bound to the current project's localStorage key; switching
  // projects re-binds via the reactive block below. In SSR / test contexts
  // where `window` is undefined we fall back to an in-memory Set so the
  // component still mounts (and toggle is a no-op across reloads).
  let collapsedIds: Set<string> = new Set()
  let treeExpandStore: TreeExpandStore | null = null
  let treeExpandUnsub: (() => void) | null = null
  function bindTreeExpandStore (projectId: string | undefined): void {
    treeExpandUnsub?.()
    treeExpandUnsub = null
    if (projectId === undefined || typeof window === 'undefined') {
      treeExpandStore = null
      collapsedIds = new Set()
      return
    }
    treeExpandStore = createTreeExpandStore(projectId, window.localStorage)
    treeExpandUnsub = treeExpandStore.subscribe(set => { collapsedIds = set })
  }
  $: bindTreeExpandStore(space === undefined ? undefined : String(space))
  onDestroy(() => { treeExpandUnsub?.() })

  function onToggle (e: CustomEvent<{ id: string }>): void {
    // Phase 3b: group-header rows carry an `id` like "group:<key>". Route
    // those toggles into `collapsedGroups`, leaving the legacy issue and
    // milestone collapse state in the persisted tree-expand store.
    if (e.detail.id.startsWith('group:')) {
      toggleGroup(e.detail.id.slice('group:'.length))
      return
    }
    if (treeExpandStore !== null) {
      treeExpandStore.toggle(e.detail.id)
      return
    }
    const next = new Set(collapsedIds)
    if (next.has(e.detail.id)) next.delete(e.detail.id)
    else next.add(e.detail.id)
    collapsedIds = next
  }

  /** Tier-4 — Toolbar "Expand all" — flush every persisted collapsed entry. */
  function expandAllTree (): void {
    if (treeExpandStore !== null) treeExpandStore.expandAll()
    else collapsedIds = new Set()
  }
  /**
   * Tier-4 — Toolbar "Collapse all" — collapse every collapsible row in the
   * current layout. Derived from `rows` so that filter-hidden parents do not
   * get re-collapsed (otherwise re-expand would require digging into the
   * store-state to find ghost ids).
   */
  function collapseAllTree (): void {
    const ids: string[] = []
    for (const r of rows) {
      if (r.collapsible && !r.collapsed) ids.push(r.id)
      else if (r.collapsible && r.collapsed) ids.push(r.id)
    }
    if (treeExpandStore !== null) treeExpandStore.collapseAll(ids)
    else collapsedIds = new Set(ids)
  }

  // Phase 3b — apply the filter predicate to the raw issue feed BEFORE either
  // legacy buildLayout (hierarchy) or buildGroupedRows (swimlanes) runs. When
  // groupBy is active the hierarchy is intentionally flattened: sub-issues
  // appear in their own bucket per their own status/priority/assignee, not
  // under the parent (Spec §"Konflikt: Hierarchie vs Group-By"). The
  // milestone-row overlay path is similarly suppressed because lane-headers
  // already provide the visual grouping affordance.
  //
  // Tier-4 Item 12 — the legacy `buildLayout` path now receives the *un*-
  // filtered issue list together with a `matchedIds`-set and
  // `includeBreadcrumbs: true`. This lets non-matching parents be rendered
  // as filter-breadcrumbs (Spec §"Filter+Tree"). The group-by path keeps the
  // hard-filter behaviour since swimlanes have no parent-context to preserve.
  // v121.3-E — `filteredIssues` is now a thin alias for `issues` because
  // server-side filtering already happened in IssuesView.svelte via the
  // standard FilterBar resultQuery → GanttView `query` → issueQuery.query
  // path. `filterMatchIds` is also retired — without a client-side filter
  // there are no "filter-breadcrumb" parents to render, all issues we
  // hold are by definition matches. Downstream consumers keep using
  // `filteredIssues` so the rename surface stays small.
  $: filteredIssues = issues
  $: filterMatchIds = null as Set<string> | null

  // v121 fix — id→display-name lookup for group-by swimlanes. Built
  // reactively from the live stores; reading the wrong key just falls back
  // to the raw id which keeps the sidebar stable while data warms up.
  //
  // Priority names go in as the plain English strings from the bundled
  // `issuePriorities` table (Urgent/High/Medium/Low/No Priority); a fully
  // translated path would need an async pass — left for v2 because the
  // English strings are the same as the i18n `tracker.string` defaults.
  let priorityNames: Map<string, string> = new Map()
  $: void (async () => {
    const next = new Map<string, string>()
    for (const [p, meta] of Object.entries(issuePriorities)) {
      try {
        const label = await translate(meta.label, {}, undefined)
        next.set(String(p), label)
      } catch {
        next.set(String(p), String(meta.label))
      }
    }
    priorityNames = next
  })()
  $: groupNameLookup = (() => {
    const m = new Map<string, string>()
    // Status: live store keyed by Status._id, name is the display label.
    for (const [id, status] of $statusStore.byId.entries()) {
      const n = (status as { name?: string }).name
      if (typeof n === 'string' && n !== '') m.set(String(id), n)
    }
    // Priority (resolved async into priorityNames above).
    for (const [k, v] of priorityNames.entries()) m.set(k, v)
    // Component / Milestone: project-scoped live queries.
    for (const c of components) {
      if (c.label !== '' && c.label !== undefined) m.set(String(c._id), c.label)
    }
    for (const ms of milestones) {
      if (ms.label !== '' && ms.label !== undefined) m.set(String(ms._id), ms.label)
    }
    // Person (assignee).
    for (const p of persons) {
      if (p.name !== '' && p.name !== undefined) m.set(String(p._id), p.name)
    }
    // Tag elements (labels).
    for (const t of tagElements) {
      if (t.title !== '' && t.title !== undefined) m.set(String(t._id), t.title)
    }
    return m
  })()

  $: rows = (() => {
    if (ganttGroupBy === 'none') {
      // Tier-4 — within-level sort. Replaces the global post-pass sort that
      // previously flattened the hierarchy (`sortedRows` is now an identity
      // pass-through — kept for diff-stability with downstream consumers).
      const withinLevelCompare = extendedColumns && sidebarSort.column !== null
        ? comparatorFor(sidebarSort.column, sidebarSort.direction)
        : undefined
      return buildLayout(issues, milestoneMarkers, 'none', {
        rowHeight: ROW_HEIGHT,
        collapsedIds,
        matchedIds: filterMatchIds ?? undefined,
        includeBreadcrumbs: filterMatchIds !== null,
        withinLevelCompare
      })
    }
    // Phase-3a sort comparator (when active) is applied *within* each lane.
    const withinGroupCompare = extendedColumns && sidebarSort.column !== null
      ? comparatorFor(sidebarSort.column, sidebarSort.direction)
      : undefined
    const grouped = buildGroupedRows(filteredIssues, ganttGroupBy, {
      rowHeight: ROW_HEIGHT,
      collapsedGroups,
      withinGroupCompare,
      nameLookup: groupNameLookup
    })
    return groupRowsToLayoutRows(grouped)
  })()
  $: summaryRanges = computeSummaryRanges(rows, filteredIssues)
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

  // Stretch the time scale when the bounded data range is narrower than the
  // visible canvas. Otherwise the final quarter/month/day area is correct,
  // but empty whitespace still occupies the remaining right side.
  $: dataCanvasWidth = Math.max(
    1,
    Math.ceil(timeScale.toX(dateRange.to) - timeScale.toX(dateRange.from))
  )
  $: totalCanvasWidth = computeCanvasRenderWidth(dataCanvasWidth, canvasViewportWidth)

  /**
   * PR5: trigger a debounced critical-path recompute. The 200 ms delay is
   * from spec §6: drag interactions can fire dozens of updates per second
   * via reactive cascades, but the user only needs the CP overlay to
   * settle once dragging stops. On cycle detection we surface a banner
   * at most once per minute so a long-lived cycle doesn't flood the
   * notification tray.
   */
  function scheduleCpRecompute (
    _issues: Issue[],
    _relations: IssueRelation[],
    _show: boolean,
    _cfg: WorkingDaysConfig | undefined
  ): void {
    if (!showCriticalPath) {
      if (cpResult.critical.size > 0 || cpResult.cycle) {
        cpResult = {
          critical: new Set(),
          criticalRelations: new Set(),
          slack: new Map(),
          violatedRelations: new Set(),
          cycle: false
        }
      }
      return
    }
    if (cpDirtyTimer !== null) clearTimeout(cpDirtyTimer)
    cpDirtyTimer = setTimeout(() => {
      cpResult = computeCriticalPath(issues, relations, workingDaysCfg)
      cpDirtyTimer = null
      if (cpResult.cycle && Date.now() - lastCpCycleNotifiedAt > 60_000) {
        lastCpCycleNotifiedAt = Date.now()
        void (async () => {
          const t = await translate(tracker.string.CriticalPathCycle, {}, undefined)
          addNotification(t, '', undefined as any, undefined, NotificationSeverity.Warning)
        })()
      }
    }, 200)
  }

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
    if (hScrollEl != null) {
      hScrollEl.scrollTo({ left: Math.max(0, e.detail.x - 80), behavior: 'smooth' })
      // v121.3-B — see jumpToToday comment; force viewport resync so the
      // dependency-arrow visibility re-runs without waiting on pointermove.
      queueMicrotask(syncViewport)
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

  // PR3.2: open the EditMilestone popup when a milestone row is clicked in
  // the sidebar — user expects parity with the issue row's single-click
  // open behavior (feedback 2026-05-11). The sidebar carries a compact
  // MilestoneMarker, so resolve to the full Milestone from the live query
  // before passing it as the popup's `object` prop (EditMilestone reads
  // object.label / status / dates synchronously).
  function onMilestoneOpen (e: CustomEvent<{ milestoneId: Ref<Milestone> }>): void {
    const full = milestones.find((m) => m._id === e.detail.milestoneId)
    if (full === undefined) return
    showPopup(EditMilestone, { object: full }, 'middle')
  }

  function newIssue (): void {
    if (space === undefined) return
    showPopup(CreateIssue, { space, shouldSaveDraft: true }, 'top')
  }

  // -------------------------------------------------------------------------
  // PR 3 edit-mode: bar mousedown → reducer; window mousemove/mouseup; commit.
  // -------------------------------------------------------------------------

  function handleBarMouseDown (e: CustomEvent<{ target: DragTarget, edge: 'left' | 'right' | 'body', cursorX: number }>): void {
    const id = String(e.detail.target.doc._id)
    // Tier-2 Item 6 — Bulk-Drag arm-check.
    // If the bar is part of an active multi-selection of size ≥ 2 AND the
    // mousedown is on the body edge, we skip the legacy "arm-then-drag"
    // two-step and go straight to dragging-body with a co-drag payload.
    // The user already armed the bars via Cmd/Shift-click; requiring a
    // second click would defeat the point of bulk-select.
    const isBulkBodyDrag =
      e.detail.edge === 'body' &&
      e.detail.target.kind === 'issue' &&
      multiSelectedIssueIds.size >= 2 &&
      multiSelectedIssueIds.has(e.detail.target.doc._id as Ref<Issue>)
    if (!isBulkBodyDrag && selectedIssueId !== id) {
      selectedIssueId = id
      focusedIssueId = id
      return
    }
    // PR3.3: capture origin dates at the dispatch boundary so the doc-
    // agnostic reducer doesn't need to know which field on target.doc to
    // read. Milestone uses targetDate, Issue uses dueDate.
    const t = e.detail.target
    const originStart =
      t.kind === 'issue' ? (t.doc.startDate as number) : (t.doc.startDate as number)
    const originEnd =
      t.kind === 'issue' ? (t.doc.dueDate as number) : (t.doc.targetDate)
    // Guard: a milestone with startDate=null shouldn't reach this path — the
    // bar isn't rendered. Issue with null dates was already handled in PR3
    // (mousedown-unscheduled path).
    if (originStart == null || originEnd == null) return
    // Build co-drag payload for the bulk-drag branch. Members are every
    // selected issue with both dates set; the leading bar's id is included
    // too so the commit loop can iterate members uniformly without
    // special-casing it.
    let coDrag: { members: Array<{ issueId: Ref<Issue>, originStart: number, originEnd: number }>, minDeltaMs: number, maxDeltaMs: number } | undefined
    if (isBulkBodyDrag) {
      const memberIssues = issues.filter((i) =>
        multiSelectedIssueIds.has(i._id) && i.startDate != null && i.dueDate != null
      )
      if (memberIssues.length >= 2) {
        const bounds = computeBulkDeltaBounds(
          new Set(memberIssues.map((i) => i._id)),
          issues,
          relations,
          workingDaysCfg
        )
        coDrag = {
          members: memberIssues.map((i) => ({
            issueId: i._id,
            originStart: i.startDate as number,
            originEnd: i.dueDate as number
          })),
          minDeltaMs: bounds.minDeltaMs,
          maxDeltaMs: bounds.maxDeltaMs
        }
      }
    }
    activeDrag.update((s) => reduce(s, {
      type: 'mousedown-bar',
      target: t,
      originStart,
      originEnd,
      edge: e.detail.edge,
      cursorX: e.detail.cursorX,
      coDrag
    }, timeScale))
  }

  function handleBarClick (e: CustomEvent<{ target: DragTarget, metaKey: boolean, ctrlKey: boolean, shiftKey: boolean }>): void {
    // Pointer-driven canvas panning may still synthesize a click after
    // pointerup. Treat that click as part of the pan gesture, not as a
    // selection, so "hold and drag" does not arm the bar afterwards.
    if (Date.now() - lastCanvasPanEndedAt < 250) return
    const idStr = String(e.detail.target.doc._id)
    // Milestone clicks don't participate in Issue bulk-select (issue _ids
    // only). They still update the single-selection state for resize.
    if (e.detail.target.kind !== 'issue') {
      selectedIssueId = idStr
      focusedIssueId = idStr
      return
    }
    const id = e.detail.target.doc._id as Ref<Issue>
    // Tier-2 Item 6 — modifier-key routing.
    //   Cmd / Ctrl  → toggle this id in the multi-selection set.
    //   Shift       → range-select from the last clicked id to this one.
    //   plain       → drop multi-selection, single-select.
    if (e.detail.metaKey || e.detail.ctrlKey) {
      multiSelectedIssueIds = toggleSelection(multiSelectedIssueIds, id)
      lastClickedIssueId = id
      // Keep selectedIssueId pointing at the most recent click for the
      // single-bar resize / cursor affordance. When the user Cmd-clicks
      // a bar away, the next plain click clears multi anyway.
      selectedIssueId = idStr
      focusedIssueId = idStr
      return
    }
    if (e.detail.shiftKey) {
      multiSelectedIssueIds = selectRange(
        multiSelectedIssueIds,
        lastClickedIssueId,
        id,
        orderedSelectableIds
      )
      selectedIssueId = idStr
      focusedIssueId = idStr
      return
    }
    multiSelectedIssueIds = clearSelection()
    lastClickedIssueId = id
    selectedIssueId = idStr
    focusedIssueId = idStr
  }

  function handleConnectorDown (e: CustomEvent<{ source: Issue, originPx: { x: number, y: number } }>): void {
    activeDrag.update((s) => reduce(s, {
      type: 'mousedown-connector',
      source: e.detail.source,
      originPx: e.detail.originPx,
      cursorPx: e.detail.originPx
    }, timeScale))
    attachWindowDragListeners()
  }

  // Single entry point for connector-drag: GanttConnectorDot dispatches
  // 'connectorDown' via Svelte from one on:mousedown binding on its
  // hit-circle. Earlier drafts had three parallel pathways (template
  // binding + direct addEventListener inside the dot + document-level
  // capture-phase delegation), all of which fired concurrently and
  // produced double mousedown handling. Keep this handler the only one.

  function handleBarHover (e: CustomEvent<{ issue: Issue | null }>): void {
    hoveredIssue = (e.detail.issue?._id ?? null) as Ref<Issue> | null
  }

  function handleHoverEdge (e: CustomEvent<{ source: Ref<Issue>, target: Ref<Issue> } | null>): void {
    hoveredEdge = e.detail as { source: Ref<Issue>, target: Ref<Issue> } | null
  }

  /**
   * Tier-3 Item 5 — smooth-scroll the outer scroller to the row of the
   * given issue, called when the user clicks an off-viewport dependency
   * indicator triangle. Looks up the row's y in the current sorted layout
   * and scrolls so the row sits 1/3 down from the top of the viewport
   * (Asana / MS Project pattern — gives breathing room above + below).
   */
  function handleScrollToRow (e: CustomEvent<{ issue: Ref<Issue> }>): void {
    if (scrollerEl == null) return
    const targetId = String(e.detail.issue)
    const row = sortedRows.find((r) => r.issue !== null && String(r.issue._id) === targetId)
    if (row === undefined) return
    const targetTop = Math.max(0, row.y - scrollerEl.clientHeight / 3)
    scrollerEl.scrollTo({ top: targetTop, behavior: 'smooth' })
    // v121.3-B — Jump-to-Position arrows previously needed a pointermove
    // before dependency arrows to other rows showed up because the
    // programmatic vertical scroll did not always re-fire the scroll event
    // (no-op when target equals current top). Force a viewport resync so
    // depYBounds + classifyArrowVisibility re-run immediately.
    queueMicrotask(syncViewport)
  }

  function handleOpenEditor (e: CustomEvent<{ relation: IssueRelation }>): void {
    const rel = e.detail.relation
    // canEdit if the user can update the source issue (spec §1 decision A).
    const sourceIssue = issues.find((i) => i._id === rel.attachedTo)
    void (async () => {
      const canEdit = sourceIssue !== undefined ? await canEditIssue(sourceIssue) : false
      showPopup(DependencyEditor, { relation: rel, canEdit, undoManager }, 'middle')
    })()
  }

  /**
   * Clear selection when the user clicks outside any bar — e.g. on the
   * canvas background. Bar clicks stopPropagation, so this only fires for
   * clicks that didn't land on a bar.
   */
  function onBackgroundClick (e: MouseEvent): void {
    const target = e.target as HTMLElement | null
    if (target?.closest('.bar-wrap') !== null) return
    selectedIssueId = null
    focusedIssueId = null
    // Tier-2 Item 6: a click outside any bar also clears the multi-
    // selection, matching the spec's UI expectation that the "selection
    // mode" exits when the user clicks empty canvas.
    if (multiSelectedIssueIds.size > 0) multiSelectedIssueIds = clearSelection()
    lastClickedIssueId = null
  }

  /**
   * Translate the window-space `MouseEvent.clientX` into the canvas's content
   * coordinate. Used for `dragging-unscheduled` so the bar lands at the date
   * under the cursor, not at a delta from "today". Returns undefined when
   * the cursor is outside the canvas (e.g., still over the sidebar) so the
   * reducer keeps its default preview.
   */
  /** Width of the resize-cell (drag-handle column) between sidebar and canvas.
   *  The horizontal scrollbar already offsets by `sidebarWidthPx + 5` (see
   *  .gantt-hscrollbar padding-left), so the canvas content origin is at
   *  rect.left + sidebarWidthPx + this constant, not just sidebarWidthPx.
   *  Missing this offset produces an off-by-5 in unscheduled drag drop. */
  const RESIZE_CELL_W = 5

  function computeCanvasX (e: MouseEvent): number | undefined {
    if (scrollerEl == null) return undefined
    const rect = scrollerEl.getBoundingClientRect()
    const sidebarEdge = rect.left + sidebarWidthPx + RESIZE_CELL_W
    if (e.clientX < sidebarEdge) return undefined
    return e.clientX - sidebarEdge + canvasViewportLeft
  }

  function handleCanvasPointerMove (e: MouseEvent): void {
    // v121.2 — once a confirmation popup is open the drag preview must
    // freeze at the position the user released the bar. Without this
    // gate, every pointermove call into the reducer kept moving the
    // preview while the popup was visible (hover-bug).
    if (isConfirming()) return
    // PR4a: while connector-drawing, dispatch mousemove-connector with
    // svg-local cursorPx + the issue under the cursor. Coordinate frame
    // matches barRects (computed in GanttCanvas) so the live bezier
    // anchors correctly. document.elementFromPoint hits the bar's <rect>
    // through the .bar-wrap <g> whose data-issue-id was added in Task 15.
    const state = $activeDrag
    if (state.kind === 'connector-drawing' || state.kind === 'connector-target-hover') {
      const svg = scrollerEl?.querySelector('svg.gantt-canvas') as SVGSVGElement | null
      if (svg === null) return
      const svgRect = svg.getBoundingClientRect()
      const cursorPx = { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top }
      const hoveredEl = document.elementFromPoint(e.clientX, e.clientY)
      const issueId = hoveredEl?.closest('.bar-wrap')?.getAttribute('data-issue-id') as Ref<Issue> | null
      const hoveredBar = issueId !== null
        ? issues.find((i) => i._id === issueId) ?? null
        : null
      activeDrag.update((s) => reduce(s, {
        type: 'mousemove-connector',
        cursorPx,
        hoveredBar: hoveredBar !== null && hoveredBar._id !== state.source._id ? hoveredBar : null
      }, timeScale))
      return  // Don't also fire mousemove for bar drag
    }
    activeDrag.update((s) =>
      reduce(s, { type: 'mousemove', cursorX: e.clientX, canvasX: computeCanvasX(e) }, timeScale)
    )
  }

  async function handleCanvasPointerUp (e?: PointerEvent | MouseEvent): Promise<void> {
    // v121.2 — when a confirmation popup is up the user's click on the
    // Cancel / Apply button bubbles pointerup to the window. Without this
    // guard we'd re-enter the commit path while activeDrag is still in
    // `dragging-body`, opening a second popup on top of the first
    // (double-popup bug). The popup's own resolve handler is the single
    // exit point that releases the gate and decides commit/cancel.
    if (isConfirming()) return
    const state = $activeDrag
    if (state.kind === 'connector-drawing') {
      activeDrag.set({ kind: 'idle' })
      return
    }
    if (state.kind === 'connector-target-hover') {
      const src = state.source
      const tgt = state.target
      activeDrag.set({ kind: 'idle' })
      // Cycle check before any write. Spec §2 decision A (block + toast).
      if (wouldCreateCycle(src._id, tgt._id, relations)) {
        const title = await translate(tracker.string.DependencyCycle, {}, undefined)
        addNotification(title, '', undefined as any, undefined, NotificationSeverity.Error)
        return
      }
      const client = getClient()
      const ops = client.apply(undefined, 'gantt-dependency-create')
      // Phase 3c: pre-allocate the _id so the undo entry can carry the exact
      // doc that ends up in the DB. addCollection without an explicit id
      // generates internally but doesn't return it through a deterministic
      // path; the optimistic-relation match is too loose for undo to use as a
      // delete target (two FS-edges between the same pair would collide).
      const newRelationId = generateId<IssueRelation>()
      const optimistic = {
        _id: `gantt:optimistic:${String(src._id)}:${String(tgt._id)}:${Date.now()}`,
        _class: tracker.class.IssueRelation,
        space: src.space,
        attachedTo: src._id,
        target: tgt._id,
        kind: 'finish-to-start',
        lag: 0
      } as unknown as IssueRelation
      optimisticRelations = [...optimisticRelations, optimistic]
      await ops.addCollection(
        tracker.class.IssueRelation,
        src.space,
        src._id,
        tracker.class.Issue,
        'relations',
        { target: tgt._id, kind: 'finish-to-start', lag: 0 },
        newRelationId
      )
      const result = await ops.commit()
      if (!result.result) {
        optimisticRelations = optimisticRelations.filter((rel) => rel !== optimistic)
      } else {
        const now = Date.now()
        undoManager.push({
          kind: 'relation-create',
          relation: {
            _id: newRelationId,
            _class: tracker.class.IssueRelation,
            space: src.space,
            attachedTo: src._id,
            attachedToClass: tracker.class.Issue,
            collection: 'relations',
            target: tgt._id,
            kind: 'finish-to-start',
            lag: 0,
            modifiedOn: now,
            modifiedBy: optimistic.modifiedBy,
            createdOn: now,
            createdBy: optimistic.modifiedBy
          } as unknown as IssueRelation,
          description: `Create dependency ${String(src._id)} → ${String(tgt._id)}`
        })
      }
      return
    }
    if (state.kind === 'idle' || state.kind === 'hover-bar') {
      activeDrag.set({ kind: 'idle' })
      return
    }
    // Skip the confirmation prompt when the preview didn't actually change
    // anything (drag with zero-delta — e.g. mouseup without movement).
    const previewDelta = previewChangedFromOrigin(state)
    if (!previewDelta) {
      activeDrag.set({ kind: 'idle' })
      return
    }
    // Wrap the commit in the user-configurable confirmation dialog when the
    // matching ganttConfirm{Move,Resize} ViewOption is on (default-on).
    const needsConfirm =
      ((state.kind === 'dragging-body' || state.kind === 'dragging-unscheduled') && confirmMove) ||
      ((state.kind === 'resizing-left' || state.kind === 'resizing-right') && confirmResize)

    // dragging-unscheduled stays on the legacy confirm path because it does
    // NOT go through commitWithCascade (the issue had no dates, no relations
    // to cascade). Only cascade-eligible issue states are rerouted to
    // ConfirmCascadePopup. At this point state has been narrowed past
    // idle/hover-bar by the early return on line 613, and past
    // connector-drawing/connector-target-hover by the handlers earlier in
    // this function, so accessing state.target is type-safe.
    const cascadeEligibleIssue =
      (state.kind === 'dragging-body' || state.kind === 'resizing-left' || state.kind === 'resizing-right') &&
      state.target.kind === 'issue'

    // activeDrag is no longer reset at this point — neither for cascade
    // nor legacy paths. The bar must visually stay at its preview position
    // while ANY confirmation popup is open (cascade popup OR the legacy
    // GanttConfirmCommitPopup); springing back only when the user clicks
    // Cancel. Each downstream exit path (cascade-popup resultHandler,
    // askConfirm cancel/confirm, commit success/failure) is responsible
    // for releasing the preview.

    try {
      // For cascade-eligible issue states, ConfirmCascadePopup (or the
      // legacy GanttConfirmCommitPopup in the no-cascade case) is the single
      // confirmation point. For milestones and unscheduled-drag the existing
      // askConfirm path stays in use — but it now also defers the
      // bar-springs-back to *after* the popup resolves.
      if (needsConfirm && !cascadeEligibleIssue) {
        const proceed = await askConfirm(state)
        if (!proceed) {
          // User cancelled: bar springs back now.
          activeDrag.set({ kind: 'idle' })
          return
        }
      }
      await commitDrag(state, e)
      // commitDrag's legacy branches (milestone, dragging-unscheduled) set
      // activeDrag to idle themselves after their ops.commit() returns —
      // see commitDrag below. The cascade path (commitWithCascade) hands
      // off ownership to the popup resultHandler and only sets idle when
      // that handler fires, NOT when commitDrag returns. So we must NOT
      // unconditionally reset here: doing so would tear down the cascade
      // popup's preview the instant commitDrag returned (popup still open,
      // bar already springing back.
    } catch (err) {
      const title = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
      activeDrag.set({ kind: 'idle' })
    }
  }

  /** True when the preview window is different from the origin window. */
  function previewChangedFromOrigin (state: DragState): boolean {
    if (state.kind === 'dragging-body' || state.kind === 'dragging-unscheduled') {
      return state.previewStart !== state.originStart || state.previewEnd !== state.originEnd
    }
    if (state.kind === 'resizing-left') return state.previewStart !== state.originStart
    if (state.kind === 'resizing-right') return state.previewEnd !== state.originEnd
    return false
  }

  /**
   * Open the confirm dialog and resolve true on Apply / false on Cancel.
   * The popup dispatches `close` with a boolean payload, which Huly's
   * showPopup routes to the 4th-arg resultHandler.
   *
   * PR3.3: when the target is a Milestone, the confirm popup gets the
   * Milestone-shaped doc instead of an Issue. GanttConfirmCommitPopup
   * reads `issue.title` (or `issue.label`) and is already tolerant of
   * either field name — see its component header.
   */
  async function askConfirm (state: DragState): Promise<boolean> {
    // Narrow to drag/resize states that carry a `target` field.
    if (
      state.kind !== 'dragging-body' &&
      state.kind !== 'dragging-unscheduled' &&
      state.kind !== 'resizing-left' &&
      state.kind !== 'resizing-right'
    ) return false
    const newStart = state.kind === 'resizing-right' ? state.originStart : state.previewStart
    const newDue = state.kind === 'resizing-left' ? state.originEnd : state.previewEnd
    const kind: 'move' | 'resize' = state.kind === 'resizing-left' || state.kind === 'resizing-right' ? 'resize' : 'move'
    // v121.2 — gate further pointer input + re-entry of handleCanvasPointerUp
    // while the confirmation popup is visible. Without this, pointermove
    // keeps shoving the preview bar around (hover-bug) and the Cancel/Apply
    // button's mouseup re-fires handleCanvasPointerUp, opening a second
    // popup (double-popup bug). The flag is cleared inside the resolve
    // path below so any code path out of the popup releases the gate.
    setConfirming(true)
    return await new Promise<boolean>((resolve) => {
      showPopup(
        GanttConfirmCommitPopup,
        { issue: state.target.doc, kind, newStart, newDue },
        'top',
        (result: boolean | undefined) => {
          setConfirming(false)
          resolve(result === true)
        }
      )
    })
  }

  /**
   * Commit a drag for an Issue target. Mirrors the PR3 commit path; the
   * cascade walks descendant issues (parent → children shift by delta).
   */
  async function commitIssueDrag (state: DragState, target: { kind: 'issue', doc: Issue }, ops: ApplyOperations): Promise<void> {
    if (state.kind === 'dragging-body') {
      await ops.update(target.doc, { startDate: (state as any).previewStart, dueDate: (state as any).previewEnd })
      const delta = (state as any).previewStart - (state as any).originStart
      if (delta !== 0) {
        // Fetch the full space's issues here rather than reusing the
        // view-filtered `issues` array — otherwise children hidden by an
        // active Tracker filter wouldn't shift with the parent and the
        // tree would drift out of sync.
        const client = getClient()
        const allInSpace = await client.findAll(tracker.class.Issue, { space: target.doc.space })
        for (const child of descendantsWithDates(target.doc, allInSpace)) {
          await ops.update(child, {
            startDate: (child.startDate as number) + delta,
            dueDate: (child.dueDate as number) + delta
          })
        }
      }
    } else if (state.kind === 'dragging-unscheduled') {
      // Unscheduled-drag only schedules the parent issue. originStart is the
      // synthetic "today" anchor — using its delta to shift existing scheduled
      // descendants would move them by a wildly unrelated amount.
      // Descendants stay put; the user can drag the
      // (now-scheduled) parent again to do a coordinated shift.
      await ops.update(target.doc, { startDate: (state as any).previewStart, dueDate: (state as any).previewEnd })
    } else if (state.kind === 'resizing-left') {
      await ops.update(target.doc, { startDate: (state as any).previewStart })
    } else if (state.kind === 'resizing-right') {
      await ops.update(target.doc, { dueDate: (state as any).previewEnd })
    }
  }

  /**
   * Commit a drag for a Milestone target (PR3.3 2026-05-11).
   * Field mapping: Issue.dueDate ↔ Milestone.targetDate; startDate is shared.
   * Cascade (brainstorm decision B): when the milestone moves, all issues
   * assigned to it shift by the same delta along with their descendants.
   * No cascade for resize — only the milestone bounds change.
   */
  async function commitMilestoneDrag (state: DragState, target: { kind: 'milestone', doc: Milestone }, ops: ApplyOperations): Promise<void> {
    if (state.kind === 'dragging-body') {
      await ops.update(target.doc, { startDate: (state as any).previewStart, targetDate: (state as any).previewEnd })
      const delta = (state as any).previewStart - (state as any).originStart
      if (delta !== 0) {
        const client = getClient()
        const allInSpace = await client.findAll(tracker.class.Issue, { space: target.doc.space })
        const assigned = allInSpace.filter((i) =>
          (i as unknown as { milestone?: string | null }).milestone === target.doc._id
        )
        // Shift assigned issues + their descendants. Same dedup logic as
        // descendantsWithDates: only issues with both dates set get shifted.
        const shiftRoots = new Set<string>()
        const toShift: Issue[] = []
        for (const a of assigned) {
          if (a.startDate == null || a.dueDate == null) continue
          if (!shiftRoots.has(String(a._id))) {
            shiftRoots.add(String(a._id))
            toShift.push(a)
          }
          for (const child of descendantsWithDates(a, allInSpace)) {
            if (!shiftRoots.has(String(child._id))) {
              shiftRoots.add(String(child._id))
              toShift.push(child)
            }
          }
        }
        for (const i of toShift) {
          await ops.update(i, {
            startDate: (i.startDate as number) + delta,
            dueDate: (i.dueDate as number) + delta
          })
        }
      }
    } else if (state.kind === 'resizing-left') {
      await ops.update(target.doc, { startDate: (state as any).previewStart })
    } else if (state.kind === 'resizing-right') {
      await ops.update(target.doc, { targetDate: (state as any).previewEnd })
    }
    // Milestones can't enter dragging-unscheduled (no drag-grip in the
    // sidebar for them), so that branch is unreachable.
  }

  async function commitWithCascade (
    primaryEdits: PrimaryEdit[],
    altKey: boolean,
    space: Issue['space'],
    legacyConfirmKind: 'move' | 'resize' | 'none',
    /**
     * Tier-2 Item 6 — optional cascadeToken scope override. Bulk-drag
     * passes `'gantt-bulk-cascade'` so every Tx of one bulk-op shares the
     * same prefix downstream consumers (Tier-4 Item 14 notification batcher)
     * can correlate by. Default keeps the legacy scope strings.
     */
    cascadeScope?: string
  ): Promise<void> {
    const client = getClient()

    // Full-space lookup is needed for both branches — the alt-bypass branch
    // also needs to resolve hidden predecessors/successors when counting
    // direct violations, otherwise filter-hidden relations are invisible
    // to the warning banner.
    const allInSpace = await client.findAll(tracker.class.Issue, { space })
    const allByRef = new Map<Ref<Issue>, Issue>()
    for (const i of allInSpace) allByRef.set(i._id, i)

    if (altKey) {
      // Tier-2 Item 5 — cascadeToken plumbing. Tag every cascade-related
      // commit with a unique token (scope-string) so Tier-2 Item 6 (bulk-
      // drag) and Tier-4 Item 14 (cascade-shift notification) can correlate
      // every sub-Tx of one user-action to a single batch downstream.
      const cascadeToken = newCascadeToken(cascadeScope ?? 'gantt-cascade-bypass')
      const ops = client.apply(undefined, cascadeToken)
      for (const pe of primaryEdits) {
        await ops.update(pe.issue, { startDate: pe.newStart, dueDate: pe.newDue })
      }
      const undoEntry = buildDateUndoEntry(primaryEdits, [])
      const result = await ops.commit()
      if (!result.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        activeDrag.set({ kind: 'idle' })
        return
      }
      if (undoEntry !== null) undoManager.push(undoEntry)
      // Tier-4 Item 14 — send dependency-shift bundle notifications. Bypass
      // path: the user explicitly chose to ignore violations, so we still
      // notify watchers/assignees of the primary moves but skip cascade
      // shifts (there are none on the bypass branch).
      void emitDependencyShiftBundles(primaryEdits, [], cascadeToken)
      // Count direct violations against full-space relations + full-space issue dates.
      let violations = 0
      const primarySet = new Set(primaryEdits.map((p) => String(p.issue._id)))
      for (const pe of primaryEdits) {
        for (const r of relations) {
          const involvesPrimary = String(r.attachedTo) === String(pe.issue._id) || String(r.target) === String(pe.issue._id)
          if (!involvesPrimary) continue
          const otherRef = String(r.attachedTo) === String(pe.issue._id) ? r.target : r.attachedTo
          if (primarySet.has(String(otherRef))) continue
          const otherIssue = allByRef.get(otherRef as Ref<Issue>)
          if (otherIssue === undefined || otherIssue.startDate == null || otherIssue.dueDate == null) continue
          if (!relationSatisfied(r, pe, otherIssue)) violations++
        }
      }
      if (violations > 0) {
        const t = await translate(tracker.string.CascadeBannerBypass, { count: violations }, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Warning)
      }
      activeDrag.set({ kind: 'idle' })
      return
    }

    // Non-bypass path: permission map (allInSpace already fetched above).
    const canEditMap = new Map<Ref<Issue>, boolean>()
    await Promise.all(
      allInSpace.map(async (i) => {
        canEditMap.set(i._id, await canEditIssue(i))
      })
    )

    const result: SimulateResult = simulateCascade(
      primaryEdits,
      allInSpace,
      relations,
      (ref) => canEditMap.get(ref) ?? false,
      { workingDays: workingDaysCfg }
    )

    switch (result.kind) {
      case 'no-cascade': {
        // Three sub-paths depending on the shape of the edit:
        //   (a) Single-issue primary + legacy toggle on → GanttConfirmCommitPopup (PR3.3 behaviour preserved)
        //   (b) Multi-issue primary (parent-drag) → ConfirmCascadePopup with shifts=[]
        //       so the user sees the children that will move together.
        //   (c) Single-issue primary + legacy toggle off → commit directly
        if (primaryEdits.length > 1) {
          // Parent-drag (or any multi-primary commit) — show the mini-timeline
          // confirm so the user sees every issue that will move.
          //
          // Keep the dragState alive (do NOT reset to idle here) so the
          // dragged bars remain at their preview positions while the user
          // decides. activeDrag is only released after the popup resolves —
          // commit → idle on success, cancel → idle on dismiss.
          // v121.2 — gate pointer input + handleCanvasPointerUp re-entry
          // while the cascade popup is up (bulk-drag hover-bug / double-popup).
          setConfirming(true)
          showPopup(
            ConfirmCascadePopup,
            {
              primary: result.primary,
              shifts: [],
              skippedUnscheduled: 0,
              lockedIssues: []
            },
            'middle',
            (ok: boolean) => {
              setConfirming(false)
              if (ok !== true) {
                activeDrag.set({ kind: 'idle' })
                return
              }
              void commitCascadeBatch(result.primary, [], cascadeScope).finally(() => {
                activeDrag.set({ kind: 'idle' })
              })
            }
          )
          return
        }
        if (legacyConfirmKind !== 'none') {
          const pe = primaryEdits[0]
          // v121.2 — same gate around the single-issue legacy popup.
          setConfirming(true)
          const ok = await new Promise<boolean>((resolve) => {
            showPopup(
              GanttConfirmCommitPopup,
              { issue: pe.issue, kind: legacyConfirmKind, newStart: pe.newStart, newDue: pe.newDue },
              'top',
              (r: boolean | undefined) => {
                setConfirming(false)
                resolve(r === true)
              }
            )
          })
          if (!ok) {
            activeDrag.set({ kind: 'idle' })
            return
          }
        }
        const cascadeToken = newCascadeToken(cascadeScope ?? 'gantt-no-cascade')
        const ops = client.apply(undefined, cascadeToken)
        for (const pe of result.primary) {
          await ops.update(pe.issue, { startDate: pe.newStart, dueDate: pe.newDue })
        }
        const undoEntry = buildDateUndoEntry(result.primary, [])
        const r = await ops.commit()
        if (!r.result) {
          const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
          addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        } else {
          if (undoEntry !== null) undoManager.push(undoEntry)
          // Tier-4 Item 14 — single-issue / parent-drag with no cascade: still
          // notify collaborators of the primary move.
          void emitDependencyShiftBundles(result.primary, [], cascadeToken)
        }
        // No popup, no further async — release the preview now that the
        // server-state has caught up (or failed). The bar transitions from
        // its preview position to the freshly committed issue.startDate.
        activeDrag.set({ kind: 'idle' })
        return
      }
      case 'cascade':
      case 'permission-denied': {
        // Keep the live preview alive while the popup is open so the
        // dragged bar visually stays at the proposed position. activeDrag
        // is released only when the popup resolves: idle-after-commit on
        // confirm so the bar transitions cleanly to its new server-state,
        // or idle-on-cancel so the bar springs back to its original dates.
        // v121.2 — gate pointer input + handleCanvasPointerUp re-entry.
        setConfirming(true)
        showPopup(
          ConfirmCascadePopup,
          {
            primary: result.primary,
            shifts: result.shifts,
            skippedUnscheduled: 'skippedUnscheduled' in result ? result.skippedUnscheduled : 0,
            lockedIssues: result.kind === 'permission-denied' ? result.lockedIssues : []
          },
          'middle',
          (ok: boolean) => {
            setConfirming(false)
            if (ok !== true) {
              activeDrag.set({ kind: 'idle' })
              return
            }
            if (result.kind === 'permission-denied') {
              // Confirm is disabled in the popup; defensively treat
              // a `true` close as a cancel — release the preview.
              activeDrag.set({ kind: 'idle' })
              return
            }
            void commitCascadeBatch(result.primary, result.shifts, cascadeScope).finally(() => {
              activeDrag.set({ kind: 'idle' })
            })
          }
        )
        return
      }
      case 'cycle': {
        activeDrag.set({ kind: 'idle' })
        const t = await translate(tracker.string.CascadeBannerCycle, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        return
      }
      case 'iteration-overflow': {
        activeDrag.set({ kind: 'idle' })
        const t = await translate(tracker.string.CascadeBannerOverflow, { max: 1000 }, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        return
      }
    }
  }

  /**
   * Phase 3c — build a single undo-entry for a primary+shifts batch.
   * Returns null when there is nothing to record (zero-issue commit).
   */
  function buildDateUndoEntry (primary: PrimaryEdit[], shifts: CascadeShift[]): UndoEntry | null {
    const changes: Array<{ issueId: Ref<Issue>, issueSpace: Ref<Space>, before: { startDate: number | null, dueDate: number | null }, after: { startDate: number | null, dueDate: number | null } }> = []
    for (const pe of primary) {
      changes.push({
        issueId: pe.issue._id,
        issueSpace: pe.issue.space,
        before: { startDate: pe.issue.startDate ?? null, dueDate: pe.issue.dueDate ?? null },
        after: { startDate: pe.newStart, dueDate: pe.newDue }
      })
    }
    for (const sh of shifts) {
      changes.push({
        issueId: sh.issue._id,
        issueSpace: sh.issue.space,
        before: { startDate: sh.oldStart, dueDate: sh.oldDue },
        after: { startDate: sh.newStart, dueDate: sh.newDue }
      })
    }
    if (changes.length === 0) return null
    if (changes.length === 1) {
      const c = changes[0]
      return {
        kind: 'date-change',
        issueId: c.issueId,
        issueSpace: c.issueSpace,
        before: c.before,
        after: c.after,
        description: `Move ${String(c.issueId)}`
      }
    }
    return {
      kind: 'date-batch',
      changes,
      description: `Cascade: ${changes.length} issues shifted`
    }
  }

  async function commitCascadeBatch (
    primary: PrimaryEdit[],
    shifts: CascadeShift[],
    /**
     * Tier-2 Item 6 — cascadeToken scope override. Bulk-drag passes
     * `'gantt-bulk-cascade'` so the entire batch (primaries + cascade
     * fanout) shares one scope-prefix downstream.
     */
    cascadeScope: string = 'gantt-cascade-commit'
  ): Promise<void> {
    const client = getClient()
    const cascadeToken = newCascadeToken(cascadeScope)
    const ops = client.apply(undefined, cascadeToken)
    for (const pe of primary) {
      await ops.update(pe.issue, { startDate: pe.newStart, dueDate: pe.newDue })
    }
    for (const sh of shifts) {
      await ops.update(sh.issue, { startDate: sh.newStart, dueDate: sh.newDue })
    }
    const undoEntry = buildDateUndoEntry(primary, shifts)
    const r = await ops.commit()
    if (!r.result) {
      const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
      return
    }
    if (undoEntry !== null) undoManager.push(undoEntry)
    // Tier-4 Item 14 — full cascade with shifts: emit one bundle per recipient
    // covering both the primary moves and the cascade fanout.
    void emitDependencyShiftBundles(primary, shifts, cascadeToken)
  }

  /**
   * Tier-4 Item 14 — emit `DependencyShiftedNotification` bundles for the
   * collaborators of every shifted issue. Fire-and-forget: notification
   * failure must never roll back the commit (the dates are already on the
   * server). Errors are surfaced as a non-blocking toast so a regression is
   * visible during smoke-tests but the user can keep working.
   */
  async function emitDependencyShiftBundles (
    primary: PrimaryEdit[],
    shifts: CascadeShift[],
    cascadeToken: string
  ): Promise<void> {
    if (primary.length === 0 && shifts.length === 0) return
    const client = getClient()
    const triggerIssue = primary[0]?.issue ?? shifts[0]?.issue
    if (triggerIssue === undefined) return
    const triggerUser = getCurrentAccount().uuid
    await sendDependencyShiftedNotifications(
      client,
      { triggerIssue, triggerUser, primaries: primary, shifts, cascadeToken },
      (err) => {
        console.warn('gantt: dependency-shift notification dispatch failed', err)
      }
    )
  }

  /**
   * Returns true iff the relation `r` is satisfied given the proposed
   * primary edit `pe` and the current dates of the other side. Used for
   * the Alt-bypass violation count only. Routes through the same anchor
   * helpers as the scheduler so violation counts agree with cascade
   * decisions in both legacy and working-days mode.
   */
  function relationSatisfied (
    r: IssueRelation,
    pe: PrimaryEdit,
    otherIssue: Issue
  ): boolean {
    const isOutgoing = String(r.attachedTo) === String(pe.issue._id)
    const predStart = isOutgoing ? pe.newStart : (otherIssue.startDate as number)
    const predDue = isOutgoing ? pe.newDue : (otherIssue.dueDate as number)
    const succStart = isOutgoing ? (otherIssue.startDate as number) : pe.newStart
    const succDue = isOutgoing ? (otherIssue.dueDate as number) : pe.newDue
    const lag = r.lag ?? 0
    switch (r.kind) {
      case 'finish-to-start': return fsAnchor(predDue, lag, workingDaysCfg) <= succStart
      case 'start-to-start': return ssAnchor(predStart, lag, workingDaysCfg) <= succStart
      case 'finish-to-finish': return ffAnchor(predDue, lag, workingDaysCfg) <= succDue
      case 'start-to-finish': return sfAnchor(predStart, lag, workingDaysCfg) <= succDue
    }
  }

  async function commitDrag (state: DragState, event?: PointerEvent | MouseEvent): Promise<void> {
    // Narrow to drag/resize states that carry a `target` field.
    if (
      state.kind !== 'dragging-body' &&
      state.kind !== 'dragging-unscheduled' &&
      state.kind !== 'resizing-left' &&
      state.kind !== 'resizing-right'
    ) return
    // Guard: an unscheduled-drag that never reached the canvas (e.g. the user
    // clicked the drag-grip and released without moving) must NOT silently
    // schedule the issue to "today".
    if (state.kind === 'dragging-unscheduled' && !state.hasCanvasTarget) return
    const altKey = event?.altKey === true
    const client = getClient()

    // Milestone path — unchanged from PR3.3. The existing
    // `commitMilestoneDrag(state, target, ops)` signature
    // (line ~713: state: DragState, target: { kind: 'milestone', doc:
    // Milestone }, ops: ApplyOperations) handles dragging-body,
    // resizing-left and resizing-right; dragging-unscheduled is
    // unreachable for milestones.
    if (state.target.kind === 'milestone') {
      const ops = client.apply('gantt-drag')
      await commitMilestoneDrag(state, state.target, ops)
      const r = await ops.commit()
      if (!r.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
      }
      // Legacy path manages its own preview lifecycle.
      activeDrag.set({ kind: 'idle' })
      return
    }

    // Issue dragging-unscheduled — no relations to cascade, keep PR3
    // single-update commit via commitIssueDrag.
    if (state.kind === 'dragging-unscheduled') {
      const ops = client.apply('gantt-drag')
      const doc = state.target.doc as Issue
      const before = { startDate: doc.startDate ?? null, dueDate: doc.dueDate ?? null }
      const after = { startDate: (state as any).previewStart as number, dueDate: (state as any).previewEnd as number }
      await commitIssueDrag(state, state.target, ops)
      const r = await ops.commit()
      if (!r.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
      } else {
        // Schedule-from-unscheduled produces exactly one date-change entry.
        undoManager.push({
          kind: 'date-change',
          issueId: doc._id,
          issueSpace: doc.space,
          before,
          after,
          description: `Schedule ${String(doc._id)}`
        })
      }
      // Legacy path manages its own preview lifecycle.
      activeDrag.set({ kind: 'idle' })
      return
    }

    // Tier-2 Item 6 — Bulk-Drag commit.
    // When the dragging-body state carries a co-drag payload, fan it into
    // PrimaryEdit[] and route through commitWithCascade. This bypasses the
    // descendant-auto-expand of single-drag's parent path: in bulk mode
    // the user has explicitly chosen which issues to move, and adding
    // children of a selected parent would surprise them. If they wanted
    // children to move, they would have Cmd-clicked the children too.
    // ConfirmCascadePopup is the single confirmation surface (legacy
    // GanttConfirmCommitPopup is bypassed via 'none').
    if (state.kind === 'dragging-body' && state.target.kind === 'issue' && state.coDrag !== undefined) {
      const issuesByRef = new Map<string, Issue>()
      for (const i of issues) issuesByRef.set(String(i._id), i)
      const primaryEdits: PrimaryEdit[] = []
      for (const m of state.coDrag.members) {
        const issueDoc = issuesByRef.get(String(m.issueId))
        if (issueDoc === undefined) continue
        primaryEdits.push({
          issue: issueDoc,
          newStart: m.originStart + state.coDrag.anchorDeltaMs,
          newDue: m.originEnd + state.coDrag.anchorDeltaMs
        })
      }
      if (primaryEdits.length === 0) {
        activeDrag.set({ kind: 'idle' })
        return
      }
      // Selection persistence (Spec decision 2): the multi-selection set
      // stays as-is after commit so the user can immediately follow up
      // with another bulk action. ConfirmCascadePopup's cancel path also
      // leaves the selection untouched — only Esc / background-click
      // clear it.
      // cascadeScope `gantt-bulk-cascade` keys every sub-Tx of this bulk
      // operation so downstream consumers (Tier-4 Item 14 notifications,
      // future undo-grouping work) can collapse them to a single entry.
      await commitWithCascade(primaryEdits, altKey, primaryEdits[0].issue.space, 'none', 'gantt-bulk-cascade')
      return
    }

    // Cascade-eligible issue states (dragging-body, resizing-*).
    // Parent-drag detection: check full space for children.
    if (state.kind === 'dragging-body' && state.target.kind === 'issue') {
      const parent = state.target.doc
      const allInSpace = await client.findAll(tracker.class.Issue, { space: parent.space })
      const isParent = allInSpace.some((i) => i.parents?.[0]?.parentId === parent._id)
      if (isParent) {
        const delta = (state as any).previewStart - (state as any).originStart
        const primaryEdits: PrimaryEdit[] = [{
          issue: parent,
          newStart: (state as any).previewStart,
          newDue: (state as any).previewEnd
        }]
        for (const child of descendantsWithDates(parent, allInSpace)) {
          primaryEdits.push({
            issue: child,
            newStart: (child.startDate as number) + delta,
            newDue: (child.dueDate as number) + delta
          })
        }
        // Parent-drag fans out → primaryEdits.length > 1, so commitWithCascade
        // will skip the legacy popup branch anyway. Pass 'none' for clarity.
        await commitWithCascade(primaryEdits, altKey, parent.space, 'none')
        return
      }
      // Childless issue falls through to the leaf branch below.
    }

    if (state.kind === 'dragging-body') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [{
        issue: target,
        newStart: (state as any).previewStart,
        newDue: (state as any).previewEnd
      }]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmMove ? 'move' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
    if (state.kind === 'resizing-left') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [{
        issue: target,
        newStart: (state as any).previewStart,
        newDue: target.dueDate as number
      }]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmResize ? 'resize' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
    if (state.kind === 'resizing-right') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [{
        issue: target,
        newStart: target.startDate as number,
        newDue: (state as any).previewEnd
      }]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmResize ? 'resize' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
  }

  function attachWindowDragListeners (): void {
    window.addEventListener('pointermove', handleCanvasPointerMove)
    window.addEventListener('pointerup', handleCanvasPointerUp)
    window.addEventListener('pointercancel', handleCanvasPointerUp)
    window.addEventListener('mousemove', handleCanvasPointerMove)
    window.addEventListener('mouseup', handleCanvasPointerUp)
  }

  function detachWindowDragListeners (): void {
    window.removeEventListener('pointermove', handleCanvasPointerMove)
    window.removeEventListener('pointerup', handleCanvasPointerUp)
    window.removeEventListener('pointercancel', handleCanvasPointerUp)
    window.removeEventListener('mousemove', handleCanvasPointerMove)
    window.removeEventListener('mouseup', handleCanvasPointerUp)
  }

  // Attach/detach window-level pointer listeners only while a drag is active.
  // Connector creation starts from pointerdown; handleConnectorDown also
  // attaches immediately so the first pointermove cannot race Svelte's flush.
  $: if ($activeDrag.kind !== 'idle' && $activeDrag.kind !== 'hover-bar') {
    attachWindowDragListeners()
  } else {
    detachWindowDragListeners()
  }
  onDestroy(() => {
    detachWindowDragListeners()
  })

  /**
   * Slim the Gantt context menu by deny-listing actions that are noise for a
   * Gantt-specific right-click. Keeps Open (Issue's overridden EditIssue
   * action), Status/Priority/Assignee submenus (›), Set start/due date,
   * Add sub-issue, Set parent issue, Copy ID/URL, Duplicate, Delete.
   *
   * Deny-list (vs. allow-list) is needed because tracker registers a custom
   * Open action for `tracker.class.Issue` with an auto-generated ID; allow-
   * listing by static ID misses it. The menu is otherwise too tall; keep
   * parent/sub-issue access and drop the columns that are already in the
   * sidebar.
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
    'tracker:action:UnsetParent',
    // Below are surfaced via the local Hierarchy ▸ submenu instead, so the
    // top-level menu has one collapsed entry rather than three separate ones.
    'tracker:action:SetParent',
    'tracker:action:NewSubIssue'
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
      target: { kind: 'issue', doc: e.detail.issue },
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
    const allInSpace = await getClient().findAll(tracker.class.Issue, { space: i.space })
    // All date arithmetic routes through addScheduleDays so the Phase-2
    // working-calendar swap stays a single integration point (Spec §5.3).
    const primaryEdits: PrimaryEdit[] = [{
      issue: i,
      newStart: addScheduleDays(i.startDate, days),
      newDue: addScheduleDays(i.dueDate, days)
    }]
    // Include descendants (matches PR3 behaviour for parent shifts).
    for (const child of descendantsWithDates(i, allInSpace)) {
      primaryEdits.push({
        issue: child,
        newStart: addScheduleDays(child.startDate as number, days),
        newDue: addScheduleDays(child.dueDate as number, days)
      })
    }
    // Keyboard shift has no Alt-modifier path and no legacy-confirm UX
    // (the toggle is tied to mouse drag, not keyboard). Always run cascade
    // simulation, never show legacy popup.
    await commitWithCascade(primaryEdits, false, i.space, 'none')
  }

  /**
   * Phase 3c — central handler called from the toolbar buttons and the
   * Cmd+Z / Ctrl+Z keyboard shortcut. Surfaces conflict / error results as
   * toasts; on success flashes the affected bars for 1.5 s so the user sees
   * what just reverted.
   */
  async function handleUndo (): Promise<void> {
    const r: UndoResult = await undoManager.undo()
    await showUndoResultToast(r)
  }

  async function handleRedo (): Promise<void> {
    const r: UndoResult = await undoManager.redo()
    await showUndoResultToast(r)
  }

  async function showUndoResultToast (r: UndoResult): Promise<void> {
    if (r.kind === 'success') {
      if (r.affectedIds.length > 0) flashIssues(r.affectedIds, 1500, undoFlashStore)
      return
    }
    if (r.kind === 'empty') return
    if (r.kind === 'conflicted') {
      // v121.3-D — add a hint sub-line explaining why this frame was
      // dropped from the stack (instead of re-queued) so users don't keep
      // mashing Ctrl-Z and seeing the same toast.
      const title = await translate(tracker.string.GanttUndoConflict, {}, undefined)
      const hint = await translate(tracker.string.GanttUndoConflictHint, {}, undefined)
      addNotification(title, hint, undefined as any, undefined, NotificationSeverity.Warning)
      // Surface the frame details in DevTools — invaluable for debugging
      // intermittent "undo did nothing" reports because the manager's
      // conflict-detection is permissive (it prefers false-positive over
      // silent overwrite, see undo-manager.ts checkConflict comment).
      console.warn('[gantt-undo] conflict — frame dropped', {
        entry: r.entry
      })
      return
    }
    if (r.kind === 'error') {
      const title = await translate(tracker.string.GanttUndoFailed, {}, undefined)
      addNotification(title, String(r.error), undefined as any, undefined, NotificationSeverity.Error)
      console.warn('[gantt-undo] error — frame dropped', {
        entry: r.entry,
        error: r.error
      })
    }
  }

  /**
   * True when a text-entry control owns focus — in that case Cmd+Z / Ctrl+Z
   * is the browser's native text-undo and we must NOT hijack it. Otherwise
   * the Gantt is the consumer.
   */
  function isTextInputFocused (): boolean {
    const el = document.activeElement
    if (el === null) return false
    if (el instanceof HTMLInputElement) return el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'button'
    if (el instanceof HTMLTextAreaElement) return true
    if (el instanceof HTMLSelectElement) return false
    return el.getAttribute('contenteditable') === 'true'
  }

  function onKey (e: KeyboardEvent): void {
    // Phase 3c — Cmd+Z / Ctrl+Z (Undo) and Cmd+Shift+Z / Ctrl+Shift+Z (Redo).
    // Checked FIRST so they win against the Phase-1 zoom/pan shortcuts which
    // share the +/-/Tab/Arrow keyspace. Skip when a text input owns focus so
    // the browser's native text-undo keeps working in DependencyEditor /
    // inline cell edits / CreateIssue.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
      if (isTextInputFocused()) return
      // Require focus inside the Gantt root — same guard as the rest of onKey.
      if (!(containerEl?.contains(document.activeElement) ?? false)) return
      e.preventDefault()
      if (e.shiftKey) {
        void handleRedo()
      } else {
        void handleUndo()
      }
      return
    }
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
      return
    }
    // Tier-2 Item 6 — Esc clears the multi-selection when no drag is in
    // flight. Sits AFTER the drag-cancel branch so the user's first Esc
    // press still cancels an in-flight drag (Phase 3c behaviour); only
    // the next Esc clears the selection.
    if (e.key === 'Escape' && multiSelectedIssueIds.size > 0) {
      multiSelectedIssueIds = clearSelection()
      lastClickedIssueId = null
      e.preventDefault()
      return
    }
    // Tier-2 Item 6 — Cmd-A / Ctrl-A selects every visible scheduled
    // issue. Respects the sidebar's filter + sort order via
    // `orderedSelectableIds`. Skips when a text input owns focus so the
    // browser's native Select-All keeps working in CreateIssue / inline
    // editors.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A') && !e.shiftKey) {
      if (isTextInputFocused()) return
      multiSelectedIssueIds = selectAll(orderedSelectableIds)
      // Pin the anchor for subsequent Shift-Click ranges.
      if (orderedSelectableIds.length > 0) {
        lastClickedIssueId = orderedSelectableIds[orderedSelectableIds.length - 1]
      }
      e.preventDefault()
      return
    }
    // PR6: zoom shortcuts. `+` / `=` zoom in, `-` zoom out. The same
    // key positions as the browser's native zoom but scoped to the Gantt.
    if (e.key === '+' || e.key === '=') {
      cycleZoom(1)
      e.preventDefault()
      return
    }
    if (e.key === '-' || e.key === '_') {
      cycleZoom(-1)
      e.preventDefault()
      return
    }
    // PR6: '?' or Shift+/ shows the keyboard help overlay.
    if (e.key === '?') {
      showPopup(GanttHelpPopup, {}, 'middle')
      e.preventDefault()
      return
    }
    // PR6: 'e' / 'E' exports the visible Gantt SVG to PNG.
    if (e.key === 'e' || e.key === 'E') {
      void exportToPng()
      e.preventDefault()
    }
    // v121.3-E — Phase-3b Ctrl/Cmd+F toggle removed together with the
    // gantt-toolbar Filter button. The standard FilterBar in IssuesView
    // is now the single source of filter truth; the browser's native
    // find dialog (which Ctrl+F was hijacking) is more useful here than
    // a redundant gantt-local popup. A future refactor can re-bind
    // Ctrl+F to focus the FilterBar's `+ Filter` button via a custom
    // event.
  }

  function cycleZoom (delta: number): void {
    const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
    const idx = levels.indexOf(zoom)
    const next = levels[Math.min(levels.length - 1, Math.max(0, idx + delta))]
    if (next !== zoom) setZoom(next)
  }

  // v121.3-C — Ctrl+Wheel (Cmd+Wheel on Mac) over the scroller: continuous
  // zoom with cursor-anchored scroll. Without Ctrl we let the wheel pass
  // through to the native scroller (vertical scroll / shift-wheel
  // horizontal). All math lives in lib/zoom.ts for unit-testability.
  function onScrollerWheel (e: WheelEvent): void {
    if (!(e.ctrlKey || e.metaKey)) return
    if (hScrollEl == null) return
    e.preventDefault()
    const rect = hScrollEl.getBoundingClientRect()
    const cursorX = Math.max(0, e.clientX - rect.left)
    const oldPpd = effectivePxPerDay
    const oldScrollLeft = hScrollEl.scrollLeft
    const newPpd = applyWheelZoom(oldPpd, e.deltaY)
    if (newPpd === oldPpd) return
    userPxPerDay = newPpd
    // Apply scrollLeft on the next tick so the new layout (driven by the
    // updated effectivePxPerDay) has rendered with the new scrollWidth.
    const nextScroll = cursorAnchoredScrollLeft(cursorX, oldScrollLeft, oldPpd, newPpd)
    queueMicrotask(() => {
      if (hScrollEl == null) return
      hScrollEl.scrollLeft = nextScroll
      syncViewport()
    })
  }

  // Tier-4 Item 13 — pinch-zoom on the canvas scroller. Wired via four
  // pointer handlers (down/move/up/cancel) on the .gantt-scroller element.
  // The pinch reducer is purely pointer-id-bookkeeping; the scroll anchor
  // math reuses cursorAnchoredScrollLeft from the Ctrl+Wheel zoom path so
  // the visual outcome is consistent between desktop wheel-zoom and
  // tablet pinch-zoom.
  function onScrollerPointerDown (e: PointerEvent): void {
    if (e.pointerType !== 'touch') return
    if (scrollerEl == null) return
    const rect = scrollerEl.getBoundingClientRect()
    pinchState = reducePinch(pinchState, {
      type: 'down',
      id: e.pointerId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pxPerDay: effectivePxPerDay
    })
  }

  function onScrollerPointerMove (e: PointerEvent): void {
    if (e.pointerType !== 'touch') return
    if (pinchState.kind === 'idle') return
    if (scrollerEl == null) return
    const rect = scrollerEl.getBoundingClientRect()
    const before = pinchState
    pinchState = reducePinch(pinchState, {
      type: 'move',
      id: e.pointerId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    // Apply zoom only while actively pinching (2 fingers down) and only
    // when the distance actually changed. Single-pointer move is left
    // for the existing pan handlers.
    if (pinchState.kind !== 'pinch') return
    if (before.kind !== 'pinch') return
    if (pinchState.initialDistance <= 0) return
    const ratio = pinchState.currentDistance / pinchState.initialDistance
    const oldPpd = effectivePxPerDay
    const newPpd = computePxPerDayFromRatio(pinchState.initialPxPerDay, ratio)
    if (newPpd === oldPpd) return
    if (hScrollEl == null) return
    e.preventDefault()
    const oldScrollLeft = hScrollEl.scrollLeft
    userPxPerDay = newPpd
    const cursorX = Math.max(0, pinchState.center.x)
    const nextScroll = cursorAnchoredScrollLeft(cursorX, oldScrollLeft, oldPpd, newPpd)
    queueMicrotask(() => {
      if (hScrollEl == null) return
      hScrollEl.scrollLeft = nextScroll
      syncViewport()
    })
  }

  function onScrollerPointerUp (e: PointerEvent): void {
    if (e.pointerType !== 'touch') return
    pinchState = reducePinch(pinchState, { type: 'up', id: e.pointerId })
  }

  function onScrollerPointerCancel (_e: PointerEvent): void {
    // iOS Safari fires pointercancel when scroll-inertia kicks in. Drop
    // the pinch cleanly so a follow-up pointerdown doesn't see a stale
    // half-tracked state.
    pinchState = reducePinch(pinchState, { type: 'cancel' })
  }

  async function exportToPng (): Promise<void> {
    const svg = scrollerEl?.querySelector('svg.gantt-canvas') as SVGSVGElement | null
    if (svg === null) return
    try {
      await exportAndDownload(svg, `gantt-${new Date().toISOString().slice(0, 10)}`)
    } catch (err) {
      const title = await translate(tracker.string.GanttExportFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onWindowResize)
  })
  onDestroy(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', onWindowResize)
    // PR5 cleanup: the critical-path recompute is debounced via
    // setTimeout. If the view unmounts while a pending recompute is
    // queued, the timer would fire after our reactive store handles
    // were already torn down — clearing the handle prevents both the
    // dangling reactive write and the late notification banner.
    if (cpDirtyTimer !== null) {
      clearTimeout(cpDirtyTimer)
      cpDirtyTimer = null
    }
  })

  // v121.3-B — programmatic scroll helpers: after any scrollTo / scrollBy
  // we proactively sync the viewport (one frame for smooth scroll to start +
  // one for the final position). Smooth-scroll fires real `scroll` events
  // during animation, but when the requested left equals the current
  // scrollLeft (e.g. jumpToToday when already centred on today) no event
  // fires at all, and reactive consumers (dependency-arrow visibility,
  // hThumbLeft) stay stale until the next pointermove. The explicit
  // queueMicrotask path keeps `canvasViewportLeft` and dependant reactive
  // expressions (including classifyArrowVisibility) in sync.
  function jumpToToday (): void {
    if (hScrollEl == null) return
    const x = timeScale.toX(Date.now())
    hScrollEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'smooth' })
    queueMicrotask(syncViewport)
  }
  function pageScroll (dir: -1 | 1): void {
    if (hScrollEl == null) return
    hScrollEl.scrollBy({ left: dir * canvasViewportWidth * 0.8, behavior: 'smooth' })
    queueMicrotask(syncViewport)
  }
  function jumpToStart (): void {
    if (hScrollEl == null) return
    hScrollEl.scrollTo({ left: 0, behavior: 'smooth' })
    queueMicrotask(syncViewport)
  }
  function jumpToEnd (): void {
    if (hScrollEl == null) return
    hScrollEl.scrollTo({ left: hScrollEl.scrollWidth, behavior: 'smooth' })
    queueMicrotask(syncViewport)
  }
  function jumpToDate (iso: string): void {
    if (hScrollEl == null || iso === '') return
    const t = Date.parse(iso)
    if (isNaN(t)) return
    const x = timeScale.toX(t)
    hScrollEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'smooth' })
    queueMicrotask(syncViewport)
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
    if (scrollerEl == null) return
    dragVThumb = true
    dragVThumbStartY = e.clientY
    dragVThumbStartScroll = scrollerEl.scrollTop
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onVThumbDragMove (e: PointerEvent): void {
    if (!dragVThumb || scrollerEl == null) return
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
    if (hScrollEl == null) return
    dragThumb = true
    dragThumbStartX = e.clientX
    dragThumbStartScroll = hScrollEl.scrollLeft
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onThumbDragMove (e: PointerEvent): void {
    if (!dragThumb || hScrollEl == null) return
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
    if (hScrollEl == null) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const dir = clickX < hThumbLeft ? -1 : 1
    hScrollEl.scrollBy({ left: dir * hTrackWidth * 0.8, behavior: 'smooth' })
  }

  // Wheel-forwarding is no longer needed: sidebar lives inside the same
  // .gantt-scroller as the canvas, with position:sticky;left:0. Browser
  // handles native scrolling at the right speed regardless of where the
  // mouse hovers inside the scroller.

  // Click-and-drag panning across canvas area, including normal Gantt bars.
  let panning = false
  let pendingPan = false
  let panStartX = 0
  let panStartY = 0
  let panStartScrollLeft = 0
  let panStartScrollTop = 0
  function onCanvasPanStart (e: PointerEvent): void {
    if (scrollerEl == null || hScrollEl == null) return
    const target = e.target as HTMLElement
    if (!shouldStartCanvasPan(target)) return
    pendingPan = true
    panStartX = e.clientX
    panStartY = e.clientY
    panStartScrollLeft = hScrollEl.scrollLeft
    panStartScrollTop = scrollerEl.scrollTop
  }
  function onCanvasPanMove (e: PointerEvent): void {
    if ((!pendingPan && !panning) || scrollerEl == null || hScrollEl == null) return
    const dx = e.clientX - panStartX
    const dy = e.clientY - panStartY
    if (pendingPan) {
      if (!shouldPromoteCanvasPan(dx, dy)) return
      pendingPan = false
      panning = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    hScrollEl.scrollLeft = panStartScrollLeft - (e.clientX - panStartX)
    scrollerEl.scrollTop = panStartScrollTop - (e.clientY - panStartY)
  }
  function onCanvasPanEnd (e: PointerEvent): void {
    // Guard: only release the pointer if we actually captured it. A pointerup
    // bubbling from a child element that was excluded by the pan-handler
    // exclusion list (e.g. resize-handle, drag-grip) shouldn't reach
    // releasePointerCapture, but browsers throw `InvalidStateError` if the
    // element isn't actually capturing the given pointerId.
    if (pendingPan) {
      pendingPan = false
      return
    }
    if (!panning) return
    panning = false
    lastCanvasPanEndedAt = Date.now()
    const el = e.currentTarget as HTMLElement
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
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
  let observedScrollerEl: HTMLDivElement | null = null
  let observedHScrollEl: HTMLDivElement | null = null
  function syncViewport (): void {
    if (scrollerEl != null) {
      scrollTop = scrollerEl.scrollTop
      viewportHeight = scrollerEl.clientHeight
    }
    if (hScrollEl != null) {
      canvasViewportLeft = hScrollEl.scrollLeft
      canvasViewportWidth = hScrollEl.clientWidth
    } else if (scrollerEl != null) {
      // Before the horizontal-scroll proxy is rendered, derive the canvas
      // viewport from the visible scroller minus sticky sidebar + resize cell.
      // Otherwise the initial 1200px fallback can suppress hHasOverflow
      // forever in narrower layouts, hiding the Plane-style bottom bar.
      canvasViewportLeft = 0
      canvasViewportWidth = computeCanvasViewportWidth(scrollerEl.clientWidth, sidebarWidthPx, RESIZE_CELL_W)
    }
  }
  $: if (scrollerEl != null) queueMicrotask(syncViewport)
  $: if (hScrollEl != null) queueMicrotask(syncViewport)
  $: if (resizeObs !== undefined && scrollerEl != null && observedScrollerEl !== scrollerEl) {
    resizeObs.observe(scrollerEl)
    observedScrollerEl = scrollerEl
    queueMicrotask(syncViewport)
  }
  $: if (resizeObs !== undefined && hScrollEl != null && observedHScrollEl !== hScrollEl) {
    resizeObs.observe(hScrollEl)
    observedHScrollEl = hScrollEl
    queueMicrotask(syncViewport)
  }
  $: if (hScrollEl == null && observedHScrollEl !== null) {
    observedHScrollEl = null
    queueMicrotask(syncViewport)
  }
  onMount(() => {
    syncViewport()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => syncViewport())
      if (scrollerEl != null) resizeObs.observe(scrollerEl)
      if (hScrollEl != null) resizeObs.observe(hScrollEl)
    }
  })
  onDestroy(() => {
    resizeObs?.disconnect()
  })

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

  // PR3.2: open the EditMilestone popup when a milestone row is clicked in
  // the sidebar — user expects parity with the issue row's single-click
  // open behavior (feedback 2026-05-11). The sidebar carries a compact
  // MilestoneMarker, so resolve to the full Milestone from the live query
  // before passing it as the popup's `object` prop (EditMilestone reads
  // object.label / status / dates synchronously).
  function onMilestoneOpen (e: CustomEvent<{ milestoneId: Ref<Milestone> }>): void {
    const full = milestones.find((m) => m._id === e.detail.milestoneId)
    if (full === undefined) return
    showPopup(EditMilestone, { object: full }, 'middle')
  }

  function newIssue (): void {
    if (space === undefined) return
    showPopup(CreateIssue, { space, shouldSaveDraft: true }, 'top')
  }

  // -------------------------------------------------------------------------
  // PR 3 edit-mode: bar mousedown → reducer; window mousemove/mouseup; commit.
  // -------------------------------------------------------------------------

  function handleBarMouseDown (e: CustomEvent<{ target: DragTarget, edge: 'left' | 'right' | 'body', cursorX: number }>): void {
    const id = String(e.detail.target.doc._id)
    if (selectedIssueId !== id) {
      selectedIssueId = id
      focusedIssueId = id
      return
    }
    // PR3.3: capture origin dates at the dispatch boundary so the doc-
    // agnostic reducer doesn't need to know which field on target.doc to
    // read. Milestone uses targetDate, Issue uses dueDate.
    const t = e.detail.target
    const originStart =
      t.kind === 'issue' ? (t.doc.startDate as number) : (t.doc.startDate as number)
    const originEnd =
      t.kind === 'issue' ? (t.doc.dueDate as number) : (t.doc.targetDate)
    // Guard: a milestone with startDate=null shouldn't reach this path — the
    // bar isn't rendered. Issue with null dates was already handled in PR3
    // (mousedown-unscheduled path).
    if (originStart == null || originEnd == null) return
    activeDrag.update((s) => reduce(s, {
      type: 'mousedown-bar',
      target: t,
      originStart,
      originEnd,
      edge: e.detail.edge,
      cursorX: e.detail.cursorX
    }, timeScale))
  }

  function handleBarClick (e: CustomEvent<{ target: DragTarget }>): void {
    // Pointer-driven canvas panning may still synthesize a click after
    // pointerup. Treat that click as part of the pan gesture, not as a
    // selection, so "hold and drag" does not arm the bar afterwards.
    if (Date.now() - lastCanvasPanEndedAt < 250) return
    const id = String(e.detail.target.doc._id)
    selectedIssueId = id
    focusedIssueId = id
    // Phase 1.E — opt-in Quick-Info popup on single-click. Default false =
    // no popup (selection only — full editor still opens on double-click,
    // handled in GanttCanvas.svelte's <g class="bar-wrap">).
    if (quickInfoOnClick && e.detail.target.kind === 'issue') {
      const issue = e.detail.target.doc
      showPopup(
        GanttQuickInfoPopup,
        { issue },
        'top',
        (result?: 'openFull') => {
          if (result !== 'openFull') return
          showPanel(
            tracker.component.EditIssue,
            issue._id as Ref<Doc>,
            issue._class as Ref<Class<Doc>>,
            'content'
          )
        }
      )
    }
  }

  function handleConnectorDown (e: CustomEvent<{ source: Issue, originPx: { x: number, y: number } }>): void {
    activeDrag.update((s) => reduce(s, {
      type: 'mousedown-connector',
      source: e.detail.source,
      originPx: e.detail.originPx,
      cursorPx: e.detail.originPx
    }, timeScale))
    attachWindowDragListeners()
  }

  // Single entry point for connector-drag: GanttConnectorDot dispatches
  // 'connectorDown' via Svelte from one on:mousedown binding on its
  // hit-circle. Earlier drafts had three parallel pathways (template
  // binding + direct addEventListener inside the dot + document-level
  // capture-phase delegation), all of which fired concurrently and
  // produced double mousedown handling. Keep this handler the only one.

  function handleBarHover (e: CustomEvent<{ issue: Issue | null }>): void {
    hoveredIssue = (e.detail.issue?._id ?? null) as Ref<Issue> | null
  }

  function handleHoverEdge (e: CustomEvent<{ source: Ref<Issue>, target: Ref<Issue> } | null>): void {
    hoveredEdge = e.detail as { source: Ref<Issue>, target: Ref<Issue> } | null
  }

  function handleOpenEditor (e: CustomEvent<{ relation: IssueRelation }>): void {
    const rel = e.detail.relation
    // canEdit if the user can update the source issue (spec §1 decision A).
    const sourceIssue = issues.find((i) => i._id === rel.attachedTo)
    void (async () => {
      const canEdit = sourceIssue !== undefined ? await canEditIssue(sourceIssue) : false
      showPopup(DependencyEditor, { relation: rel, canEdit }, 'middle')
    })()
  }

  /**
   * Clear selection when the user clicks outside any bar — e.g. on the
   * canvas background. Bar clicks stopPropagation, so this only fires for
   * clicks that didn't land on a bar.
   */
  function onBackgroundClick (e: MouseEvent): void {
    const target = e.target as HTMLElement | null
    if (target?.closest('.bar-wrap') !== null) return
    selectedIssueId = null
    focusedIssueId = null
  }

  /**
   * Translate the window-space `MouseEvent.clientX` into the canvas's content
   * coordinate. Used for `dragging-unscheduled` so the bar lands at the date
   * under the cursor, not at a delta from "today". Returns undefined when
   * the cursor is outside the canvas (e.g., still over the sidebar) so the
   * reducer keeps its default preview.
   */
  /** Width of the resize-cell (drag-handle column) between sidebar and canvas.
   *  The horizontal scrollbar already offsets by `sidebarWidthPx + 5` (see
   *  .gantt-hscrollbar padding-left), so the canvas content origin is at
   *  rect.left + sidebarWidthPx + this constant, not just sidebarWidthPx.
   *  Missing this offset produces an off-by-5 in unscheduled drag drop. */
  const RESIZE_CELL_W = 5

  function computeCanvasX (e: MouseEvent): number | undefined {
    if (scrollerEl == null) return undefined
    const rect = scrollerEl.getBoundingClientRect()
    const sidebarEdge = rect.left + sidebarWidthPx + RESIZE_CELL_W
    if (e.clientX < sidebarEdge) return undefined
    return e.clientX - sidebarEdge + canvasViewportLeft
  }

  function handleCanvasPointerMove (e: MouseEvent): void {
    // PR4a: while connector-drawing, dispatch mousemove-connector with
    // svg-local cursorPx + the issue under the cursor. Coordinate frame
    // matches barRects (computed in GanttCanvas) so the live bezier
    // anchors correctly. document.elementFromPoint hits the bar's <rect>
    // through the .bar-wrap <g> whose data-issue-id was added in Task 15.
    const state = $activeDrag
    if (state.kind === 'connector-drawing' || state.kind === 'connector-target-hover') {
      const svg = scrollerEl?.querySelector('svg.gantt-canvas') as SVGSVGElement | null
      if (svg === null) return
      const svgRect = svg.getBoundingClientRect()
      const cursorPx = { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top }
      const hoveredEl = document.elementFromPoint(e.clientX, e.clientY)
      const issueId = hoveredEl?.closest('.bar-wrap')?.getAttribute('data-issue-id') as Ref<Issue> | null
      const hoveredBar = issueId !== null
        ? issues.find((i) => i._id === issueId) ?? null
        : null
      activeDrag.update((s) => reduce(s, {
        type: 'mousemove-connector',
        cursorPx,
        hoveredBar: hoveredBar !== null && hoveredBar._id !== state.source._id ? hoveredBar : null
      }, timeScale))
      return  // Don't also fire mousemove for bar drag
    }
    activeDrag.update((s) =>
      reduce(s, { type: 'mousemove', cursorX: e.clientX, canvasX: computeCanvasX(e) }, timeScale)
    )
  }

  async function handleCanvasPointerUp (e?: PointerEvent | MouseEvent): Promise<void> {
    const state = $activeDrag
    if (state.kind === 'connector-drawing') {
      activeDrag.set({ kind: 'idle' })
      return
    }
    if (state.kind === 'connector-target-hover') {
      const src = state.source
      const tgt = state.target
      activeDrag.set({ kind: 'idle' })
      // Cycle check before any write. Spec §2 decision A (block + toast).
      if (wouldCreateCycle(src._id, tgt._id, relations)) {
        const title = await translate(tracker.string.DependencyCycle, {}, undefined)
        addNotification(title, '', undefined as any, undefined, NotificationSeverity.Error)
        return
      }
      const client = getClient()
      const ops = client.apply(undefined, 'gantt-dependency-create')
      const optimistic = {
        _id: `gantt:optimistic:${String(src._id)}:${String(tgt._id)}:${Date.now()}`,
        _class: tracker.class.IssueRelation,
        space: src.space,
        attachedTo: src._id,
        target: tgt._id,
        kind: 'finish-to-start',
        lag: 0
      } as unknown as IssueRelation
      optimisticRelations = [...optimisticRelations, optimistic]
      await ops.addCollection(
        tracker.class.IssueRelation,
        src.space,
        src._id,
        tracker.class.Issue,
        'relations',
        { target: tgt._id, kind: 'finish-to-start', lag: 0 }
      )
      const result = await ops.commit()
      if (!result.result) {
        optimisticRelations = optimisticRelations.filter((rel) => rel !== optimistic)
      }
      return
    }
    if (state.kind === 'idle' || state.kind === 'hover-bar') {
      activeDrag.set({ kind: 'idle' })
      return
    }
    // Skip the confirmation prompt when the preview didn't actually change
    // anything (drag with zero-delta — e.g. mouseup without movement).
    const previewDelta = previewChangedFromOrigin(state)
    if (!previewDelta) {
      activeDrag.set({ kind: 'idle' })
      return
    }
    // Wrap the commit in the user-configurable confirmation dialog when the
    // matching ganttConfirm{Move,Resize} ViewOption is on (default-on).
    const needsConfirm =
      ((state.kind === 'dragging-body' || state.kind === 'dragging-unscheduled') && confirmMove) ||
      ((state.kind === 'resizing-left' || state.kind === 'resizing-right') && confirmResize)

    // dragging-unscheduled stays on the legacy confirm path because it does
    // NOT go through commitWithCascade (the issue had no dates, no relations
    // to cascade). Only cascade-eligible issue states are rerouted to
    // ConfirmCascadePopup. At this point state has been narrowed past
    // idle/hover-bar by the early return on line 613, and past
    // connector-drawing/connector-target-hover by the handlers earlier in
    // this function, so accessing state.target is type-safe.
    const cascadeEligibleIssue =
      (state.kind === 'dragging-body' || state.kind === 'resizing-left' || state.kind === 'resizing-right') &&
      state.target.kind === 'issue'

    // activeDrag is no longer reset at this point — neither for cascade
    // nor legacy paths. The bar must visually stay at its preview position
    // while ANY confirmation popup is open (cascade popup OR the legacy
    // GanttConfirmCommitPopup); springing back only when the user clicks
    // Cancel. Each downstream exit path (cascade-popup resultHandler,
    // askConfirm cancel/confirm, commit success/failure) is responsible
    // for releasing the preview.

    try {
      // For cascade-eligible issue states, ConfirmCascadePopup (or the
      // legacy GanttConfirmCommitPopup in the no-cascade case) is the single
      // confirmation point. For milestones and unscheduled-drag the existing
      // askConfirm path stays in use — but it now also defers the
      // bar-springs-back to *after* the popup resolves.
      if (needsConfirm && !cascadeEligibleIssue) {
        const proceed = await askConfirm(state)
        if (!proceed) {
          // User cancelled: bar springs back now.
          activeDrag.set({ kind: 'idle' })
          return
        }
      }
      await commitDrag(state, e)
      // commitDrag's legacy branches (milestone, dragging-unscheduled) set
      // activeDrag to idle themselves after their ops.commit() returns —
      // see commitDrag below. The cascade path (commitWithCascade) hands
      // off ownership to the popup resultHandler and only sets idle when
      // that handler fires, NOT when commitDrag returns. So we must NOT
      // unconditionally reset here: doing so would tear down the cascade
      // popup's preview the instant commitDrag returned (popup still open,
      // bar already springing back.
    } catch (err) {
      const title = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
      activeDrag.set({ kind: 'idle' })
    }
  }

  /** True when the preview window is different from the origin window. */
  function previewChangedFromOrigin (state: DragState): boolean {
    if (state.kind === 'dragging-body' || state.kind === 'dragging-unscheduled') {
      return state.previewStart !== state.originStart || state.previewEnd !== state.originEnd
    }
    if (state.kind === 'resizing-left') return state.previewStart !== state.originStart
    if (state.kind === 'resizing-right') return state.previewEnd !== state.originEnd
    return false
  }

  /**
   * Open the confirm dialog and resolve true on Apply / false on Cancel.
   * The popup dispatches `close` with a boolean payload, which Huly's
   * showPopup routes to the 4th-arg resultHandler.
   *
   * PR3.3: when the target is a Milestone, the confirm popup gets the
   * Milestone-shaped doc instead of an Issue. GanttConfirmCommitPopup
   * reads `issue.title` (or `issue.label`) and is already tolerant of
   * either field name — see its component header.
   */
  async function askConfirm (state: DragState): Promise<boolean> {
    // Narrow to drag/resize states that carry a `target` field.
    if (
      state.kind !== 'dragging-body' &&
      state.kind !== 'dragging-unscheduled' &&
      state.kind !== 'resizing-left' &&
      state.kind !== 'resizing-right'
    ) return false
    const newStart = state.kind === 'resizing-right' ? state.originStart : state.previewStart
    const newDue = state.kind === 'resizing-left' ? state.originEnd : state.previewEnd
    const kind: 'move' | 'resize' = state.kind === 'resizing-left' || state.kind === 'resizing-right' ? 'resize' : 'move'
    return await new Promise<boolean>((resolve) => {
      showPopup(
        GanttConfirmCommitPopup,
        { issue: state.target.doc, kind, newStart, newDue },
        'top',
        (result: boolean | undefined) => {
          resolve(result === true)
        }
      )
    })
  }

  /**
   * Commit a drag for an Issue target. Mirrors the PR3 commit path; the
   * cascade walks descendant issues (parent → children shift by delta).
   */
  async function commitIssueDrag (state: DragState, target: { kind: 'issue', doc: Issue }, ops: ApplyOperations): Promise<void> {
    if (state.kind === 'dragging-body') {
      await ops.update(target.doc, { startDate: (state as any).previewStart, dueDate: (state as any).previewEnd })
      const delta = (state as any).previewStart - (state as any).originStart
      if (delta !== 0) {
        // Fetch the full space's issues here rather than reusing the
        // view-filtered `issues` array — otherwise children hidden by an
        // active Tracker filter wouldn't shift with the parent and the
        // tree would drift out of sync.
        const client = getClient()
        const allInSpace = await client.findAll(tracker.class.Issue, { space: target.doc.space })
        for (const child of descendantsWithDates(target.doc, allInSpace)) {
          await ops.update(child, {
            startDate: (child.startDate as number) + delta,
            dueDate: (child.dueDate as number) + delta
          })
        }
      }
    } else if (state.kind === 'dragging-unscheduled') {
      // Unscheduled-drag only schedules the parent issue. originStart is the
      // synthetic "today" anchor — using its delta to shift existing scheduled
      // descendants would move them by a wildly unrelated amount.
      // Descendants stay put; the user can drag the
      // (now-scheduled) parent again to do a coordinated shift.
      await ops.update(target.doc, { startDate: (state as any).previewStart, dueDate: (state as any).previewEnd })
    } else if (state.kind === 'resizing-left') {
      await ops.update(target.doc, { startDate: (state as any).previewStart })
    } else if (state.kind === 'resizing-right') {
      await ops.update(target.doc, { dueDate: (state as any).previewEnd })
    }
  }

  /**
   * Commit a drag for a Milestone target (PR3.3 2026-05-11).
   * Field mapping: Issue.dueDate ↔ Milestone.targetDate; startDate is shared.
   * Cascade (brainstorm decision B): when the milestone moves, all issues
   * assigned to it shift by the same delta along with their descendants.
   * No cascade for resize — only the milestone bounds change.
   */
  async function commitMilestoneDrag (state: DragState, target: { kind: 'milestone', doc: Milestone }, ops: ApplyOperations): Promise<void> {
    if (state.kind === 'dragging-body') {
      await ops.update(target.doc, { startDate: (state as any).previewStart, targetDate: (state as any).previewEnd })
      const delta = (state as any).previewStart - (state as any).originStart
      if (delta !== 0) {
        const client = getClient()
        const allInSpace = await client.findAll(tracker.class.Issue, { space: target.doc.space })
        const assigned = allInSpace.filter((i) =>
          (i as unknown as { milestone?: string | null }).milestone === target.doc._id
        )
        // Shift assigned issues + their descendants. Same dedup logic as
        // descendantsWithDates: only issues with both dates set get shifted.
        const shiftRoots = new Set<string>()
        const toShift: Issue[] = []
        for (const a of assigned) {
          if (a.startDate == null || a.dueDate == null) continue
          if (!shiftRoots.has(String(a._id))) {
            shiftRoots.add(String(a._id))
            toShift.push(a)
          }
          for (const child of descendantsWithDates(a, allInSpace)) {
            if (!shiftRoots.has(String(child._id))) {
              shiftRoots.add(String(child._id))
              toShift.push(child)
            }
          }
        }
        for (const i of toShift) {
          await ops.update(i, {
            startDate: (i.startDate as number) + delta,
            dueDate: (i.dueDate as number) + delta
          })
        }
      }
    } else if (state.kind === 'resizing-left') {
      await ops.update(target.doc, { startDate: (state as any).previewStart })
    } else if (state.kind === 'resizing-right') {
      await ops.update(target.doc, { targetDate: (state as any).previewEnd })
    }
    // Milestones can't enter dragging-unscheduled (no drag-grip in the
    // sidebar for them), so that branch is unreachable.
  }

  async function commitWithCascade (
    primaryEdits: PrimaryEdit[],
    altKey: boolean,
    space: Issue['space'],
    legacyConfirmKind: 'move' | 'resize' | 'none'
  ): Promise<void> {
    const client = getClient()

    // Full-space lookup is needed for both branches — the alt-bypass branch
    // also needs to resolve hidden predecessors/successors when counting
    // direct violations, otherwise filter-hidden relations are invisible
    // to the warning banner.
    const allInSpace = await client.findAll(tracker.class.Issue, { space })
    const allByRef = new Map<Ref<Issue>, Issue>()
    for (const i of allInSpace) allByRef.set(i._id, i)

    if (altKey) {
      const ops = client.apply(undefined, 'gantt-cascade-bypass')
      for (const pe of primaryEdits) {
        await ops.update(pe.issue, { startDate: pe.newStart, dueDate: pe.newDue })
      }
      const result = await ops.commit()
      if (!result.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        activeDrag.set({ kind: 'idle' })
        return
      }
      // Count direct violations against full-space relations + full-space issue dates.
      let violations = 0
      const primarySet = new Set(primaryEdits.map((p) => String(p.issue._id)))
      for (const pe of primaryEdits) {
        for (const r of relations) {
          const involvesPrimary = String(r.attachedTo) === String(pe.issue._id) || String(r.target) === String(pe.issue._id)
          if (!involvesPrimary) continue
          const otherRef = String(r.attachedTo) === String(pe.issue._id) ? r.target : r.attachedTo
          if (primarySet.has(String(otherRef))) continue
          const otherIssue = allByRef.get(otherRef as Ref<Issue>)
          if (otherIssue === undefined || otherIssue.startDate == null || otherIssue.dueDate == null) continue
          if (!relationSatisfied(r, pe, otherIssue)) violations++
        }
      }
      if (violations > 0) {
        const t = await translate(tracker.string.CascadeBannerBypass, { count: violations }, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Warning)
      }
      activeDrag.set({ kind: 'idle' })
      return
    }

    // Non-bypass path: permission map (allInSpace already fetched above).
    const canEditMap = new Map<Ref<Issue>, boolean>()
    await Promise.all(
      allInSpace.map(async (i) => {
        canEditMap.set(i._id, await canEditIssue(i))
      })
    )

    const result: SimulateResult = simulateCascade(
      primaryEdits,
      allInSpace,
      relations,
      (ref) => canEditMap.get(ref) ?? false
    )

    switch (result.kind) {
      case 'no-cascade': {
        // Three sub-paths depending on the shape of the edit:
        //   (a) Single-issue primary + legacy toggle on → GanttConfirmCommitPopup (PR3.3 behaviour preserved)
        //   (b) Multi-issue primary (parent-drag) → ConfirmCascadePopup with shifts=[]
        //       so the user sees the children that will move together.
        //   (c) Single-issue primary + legacy toggle off → commit directly
        if (primaryEdits.length > 1) {
          // Parent-drag (or any multi-primary commit) — show the mini-timeline
          // confirm so the user sees every issue that will move.
          //
          // Keep the dragState alive (do NOT reset to idle here) so the
          // dragged bars remain at their preview positions while the user
          // decides. activeDrag is only released after the popup resolves —
          // commit → idle on success, cancel → idle on dismiss.
          showPopup(
            ConfirmCascadePopup,
            {
              primary: result.primary,
              shifts: [],
              skippedUnscheduled: 0,
              lockedIssues: []
            },
            'middle',
            (ok: boolean) => {
              if (ok !== true) {
                activeDrag.set({ kind: 'idle' })
                return
              }
              void commitCascadeBatch(result.primary, []).finally(() => {
                activeDrag.set({ kind: 'idle' })
              })
            }
          )
          return
        }
        if (legacyConfirmKind !== 'none') {
          const pe = primaryEdits[0]
          const ok = await new Promise<boolean>((resolve) => {
            showPopup(
              GanttConfirmCommitPopup,
              { issue: pe.issue, kind: legacyConfirmKind, newStart: pe.newStart, newDue: pe.newDue },
              'top',
              (r: boolean | undefined) => resolve(r === true)
            )
          })
          if (!ok) {
            activeDrag.set({ kind: 'idle' })
            return
          }
        }
        const ops = client.apply(undefined, 'gantt-no-cascade')
        for (const pe of result.primary) {
          await ops.update(pe.issue, { startDate: pe.newStart, dueDate: pe.newDue })
        }
        const r = await ops.commit()
        if (!r.result) {
          const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
          addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        }
        // No popup, no further async — release the preview now that the
        // server-state has caught up (or failed). The bar transitions from
        // its preview position to the freshly committed issue.startDate.
        activeDrag.set({ kind: 'idle' })
        return
      }
      case 'cascade':
      case 'permission-denied': {
        // Keep the live preview alive while the popup is open so the
        // dragged bar visually stays at the proposed position. activeDrag
        // is released only when the popup resolves: idle-after-commit on
        // confirm so the bar transitions cleanly to its new server-state,
        // or idle-on-cancel so the bar springs back to its original dates.
        showPopup(
          ConfirmCascadePopup,
          {
            primary: result.primary,
            shifts: result.shifts,
            skippedUnscheduled: 'skippedUnscheduled' in result ? result.skippedUnscheduled : 0,
            lockedIssues: result.kind === 'permission-denied' ? result.lockedIssues : []
          },
          'middle',
          (ok: boolean) => {
            if (ok !== true) {
              activeDrag.set({ kind: 'idle' })
              return
            }
            if (result.kind === 'permission-denied') {
              // Confirm is disabled in the popup; defensively treat
              // a `true` close as a cancel — release the preview.
              activeDrag.set({ kind: 'idle' })
              return
            }
            void commitCascadeBatch(result.primary, result.shifts).finally(() => {
              activeDrag.set({ kind: 'idle' })
            })
          }
        )
        return
      }
      case 'cycle': {
        activeDrag.set({ kind: 'idle' })
        const t = await translate(tracker.string.CascadeBannerCycle, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        return
      }
      case 'iteration-overflow': {
        activeDrag.set({ kind: 'idle' })
        const t = await translate(tracker.string.CascadeBannerOverflow, { max: 1000 }, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        return
      }
    }
  }

  async function commitCascadeBatch (
    primary: PrimaryEdit[],
    shifts: CascadeShift[]
  ): Promise<void> {
    const client = getClient()
    const ops = client.apply(undefined, 'gantt-cascade-commit')
    for (const pe of primary) {
      await ops.update(pe.issue, { startDate: pe.newStart, dueDate: pe.newDue })
    }
    for (const sh of shifts) {
      await ops.update(sh.issue, { startDate: sh.newStart, dueDate: sh.newDue })
    }
    const r = await ops.commit()
    if (!r.result) {
      const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  /**
   * Returns true iff the relation `r` is satisfied given the proposed
   * primary edit `pe` and the current dates of the other side. Used for
   * the Alt-bypass violation count only.
   */
  function relationSatisfied (
    r: IssueRelation,
    pe: PrimaryEdit,
    otherIssue: Issue
  ): boolean {
    const isOutgoing = String(r.attachedTo) === String(pe.issue._id)
    const predStart = isOutgoing ? pe.newStart : (otherIssue.startDate as number)
    const predDue = isOutgoing ? pe.newDue : (otherIssue.dueDate as number)
    const succStart = isOutgoing ? (otherIssue.startDate as number) : pe.newStart
    const succDue = isOutgoing ? (otherIssue.dueDate as number) : pe.newDue
    const lag = r.lag ?? 0
    switch (r.kind) {
      case 'finish-to-start': return addScheduleDays(predDue, lag) <= succStart
      case 'start-to-start': return addScheduleDays(predStart, lag) <= succStart
      case 'finish-to-finish': return addScheduleDays(predDue, lag) <= succDue
      case 'start-to-finish': return addScheduleDays(predStart, lag) <= succDue
    }
  }

  async function commitDrag (state: DragState, event?: PointerEvent | MouseEvent): Promise<void> {
    // Narrow to drag/resize states that carry a `target` field.
    if (
      state.kind !== 'dragging-body' &&
      state.kind !== 'dragging-unscheduled' &&
      state.kind !== 'resizing-left' &&
      state.kind !== 'resizing-right'
    ) return
    // Guard: an unscheduled-drag that never reached the canvas (e.g. the user
    // clicked the drag-grip and released without moving) must NOT silently
    // schedule the issue to "today".
    if (state.kind === 'dragging-unscheduled' && !state.hasCanvasTarget) return
    const altKey = event?.altKey === true
    const client = getClient()

    // Milestone path — unchanged from PR3.3. The existing
    // `commitMilestoneDrag(state, target, ops)` signature
    // (line ~713: state: DragState, target: { kind: 'milestone', doc:
    // Milestone }, ops: ApplyOperations) handles dragging-body,
    // resizing-left and resizing-right; dragging-unscheduled is
    // unreachable for milestones.
    if (state.target.kind === 'milestone') {
      const ops = client.apply('gantt-drag')
      await commitMilestoneDrag(state, state.target, ops)
      const r = await ops.commit()
      if (!r.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
      }
      // Legacy path manages its own preview lifecycle.
      activeDrag.set({ kind: 'idle' })
      return
    }

    // Issue dragging-unscheduled — no relations to cascade, keep PR3
    // single-update commit via commitIssueDrag.
    if (state.kind === 'dragging-unscheduled') {
      const ops = client.apply('gantt-drag')
      await commitIssueDrag(state, state.target, ops)
      const r = await ops.commit()
      if (!r.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
      }
      // Legacy path manages its own preview lifecycle.
      activeDrag.set({ kind: 'idle' })
      return
    }

    // Cascade-eligible issue states (dragging-body, resizing-*).
    // Parent-drag detection: check full space for children.
    if (state.kind === 'dragging-body' && state.target.kind === 'issue') {
      const parent = state.target.doc
      const allInSpace = await client.findAll(tracker.class.Issue, { space: parent.space })
      const isParent = allInSpace.some((i) => i.parents?.[0]?.parentId === parent._id)
      if (isParent) {
        const delta = (state as any).previewStart - (state as any).originStart
        const primaryEdits: PrimaryEdit[] = [{
          issue: parent,
          newStart: (state as any).previewStart,
          newDue: (state as any).previewEnd
        }]
        for (const child of descendantsWithDates(parent, allInSpace)) {
          primaryEdits.push({
            issue: child,
            newStart: (child.startDate as number) + delta,
            newDue: (child.dueDate as number) + delta
          })
        }
        // Parent-drag fans out → primaryEdits.length > 1, so commitWithCascade
        // will skip the legacy popup branch anyway. Pass 'none' for clarity.
        await commitWithCascade(primaryEdits, altKey, parent.space, 'none')
        return
      }
      // Childless issue falls through to the leaf branch below.
    }

    if (state.kind === 'dragging-body') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [{
        issue: target,
        newStart: (state as any).previewStart,
        newDue: (state as any).previewEnd
      }]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmMove ? 'move' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
    if (state.kind === 'resizing-left') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [{
        issue: target,
        newStart: (state as any).previewStart,
        newDue: target.dueDate as number
      }]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmResize ? 'resize' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
    if (state.kind === 'resizing-right') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [{
        issue: target,
        newStart: target.startDate as number,
        newDue: (state as any).previewEnd
      }]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmResize ? 'resize' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
  }

  function attachWindowDragListeners (): void {
    window.addEventListener('pointermove', handleCanvasPointerMove)
    window.addEventListener('pointerup', handleCanvasPointerUp)
    window.addEventListener('pointercancel', handleCanvasPointerUp)
    window.addEventListener('mousemove', handleCanvasPointerMove)
    window.addEventListener('mouseup', handleCanvasPointerUp)
  }

  function detachWindowDragListeners (): void {
    window.removeEventListener('pointermove', handleCanvasPointerMove)
    window.removeEventListener('pointerup', handleCanvasPointerUp)
    window.removeEventListener('pointercancel', handleCanvasPointerUp)
    window.removeEventListener('mousemove', handleCanvasPointerMove)
    window.removeEventListener('mouseup', handleCanvasPointerUp)
  }

  // Attach/detach window-level pointer listeners only while a drag is active.
  // Connector creation starts from pointerdown; handleConnectorDown also
  // attaches immediately so the first pointermove cannot race Svelte's flush.
  $: if ($activeDrag.kind !== 'idle' && $activeDrag.kind !== 'hover-bar') {
    attachWindowDragListeners()
  } else {
    detachWindowDragListeners()
  }
  onDestroy(() => {
    detachWindowDragListeners()
  })

  /**
   * Slim the Gantt context menu by deny-listing actions that are noise for a
   * Gantt-specific right-click. Keeps Open (Issue's overridden EditIssue
   * action), Status/Priority/Assignee submenus (›), Set start/due date,
   * Add sub-issue, Set parent issue, Copy ID/URL, Duplicate, Delete.
   *
   * Deny-list (vs. allow-list) is needed because tracker registers a custom
   * Open action for `tracker.class.Issue` with an auto-generated ID; allow-
   * listing by static ID misses it. The menu is otherwise too tall; keep
   * parent/sub-issue access and drop the columns that are already in the
   * sidebar.
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
    'tracker:action:UnsetParent',
    // Below are surfaced via the local Hierarchy ▸ submenu instead, so the
    // top-level menu has one collapsed entry rather than three separate ones.
    'tracker:action:SetParent',
    'tracker:action:NewSubIssue'
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
      target: { kind: 'issue', doc: e.detail.issue },
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
    const allInSpace = await getClient().findAll(tracker.class.Issue, { space: i.space })
    // All date arithmetic routes through addScheduleDays so the Phase-2
    // working-calendar swap stays a single integration point (Spec §5.3).
    const primaryEdits: PrimaryEdit[] = [{
      issue: i,
      newStart: addScheduleDays(i.startDate, days),
      newDue: addScheduleDays(i.dueDate, days)
    }]
    // Include descendants (matches PR3 behaviour for parent shifts).
    for (const child of descendantsWithDates(i, allInSpace)) {
      primaryEdits.push({
        issue: child,
        newStart: addScheduleDays(child.startDate as number, days),
        newDue: addScheduleDays(child.dueDate as number, days)
      })
    }
    // Keyboard shift has no Alt-modifier path and no legacy-confirm UX
    // (the toggle is tied to mouse drag, not keyboard). Always run cascade
    // simulation, never show legacy popup.
    await commitWithCascade(primaryEdits, false, i.space, 'none')
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
      return
    }
    // Phase 1.D — direct zoom-level keys (Linear-style) and jump-to-today.
    // Only fire on bare key (no Ctrl/Cmd/Alt) so we don't hijack browser
    // shortcuts like Ctrl+D = bookmark. Use setZoom() so the horizontal
    // scroll + viewport sync match the toolbar buttons exactly.
    //
    // Skip when an editable element (input/textarea/select/contentEditable)
    // inside the Gantt root has focus — typing into an inline rename or
    // filter field should not zoom-switch the canvas.
    const target = e.target as Element | null
    const isEditable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !isEditable) {
      if (e.key === 'd' || e.key === 'D') { setZoom('day');     e.preventDefault(); return }
      if (e.key === 'w' || e.key === 'W') { setZoom('week');    e.preventDefault(); return }
      if (e.key === 'm' || e.key === 'M') { setZoom('month');   e.preventDefault(); return }
      if (e.key === 'q' || e.key === 'Q') { setZoom('quarter'); e.preventDefault(); return }
      if (e.key === 't' || e.key === 'T') { jumpToToday();      e.preventDefault(); return }
    }

    // PR6: zoom shortcuts. `+` / `=` zoom in, `-` zoom out. The same
    // key positions as the browser's native zoom but scoped to the Gantt.
    if (e.key === '+' || e.key === '=') {
      cycleZoom(1)
      e.preventDefault()
      return
    }
    if (e.key === '-' || e.key === '_') {
      cycleZoom(-1)
      e.preventDefault()
      return
    }
    // PR6: '?' or Shift+/ shows the keyboard help overlay.
    if (e.key === '?') {
      showPopup(GanttHelpPopup, {}, 'middle')
      e.preventDefault()
      return
    }
    // PR6: 'e' / 'E' exports the visible Gantt SVG to PNG.
    if (e.key === 'e' || e.key === 'E') {
      void exportToPng()
      e.preventDefault()
    }
  }

  function cycleZoom (delta: number): void {
    const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
    const idx = levels.indexOf(zoom)
    const next = levels[Math.min(levels.length - 1, Math.max(0, idx + delta))]
    if (next !== zoom) setZoom(next)
  }

  // PNG export — captures the entire `.gantt-root` (sidebar + sticky
  // header + canvas SVG) via html2canvas. The lib is dynamically
  // imported by the exporter so it only lands in the user's browser
  // when this button is clicked (~750 KB chunk, lazy-loaded).
  async function exportToPng (): Promise<void> {
    if (containerEl == null) return
    try {
      await exportElementAndDownloadPng(containerEl, `gantt-${new Date().toISOString().slice(0, 10)}`)
    } catch (err) {
      const title = await translate(tracker.string.GanttExportFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  // PDF export — rasterises the gantt-root with html2canvas at 2× DPI
  // and embeds the resulting JPEG into a landscape A4 PDF via jsPDF,
  // then triggers a browser download. Replaces the old `window.print()`
  // path which only opened the system print dialog instead of producing
  // a file. Both html2canvas and jsPDF are dynamic-imported inside the
  // exporter — neither lib bloats the main bundle.
  async function exportToPdf (): Promise<void> {
    if (containerEl == null) return
    try {
      await exportElementToPdf(containerEl, `gantt-${new Date().toISOString().slice(0, 10)}`)
    } catch (err) {
      const title = await translate(tracker.string.GanttExportFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  // Phase 2.3b — fullscreen toggle. Uses the standard browser
  // Fullscreen API. Walk up the DOM from gantt-root to find an
  // ancestor that includes the second header row (the row with
  // Filter + Date-Nav + Zoom + PNG/PDF/Fullscreen + ModeSelector)
  // so that the toolbar stays accessible in fullscreen. If we
  // fullscreened only gantt-root the user would lose access to
  // Today/Day/Week/Month/Quarter without exiting fullscreen.
  //
  // Strategy: find the nearest popupPanel-body, .app-content, or
  // body element that wraps both the SpaceHeader and GanttView.
  // Fallback to body if nothing matches.
  function getFullscreenTarget (): Element | null {
    if (containerEl == null) return null
    let el: Element | null = containerEl
    while (el != null && el !== document.body) {
      const cls = el.className?.toString() ?? ''
      if (cls.includes('popupPanel-body') || cls.includes('app-content') ||
          cls.includes('antiPanel-application')) {
        return el
      }
      el = el.parentElement
    }
    return document.body
  }

  function toggleFullscreen (): void {
    if (document.fullscreenElement != null) {
      void document.exitFullscreen().catch(() => {})
      return
    }
    const target = getFullscreenTarget()
    if (target == null) return
    void (target as HTMLElement).requestFullscreen().catch(() => {})
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
  })
  onDestroy(() => {
    window.removeEventListener('keydown', onKey)
    // PR5 cleanup: the critical-path recompute is debounced via
    // setTimeout. If the view unmounts while a pending recompute is
    // queued, the timer would fire after our reactive store handles
    // were already torn down — clearing the handle prevents both the
    // dangling reactive write and the late notification banner.
    if (cpDirtyTimer !== null) {
      clearTimeout(cpDirtyTimer)
      cpDirtyTimer = null
    }
  })

  function jumpToToday (): void {
    if (hScrollEl == null) return
    const x = timeScale.toX(Date.now())
    hScrollEl.scrollTo({ left: Math.max(0, x - canvasViewportWidth / 2), behavior: 'smooth' })
  }
  function pageScroll (dir: -1 | 1): void {
    if (hScrollEl == null) return
    hScrollEl.scrollBy({ left: dir * canvasViewportWidth * 0.8, behavior: 'smooth' })
  }
  function jumpToStart (): void {
    if (hScrollEl == null) return
    hScrollEl.scrollTo({ left: 0, behavior: 'smooth' })
  }
  function jumpToEnd (): void {
    if (hScrollEl == null) return
    hScrollEl.scrollTo({ left: hScrollEl.scrollWidth, behavior: 'smooth' })
  }
  function jumpToDate (iso: string): void {
    if (hScrollEl == null || iso === '') return
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
    if (scrollerEl == null) return
    dragVThumb = true
    dragVThumbStartY = e.clientY
    dragVThumbStartScroll = scrollerEl.scrollTop
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onVThumbDragMove (e: PointerEvent): void {
    if (!dragVThumb || scrollerEl == null) return
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
    if (hScrollEl == null) return
    dragThumb = true
    dragThumbStartX = e.clientX
    dragThumbStartScroll = hScrollEl.scrollLeft
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onThumbDragMove (e: PointerEvent): void {
    if (!dragThumb || hScrollEl == null) return
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
    if (hScrollEl == null) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const dir = clickX < hThumbLeft ? -1 : 1
    hScrollEl.scrollBy({ left: dir * hTrackWidth * 0.8, behavior: 'smooth' })
  }

  // Wheel-forwarding is no longer needed: sidebar lives inside the same
  // .gantt-scroller as the canvas, with position:sticky;left:0. Browser
  // handles native scrolling at the right speed regardless of where the
  // mouse hovers inside the scroller.

  // Click-and-drag panning across canvas area, including normal Gantt bars.
  let panning = false
  let pendingPan = false
  let panStartX = 0
  let panStartY = 0
  let panStartScrollLeft = 0
  let panStartScrollTop = 0
  function onCanvasPanStart (e: PointerEvent): void {
    if (scrollerEl == null || hScrollEl == null) return
    const target = e.target as HTMLElement
    if (!shouldStartCanvasPan(target)) return
    pendingPan = true
    panStartX = e.clientX
    panStartY = e.clientY
    panStartScrollLeft = hScrollEl.scrollLeft
    panStartScrollTop = scrollerEl.scrollTop
  }
  function onCanvasPanMove (e: PointerEvent): void {
    if ((!pendingPan && !panning) || scrollerEl == null || hScrollEl == null) return
    const dx = e.clientX - panStartX
    const dy = e.clientY - panStartY
    if (pendingPan) {
      if (!shouldPromoteCanvasPan(dx, dy)) return
      pendingPan = false
      panning = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    hScrollEl.scrollLeft = panStartScrollLeft - (e.clientX - panStartX)
    scrollerEl.scrollTop = panStartScrollTop - (e.clientY - panStartY)
  }
  function onCanvasPanEnd (e: PointerEvent): void {
    // Guard: only release the pointer if we actually captured it. A pointerup
    // bubbling from a child element that was excluded by the pan-handler
    // exclusion list (e.g. resize-handle, drag-grip) shouldn't reach
    // releasePointerCapture, but browsers throw `InvalidStateError` if the
    // element isn't actually capturing the given pointerId.
    if (pendingPan) {
      pendingPan = false
      return
    }
    if (!panning) return
    panning = false
    lastCanvasPanEndedAt = Date.now()
    const el = e.currentTarget as HTMLElement
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
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
  let observedScrollerEl: HTMLDivElement | null = null
  let observedHScrollEl: HTMLDivElement | null = null
  function syncViewport (): void {
    if (scrollerEl != null) {
      scrollTop = scrollerEl.scrollTop
      viewportHeight = scrollerEl.clientHeight
    }
    if (hScrollEl != null) {
      canvasViewportLeft = hScrollEl.scrollLeft
      canvasViewportWidth = hScrollEl.clientWidth
    } else if (scrollerEl != null) {
      // Before the horizontal-scroll proxy is rendered, derive the canvas
      // viewport from the visible scroller minus sticky sidebar + resize cell.
      // Otherwise the initial 1200px fallback can suppress hHasOverflow
      // forever in narrower layouts, hiding the Plane-style bottom bar.
      canvasViewportLeft = 0
      canvasViewportWidth = computeCanvasViewportWidth(scrollerEl.clientWidth, sidebarWidthPx, RESIZE_CELL_W)
    }
  }
  $: if (scrollerEl != null) queueMicrotask(syncViewport)
  $: if (hScrollEl != null) queueMicrotask(syncViewport)
  $: if (resizeObs !== undefined && scrollerEl != null && observedScrollerEl !== scrollerEl) {
    resizeObs.observe(scrollerEl)
    observedScrollerEl = scrollerEl
    queueMicrotask(syncViewport)
  }
  $: if (resizeObs !== undefined && hScrollEl != null && observedHScrollEl !== hScrollEl) {
    resizeObs.observe(hScrollEl)
    observedHScrollEl = hScrollEl
    queueMicrotask(syncViewport)
  }
  $: if (hScrollEl == null && observedHScrollEl !== null) {
    observedHScrollEl = null
    queueMicrotask(syncViewport)
  }
  onMount(() => {
    syncViewport()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => syncViewport())
      if (scrollerEl != null) resizeObs.observe(scrollerEl)
      if (hScrollEl != null) resizeObs.observe(hScrollEl)
    }
  })
  onDestroy(() => {
    resizeObs?.disconnect()
    // Phase 2 — clear the toolbar bus on unmount so the controls
    // disappear from IssuesView's header when the user switches away
    // from the Gantt viewlet.
    ganttToolbarApi.set(null)
  })

  // Phase 2 — keep the toolbar bus in sync with our local state.
  // The store re-writes on every change of `zoom` or `datePickerValue`,
  // which causes the GanttToolbarControls component in IssuesView's
  // header-tools slot to re-render with the current values. Setting
  // the store also imperatively publishes the handler functions so
  // the consumer can invoke them.
  $: ganttToolbarApi.set({
    zoom,
    datePickerValue,
    setZoom,
    jumpToToday,
    jumpToStart,
    jumpToEnd,
    pageScroll,
    jumpToDate,
    cycleZoom,
    toggleFullscreen,
    exportToPng,
    exportToPdf
  })

  $: viewport = { left: canvasViewportLeft, right: canvasViewportLeft + canvasViewportWidth }
  // v121.2 fix — when the extended sidebar grid is on, the per-column resize
  // handles in the header drive width directly, so the outer sidebar-cell
  // must size to the columns sum (not the legacy slider value). Otherwise
  // the extended grid overflows the outer grid column horizontally and
  // either clips or paints over the canvas. The legacy slider remains the
  // source of truth when the extended grid is off.
  $: sidebarWidthPx = extendedColumns
    ? computeTotalWidth(sidebarColumns, sidebarWidths)
    : ((showIssueCode || showTitle || showStatus) ? userSidebarWidth : 60)

  // Phase 3a — sidebar column state. Columns + widths default to the
  // Phase-2-equivalent identifier/title/predecessors/slack quartet so the
  // extended-grid path mirrors the legacy sidebar's column list at startup.
  // Width changes from the header-cell resize handle are mutated in-place
  // (transient, not persisted in v1).
  let sidebarColumns: readonly SidebarColumnKey[] = DEFAULT_COLUMNS
  let sidebarWidths: Record<string, number> = { ...DEFAULT_WIDTHS }
  let sidebarSort: GanttSortState = { column: null, direction: 'asc' }

  function onSidebarSort (evt: CustomEvent<{ column: SidebarColumnKey }>): void {
    sidebarSort = cycleSort(sidebarSort, evt.detail.column)
  }

  function onSidebarWidthChange (evt: CustomEvent<{ column: SidebarColumnKey, width: number, commit: boolean }>): void {
    sidebarWidths = { ...sidebarWidths, [evt.detail.column]: evt.detail.width }
    // commit=true currently only signals end-of-drag; persistence to user
    // preferences is a Phase-3a.v2 follow-up.
  }

  /**
   * Phase 3a — sort had to live as a post-flatten pass to preserve the legacy
   * `buildLayout` API. Tier-4 Item 12 moved the sort into `buildLayout` itself
   * (`withinLevelCompare`), so it now respects the hierarchy: siblings sort,
   * tree-structure preserved (Spec §"Sort within hierarchy level").
   *
   * `sortedRows` stays as an identity pass-through so the diff against
   * downstream consumers (canvas, dependency layer, virtualization slice)
   * remains minimal. When group-by is active, the within-group-compare in
   * `buildGroupedRows` already covers that path.
   */
  $: sortedRows = rows

  // Tier-2 Item 6 — Bulk-Select. Two derived stores feed downstream:
  //   • `multiSelectedIdStrings` — what GanttCanvas / GanttBar consume as
  //     a Set<string>. Decoupled from the `Ref<Issue>`-typed master set
  //     so the canvas's stringified row keys can do O(1) lookups without
  //     casting.
  //   • `orderedSelectableIds` — visible-row order of issues, used by
  //     Cmd-A / Shift-range. Filters out group-header / milestone rows
  //     and unscheduled issues — the spec scopes Cmd-A to "visible
  //     issues", which in the Gantt context means rows that render a bar.
  $: multiSelectedIdStrings = (() => {
    const out = new Set<string>()
    for (const id of multiSelectedIssueIds) out.add(String(id))
    return out
  })()
  $: orderedSelectableIds = sortedRows
    .filter((r) => r.kind === 'issue' && r.issue !== null)
    .map((r) => (r.issue as Issue)._id)

  $: loading = loadingIssues || loadingMilestones
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div
  class="gantt-root"
  tabindex="0"
  bind:this={containerEl}
  on:click={onBackgroundClick}
>
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
            class:active={userPxPerDay === null && zoom === z}
            class:closest={userPxPerDay !== null && tickZoomLevel === z}
            on:click={() => setZoom(z)}
          >{z[0].toUpperCase() + z.slice(1)}</button>
        {/each}
      </div>
      <div class="toolbar-right">
        <!-- Tier-4 Item 12 — Tree-View — Expand-/Collapse-all controls for the
             hierarchy view. Hidden when group-by is active because the
             swimlane lanes are mutually exclusive with the tree (Spec §"Group-By + Tree"). -->
        {#if ganttGroupBy === 'none'}
          <!-- v121 fix — order was Expand → Collapse, swapped per user
               feedback so Collapse-all comes first (matches the visual
               left-to-right "compact ⇒ wide" reading order). -->
          <button
            type="button"
            class="gantt-toolbar-icon-btn gantt-tree-btn"
            use:tooltip={{ label: tracker.string.GanttCollapseAll }}
            aria-label={tracker.string.GanttCollapseAll}
            on:click={collapseAllTree}
          >
            <span class="gantt-tree-glyph" aria-hidden="true">▶▶</span>
          </button>
          <button
            type="button"
            class="gantt-toolbar-icon-btn gantt-tree-btn"
            use:tooltip={{ label: tracker.string.GanttExpandAll }}
            aria-label={tracker.string.GanttExpandAll}
            on:click={expandAllTree}
          >
            <span class="gantt-tree-glyph" aria-hidden="true">▼▼</span>
          </button>
        {/if}
        <!-- Phase 3c: Undo/Redo. The buttons mirror the Cmd+Z / Cmd+Shift+Z
             keyboard shortcuts wired in onKey() below — disabled state and
             tooltip description come from the UndoManager reactive stores.
             Sits before the filter button so the most frequent operations
             cluster together. -->
        <button
          type="button"
          class="gantt-toolbar-icon-btn"
          disabled={!$canUndo}
          use:tooltip={{ label: tracker.string.GanttUndo }}
          on:click={() => { void handleUndo() }}
          aria-label={$nextUndoDescription ?? ''}
        >
          <Icon icon={IconUndo} size="small" />
        </button>
        <button
          type="button"
          class="gantt-toolbar-icon-btn"
          disabled={!$canRedo}
          use:tooltip={{ label: tracker.string.GanttRedo }}
          on:click={() => { void handleRedo() }}
          aria-label={$nextRedoDescription ?? ''}
        >
          <Icon icon={IconRedo} size="small" />
        </button>
        <!-- v121.3-E — The Phase-3b gantt-toolbar Filter button + popup
             was removed. The standard Tracker FilterBar (FilterButton in
             IssuesView.svelte's second header row) is now the single
             source of filter truth: its `resultQuery` flows into
             GanttView's `query` prop, so server-side filtering is
             already applied and there's no need for a gantt-local
             priority-chips popup. Group-By stays here because it is a
             gantt-specific layout concern (swimlanes), not a filter. -->

        <!-- Tier-2 #7 — Saved Gantt-Views.
             Dropdown lists FilteredViews scoped to this viewlet (mine then
             shared); "__DEFAULT__" clears the selection, "__NEW__" opens
             the save popup. A "Modified" hint + circular-arrow button
             appears when the live state differs from the persisted
             zoomLevel of the selected view. -->
        <div class="gantt-savedview-wrap" use:tooltip={{ label: tracker.string.GanttSavedViewSelect }}>
          <Label label={tracker.string.GanttSavedViewSelect} />
          <!-- svelte-ignore a11y-no-onchange -->
          <select
            class="gantt-savedview-select"
            value={$selectedFilterStore?._id !== undefined && $selectedFilterStore.viewletId === viewlet?._id
              ? String($selectedFilterStore._id)
              : '__DEFAULT__'}
            on:change={onSavedViewSelectChange}
          >
            <option value="__DEFAULT__">— —</option>
            {#each ganttBuckets.mine as fv (fv._id)}
              <option value={String(fv._id)}>{fv.name}</option>
            {/each}
            {#if ganttBuckets.shared.length > 0}
              <option disabled>──────────</option>
              {#each ganttBuckets.shared as fv (fv._id)}
                <option value={String(fv._id)}>{fv.name} ★</option>
              {/each}
            {/if}
            <option disabled>──────────</option>
            <option value="__NEW__">+ …</option>
          </select>
          {#if savedViewModified}
            <span class="gantt-savedview-modified">
              <Label label={tracker.string.GanttSavedViewModified} />
            </span>
            <button
              type="button"
              class="gantt-toolbar-icon-btn"
              use:tooltip={{ label: tracker.string.GanttSavedViewUpdate }}
              aria-label={tracker.string.GanttSavedViewUpdate}
              on:click={onUpdateSavedViewClick}
            >
              <span class="gantt-toolbar-text-glyph" aria-hidden="true">↻</span>
            </button>
          {/if}
        </div>

        <div class="gantt-groupby-wrap" use:tooltip={{ label: tracker.string.GanttGroupOverridesHierarchy }}>
          <Label label={tracker.string.GanttGroupBy} />
          <!-- svelte-ignore a11y-no-onchange -->
          <select
            class="gantt-groupby-select"
            value={ganttGroupBy}
            on:change={onGroupBySelectChange}
          >
            {#each GROUP_BY_KEYS as key (key)}
              <option value={key}>
                {#if key === 'none'}<Label label={tracker.string.GanttGroupByNone} />
                {:else if key === 'status'}<Label label={tracker.string.GanttGroupByStatus} />
                {:else if key === 'priority'}<Label label={tracker.string.GanttGroupByPriority} />
                {:else if key === 'assignee'}<Label label={tracker.string.GanttGroupByAssignee} />
                {:else if key === 'component'}<Label label={tracker.string.GanttGroupByComponent} />
                {:else if key === 'milestone'}<Label label={tracker.string.GanttGroupByMilestone} />
                {:else if key === 'label'}<Label label={tracker.string.GanttGroupByLabel} />
                {/if}
              </option>
            {/each}
          </select>
        </div>
      </div>
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
      on:pointerdown={onScrollerPointerDown}
      on:pointermove={onCanvasPanMove}
      on:pointermove={onScrollerPointerMove}
      on:pointerup={onCanvasPanEnd}
      on:pointerup={onScrollerPointerUp}
      on:pointercancel={onCanvasPanEnd}
      on:pointercancel={onScrollerPointerCancel}
      on:wheel|nonpassive={onScrollerWheel}
    >
      <div
        class="gantt-grid"
        style="grid-template-columns: {sidebarWidthPx}px 5px 1fr; --sidebar-w: {sidebarWidthPx}px;"
      >
        <!-- Row 1: corner / resize-corner / time-axis header (all sticky-top).
             The corner shows column labels on the top half + an inline
             date-range navigation strip on the bottom half (Stitch-style).
             v121.2 — in extended-grid mode the legacy compact labels are
             replaced by the sortable/resizable extended header rendered by
             GanttSidebar so the headings actually match the visible cells. -->
        <div class="cell corner" class:extended-corner={extendedColumns} style="height: {HEADER_HEIGHT}px;">
          {#if extendedColumns}
            <GanttSidebar
              rows={[]}
              width={sidebarWidthPx}
              {showIssueCode}
              {showTitle}
              {showStatus}
              extendedColumns
              columns={sidebarColumns}
              widths={sidebarWidths}
              sort={sidebarSort}
              headerOnly
              on:sortChange={onSidebarSort}
              on:widthChange={onSidebarWidthChange}
            />
          {:else}
            <div class="corner-cols">
              <span class="col-toggle" />
              {#if showStatus}<span class="col-status" />{/if}
              {#if showIssueCode}<span class="col-id"><Label label={tracker.string.Issue} /></span>{/if}
              {#if showTitle}<span class="col-title"><Label label={tracker.string.Title} /></span>{/if}
              <span class="col-jump" />
            </div>
          {/if}
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
            <GanttHeader {timeScale} {viewport} totalWidth={totalCanvasWidth} dataWidth={dataCanvasWidth} height={HEADER_HEIGHT} />
          </div>
        </div>
        <!-- Row 2: sidebar (sticky-left) / resize handle (sticky-left) / canvas -->
        <div class="cell sidebar-cell">
          <GanttSidebar
            rows={sortedRows}
            width={sidebarWidthPx}
            {timeScale}
            viewportLeft={viewport.left}
            viewportRight={viewport.right}
            {showIssueCode}
            {showTitle}
            {showStatus}
            {hoveredRowId}
            {activeDrag}
            relations={displayedRelations}
            {showPredecessors}
            slack={cpResult.slack}
            criticalSet={cpResult.critical}
            {showCriticalPath}
            {showSlackColumn}
            {extendedColumns}
            columns={sidebarColumns}
            widths={sidebarWidths}
            sort={sidebarSort}
            {scrollTop}
            {viewportHeight}
            rowHeight={ROW_HEIGHT}
            on:jump={onJump}
            on:toggle={onToggle}
            on:openIssue={onIssueOpen}
            on:openMilestone={onMilestoneOpen}
            on:hoverRow={onRowHover}
            on:addIssue={newIssue}
            on:rowContextMenu={handleRowContextMenu}
            on:rowDragStart={handleRowDragStart}
            on:sortChange={onSidebarSort}
            on:widthChange={onSidebarWidthChange}
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
              dataWidth={dataCanvasWidth}
              milestoneStripHeight={MILESTONE_STRIP_HEIGHT}
              {hoveredRowId}
              {statusCategoryMap}
              {editableIssueIds}
              {activeDrag}
              {focusedIssueId}
              {selectedIssueId}
              multiSelectedIssueIds={multiSelectedIdStrings}
              {milestonesById}
              relations={displayedRelations}
              {connectedIds}
              {hoveredIssue}
              {hoveredEdge}
              criticalSet={cpResult.critical}
              criticalRelations={cpResult.criticalRelations}
              violatedRelations={cpResult.violatedRelations}
              cpSlack={cpResult.slack}
              {showCriticalPath}
              workingDaysConfig={workingDaysCfg}
              on:openIssue={onIssueOpen}
              on:hoverRow={onRowHover}
              on:barMouseDown={handleBarMouseDown}
              on:barClick={handleBarClick}
              on:contextMenu={handleBarContextMenu}
              on:openEditor={handleOpenEditor}
              on:hoverEdge={handleHoverEdge}
              on:connectorDown={handleConnectorDown}
              on:barHover={handleBarHover}
              on:scrollToRow={handleScrollToRow}
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
            <div class="tt-line"><Label label={tracker.string.GanttDurationTooltip} params={{ days }} /></div>
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
  .toolbar-right { display: flex; gap: 8px; justify-self: end; position: relative; align-items: center; }
  /* v121.3-E — Group-By controls. The Filter-related `.gantt-filter-*`
     blocks were removed together with the toolbar Filter button; the
     standard FilterBar in IssuesView now owns filter state. */
  .gantt-toolbar-icon-btn {
    height: 26px;
    width: 26px;
    padding: 0;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .gantt-toolbar-icon-btn:hover:not(:disabled) { background: var(--theme-button-hovered); }
  .gantt-toolbar-icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  /* Tier-4 Item 12 — tree expand/collapse-all glyphs.
     Two stacked carets read more like "all rows" than a single caret. */
  .gantt-tree-glyph {
    font-size: 8px;
    line-height: 1;
    letter-spacing: -1px;
    font-weight: bold;
    color: var(--theme-content-color);
    pointer-events: none;
  }
  .gantt-filter-btn {
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .gantt-filter-btn:hover { background: var(--theme-button-hovered); }
  .gantt-filter-btn.has-active-filter {
    background: var(--theme-button-pressed);
    font-weight: 600;
  }
  .gantt-filter-badge {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--theme-warning-color, #d4a017);
    color: var(--theme-content-color);
    font-size: 10px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .gantt-filter-popup {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 30;
    min-width: 200px;
    padding: 8px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-popup-color, var(--theme-comp-header-color));
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    font-size: 12px;
    color: var(--theme-content-color);
  }
  .gantt-filter-popup-row { display: flex; justify-content: flex-end; margin-bottom: 6px; }
  .gantt-filter-clear {
    height: 22px;
    padding: 0 8px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
  }
  .gantt-filter-clear:disabled { opacity: 0.5; cursor: not-allowed; }
  .gantt-filter-popup-section { margin-bottom: 8px; }
  .gantt-filter-popup-title { font-weight: 600; margin-bottom: 4px; opacity: 0.85; }
  .gantt-filter-popup-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    cursor: pointer;
  }
  .gantt-groupby-wrap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    border-radius: 4px;
  }
  .gantt-groupby-select {
    height: 22px;
    border: none;
    background: transparent;
    color: var(--theme-content-color);
    font-size: 12px;
    cursor: pointer;
    outline: none;
  }
  // Tier-2 #7 — Saved Gantt-Views toolbar widget. Mirrors gantt-groupby-wrap.
  .gantt-savedview-wrap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    border-radius: 4px;
  }
  .gantt-savedview-select {
    height: 22px;
    border: none;
    background: transparent;
    color: var(--theme-content-color);
    font-size: 12px;
    cursor: pointer;
    outline: none;
    max-width: 12rem;
  }
  .gantt-savedview-modified {
    font-size: 11px;
    opacity: 0.75;
    font-style: italic;
  }
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
  /* v121.3-C — `closest` is set while the user is in continuous (Ctrl+Wheel)
     zoom; it highlights which preset the current pxPerDay is closest to,
     with a softer style than `active` so the user can tell the two
     states apart. */
  .zoom-btn.closest {
    background: var(--theme-button-hovered);
    font-weight: 500;
  }
  /* .settings-btn / .settings-popover removed — replaced by Huly's
     Customize-View ViewOption pattern (ToggleViewOption) which renders
     the same toggles in the standard view-settings dropdown. */
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
  /* Absolutely-pin the horizontal-scroll bar at the bottom of gantt-root
     instead of relying on the flex chain to enforce a constrained height.
     This way the bar can never slip below the visible viewport even if a
     parent forgets to set min-height:0. */
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
    min-height: 0;
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
  /* v121.2 — in extended-grid mode the corner hosts the GanttSidebar
     header-only variant. Reserve the upper slot for the header row and
     keep the lower date-range strip on its own line. */
  .corner.extended-corner {
    overflow: hidden;
  }
  .corner.extended-corner :global(.sidebar-grid.header-only) {
    flex: 0 0 auto;
  }
  .corner.extended-corner :global(.sidebar-grid.header-only .sidebar-grid-header) {
    height: 28px;
    border-bottom: none;
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
    /* v121.2 — clip the extended sidebar grid to the cell so a stale
       column-width override can never paint over the canvas. The grid
       width is already kept in sync via sidebarWidthPx, this is a
       defence-in-depth guard. */
    overflow: hidden;
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

  /* Phase 2.3c — PDF export via browser print. When the user clicks
     the PDF button, GanttView toggles the .gantt-printing class on
     the gantt-root and calls window.print(). The @media print block
     below hides the surrounding chrome (sidebar, header, popups) and
     expands the Gantt to fill the printable page area so the
     resulting PDF is a clean single-page Gantt chart.
     The class is removed automatically ~1s later. */
  :global(body.is-modal) .gantt-printing,
  .gantt-printing :global(.hover-tooltip),
  .gantt-printing :global(.popup),
  .gantt-printing :global(.antiPopup) {
    display: none !important;
  }

  @media print {
    /* When called via window.print(), hide everything except the
       Gantt root + canvas. The page layout collapses to just the
       chart. */
    :global(body > *:not(.popup)),
    :global(.app-content),
    :global(.popupPanel),
    :global(.antiNav-list) {
      visibility: visible;
    }
    :global(.gantt-printing) {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      background: white !important;
    }
    :global(.gantt-printing .gantt-scroller) {
      overflow: visible !important;
      max-height: none !important;
    }
    :global(.gantt-printing .hover-tooltip),
    :global(.gantt-printing .popup),
    :global(.gantt-printing .gantt-hscrollbar),
    :global(.gantt-printing .gantt-vscrollbar) {
      display: none !important;
    }
  }
</style>
