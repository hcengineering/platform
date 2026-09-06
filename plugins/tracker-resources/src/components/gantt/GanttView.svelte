<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import {
    type ApplyOperations,
    type Class,
    type Doc,
    type DocumentQuery,
    generateId,
    getCurrentAccount,
    type Projection,
    type Ref,
    type Space,
    SortingOrder,
    type SortingQuery
  } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    type Component,
    type Issue,
    type IssueRelation,
    type IssueStatus,
    type Milestone,
    type Project,
    type WorkingDaysConfig,
    IssuePriority
  } from '@hcengineering/tracker'
  import hr from '@hcengineering/hr'
  import { type TagElement } from '@hcengineering/tags'
  import { type Person } from '@hcengineering/contact'
  import tags from '@hcengineering/tags'
  import contact from '@hcengineering/contact'
  import { issuePriorities } from '../../types'
  import { connectedIssueIds } from './lib/dependency-router'
  import { wouldCreateCycle, simulateCascade, addScheduleDays, descendantsWithDates } from './lib/scheduler'
  import {
    newCascadeToken,
    fsAnchor,
    ssAnchor,
    ffAnchor,
    sfAnchor,
    DebouncedRecompute,
    createConfirmGate,
    type WorkingCalendar,
    createFlashStore,
    flashIssues,
    reduce,
    shouldPromoteCanvasPan,
    shouldStartCanvasPan,
    createTimeScale,
    toGanttDay,
    applyWheelZoom,
    cursorAnchoredScrollLeft,
    pxPerDayToTickZoom,
    ZOOM_PX_PER_DAY,
    MIN_PPD,
    computeAdaptivePxPerDay,
    computeCanvasRenderWidth,
    computeCanvasViewportWidth,
    extractGanttSavedView,
    isBarColorMode,
    isoDateForTimestamp,
    mergeGanttSavedView,
    timestampForIsoDate,
    type GanttSavedViewOptions,
    DEFAULT_COLUMNS,
    clampWidth,
    computeTotalWidth,
    parseWidths,
    type SidebarColumnKey,
    createTreeExpandStore,
    type TreeExpandStore,
    dropdownSelectionForPxPerDay,
    visibleDaysFromPxPerDay,
    pxPerDayFromVisibleDays,
    MIN_VISIBLE_DAYS,
    MAX_VISIBLE_DAYS,
    type DropdownSelection,
    initial as pinchInitial,
    reducePinch,
    computePxPerDayFromRatio,
    type PinchState
  } from '@hcengineering/gantt'
  import { sendDependencyShiftedNotifications } from './lib/dependency-shift-send'
  import { toggleSelection, selectRange, selectAll, clearSelection } from './lib/bulk-selection'
  import { computeBulkDeltaBounds } from './lib/bulk-boundary'
  import { computeCriticalPath } from './lib/critical-path'
  import { CalendarStateMachine, type CalendarSnapshot, type MutationTicket } from './lib/calendar-state'
  import type {
    CriticalPathResult,
    PrimaryEdit,
    SimulateResult,
    CascadeShift,
    DragState,
    DragTarget,
    LayoutRow,
    MilestoneMarker,
    SummaryRange,
    ZoomLevel
  } from './lib/types'
  import { exportGanttDataToPdf, exportGanttDataToPng } from './lib/exporter'
  import GanttHelpPopup from './GanttHelpPopup.svelte'
  import GanttQuickInfoPopup from './GanttQuickInfoPopup.svelte'
  import { type BarLabelSlot } from './lib/bar-labels'
  import ConfirmCascadePopup from './ConfirmCascadePopup.svelte'
  import DependencyEditor from '../DependencyEditor.svelte'
  import EditMilestone from '../milestones/EditMilestone.svelte'
  import {
    Loading,
    addNotification,
    NotificationSeverity,
    themeStore,
    getCurrentResolvedLocation,
    DropdownLabelsIntl,
    EditBox,
    Icon,
    IconChevronDown,
    IconChevronRight,
    IconMoreV,
    Label,
    SelectPopup,
    eventToHTMLElement,
    getEventPositionElement,
    showPanel,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import { translate, translateCB, type IntlString } from '@hcengineering/platform'
  import { type FilteredView, type Viewlet, type ViewOptions } from '@hcengineering/view'
  import view from '@hcengineering/view'
  import {
    claimResultCountOwner,
    releaseResultCountOwner,
    setResultCount,
    selectedFilterStore,
    setViewOptions,
    showMenu,
    statusStore
  } from '@hcengineering/view-resources'
  import core from '@hcengineering/core'
  import { onDestroy, onMount, setContext, tick } from 'svelte'
  import { writable } from 'svelte/store'
  import type { BarColorMode, BarColorContext } from './lib/bar-colors'
  import { buildBarColorContext } from './lib/bar-colors-context'
  import tracker from '../../plugin'
  import { canEditIssue, canEditIssuesBatch, canEditMilestone } from '../../utils'
  import GanttCanvas from './GanttCanvas.svelte'
  import GanttConfirmCommitPopup from './GanttConfirmCommitPopup.svelte'
  import GanttHeader from './GanttHeader.svelte'
  import GanttSaveViewPopup from './GanttSaveViewPopup.svelte'
  import GanttSidebar from './GanttSidebar.svelte'
  import { filterGanttFilteredViews } from './lib/saved-views'
  import { cycleSort, comparatorFor, parseSortState, type GanttSortState } from './lib/sidebar-sort'
  import { GROUP_BY_KEYS, type GroupByKey } from './lib/group-by'
  import { buildGroupedRows, groupRowsToLayoutRows } from './lib/build-rows'
  import { ganttToolbarSnapshot } from './ganttToolbarStore'
  // E — GanttFilter / applyFilter removed in favour of the standard
  // FilterBar (FilterButton in IssuesView.svelte). The standard filter
  // flows into `query` via `resultQuery`, so the issue-side filtering is
  // already done at the data-query layer. `lib/filter-predicate` is
  // retained for ad-hoc future use but no longer wired into the Gantt
  // toolbar — the toolbar Filter button + Ctrl+F popup were redundant
  // with the FilterBar and confused users (two state-sets per session).
  import { UndoManager, type UndoEntry, type UndoResult } from './lib/undo-manager'
  import { buildLayout } from './lib/layout'
  // Mobile-Friendly Gantt.
  import { detectLayoutMode, type LayoutMode } from '@hcengineering/gantt'
  import type { DropdownIntlItem, SelectPopupValueType } from '@hcengineering/ui'
  import CreateIssue from '../CreateIssue.svelte'
  import { ganttExtraActions } from './lib/menu-actions'

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
  const MAX_SIDEBAR_WIDTH = 1200
  const DEFAULT_SIDEBAR_WIDTH = 280
  const HEADER_HEIGHT = 56
  const MILESTONE_STRIP_HEIGHT = 0
  // Toolbar lives outside GanttView (hoisted into IssuesView's SpaceHeader
  // row 2 via ganttToolbarSnapshot). With no in-Gantt toolbar strip the
  // overlaid vertical scrollbar simply starts at the top of .gantt-root,
  // so the offset is always 0.
  const toolbarHeightPx = 0

  // i18n raw-keys in aria-labels: `aria-label={tracker.string.Foo}`
  // sets the literal IntlString id ("tracker:string:Foo"), it does not
  // resolve via the <Label/> fallback chain. `translateCB` fills the
  // `ariaLabels` map asynchronously for every key we register; the
  // returned getter falls back to an empty string so the DOM never
  // shows the raw key (and screen-readers do not announce it either).
  // Keys are re-translated whenever the language changes.
  const ariaLabelKeys: IntlString[] = [
    tracker.string.GanttCollapseAll,
    tracker.string.GanttExpandAll,
    tracker.string.GanttSavedViewUpdate,
    tracker.string.GanttExportPng,
    tracker.string.GanttExportPdf,
    tracker.string.GanttFullscreen,
    tracker.string.GanttMobileOpenSidebar,
    tracker.string.GanttMobileCloseSidebar,
    tracker.string.GanttJumpToStart,
    tracker.string.GanttJumpToEnd,
    tracker.string.GanttJumpToDate,
    tracker.string.GanttPreviousPeriod,
    tracker.string.GanttNextPeriod,
    tracker.string.GanttUndo,
    tracker.string.GanttRedo,
    // Every key GanttToolbarBar reads off `ariaLabels` has to be registered
    // here — an unregistered key resolves to '' and ships an empty
    // `aria-label=""` to the DOM, which is worse than no attribute at all
    // (it suppresses the accessible name the content would otherwise give).
    tracker.string.GanttMoreActions,
    tracker.string.GanttGroupBy,
    tracker.string.GanttColorBy,
    tracker.string.GanttToolbarMore
  ]
  let ariaLabels: Record<string, string> = {}
  $: {
    // touch the language store so the reactive block re-runs on switch
    const lang = $themeStore.language
    const next: Record<string, string> = {}
    for (const key of ariaLabelKeys) {
      translateCB(key, {}, lang, (res) => {
        next[key] = res
        ariaLabels = { ...next }
      })
    }
  }
  function ariaLabelOf (key: IntlString): string {
    return ariaLabels[key] ?? ''
  }

  let hoveredRowId: string | null = null
  let tooltipState: { visible: boolean, x: number, y: number, row: LayoutRow | null } = {
    visible: false,
    x: 0,
    y: 0,
    row: null
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

  // Loading flags. Armed by the query blocks further down — but ONLY when
  // `LiveQuery.query()` reports that it really (re)issued the query.
  //
  // `LiveQuery.query()` (packages/presentation/src/utils.ts) compares class +
  // query + callback + options with `deepEqual` and returns FALSE when
  // nothing changed; in that case it never invokes the callback again. The
  // previous `$: { void issueDocQuery; loadingIssues = true }` re-armed on
  // OBJECT IDENTITY, which changes on every recompute of `issueDocQuery`
  // even when the query VALUE is identical — e.g. "Clear filters" rebuilding
  // an equal query object while a view-option toggle (Show critical path)
  // triggers the recompute. The flag then went back to `true` with no
  // callback outstanding and the Gantt was stuck in the spinner until the
  // viewlet was re-mounted. Binding the flag to the actual query issue
  // instead of to a reactive re-run makes that state unreachable.
  //
  // The callback can never run synchronously inside `.query()` — the
  // dispatch goes through `reduceCalls`, which always awaits a microtask
  // first — so the `if (issued) loading* = true` below can never overwrite a
  // `false` that the callback already wrote.
  let loadingIssues = true
  let loadingMilestones = true

  // Shared result-count store consumed by IssuesView to gate
  // the SearchEmptyState card. Reset to -1 on destroy so route/viewlet
  // transitions never leave a stale 0 that would falsely trigger the
  // empty-state.
  //
  // ISSUES ONLY — deliberately excluding milestones. The card the count
  // gates says "No issues found", and List / Kanban report `docs.length`
  // of the Issue query for exactly that reason. Milestones are not search
  // results here: `milestoneDocQuery` is scoped by `space` alone and is
  // never narrowed by the active search or filter (a `$search` phrase and
  // Issue-only filter keys such as priority / assignee cannot be applied to
  // Milestone without emptying the swimlane headers on every filter). So
  // counting them made the count report `0 issues + N milestones != 0` and
  // the empty-state card could never appear in any project that has at
  // least one milestone. Counting issues alone keeps the card's statement
  // true and the Gantt visually intact (milestone markers keep rendering).
  //
  // Consequently the write is gated on the ISSUE query alone; the milestone
  // query's loading flag no longer participates.
  // GanttView is a primary viewlet and therefore a direct writer on the
  // result-count gate (like KanbanView): claim at init, release on destroy.
  // The count semantics are unchanged: issues only — milestones are excluded
  // (see the comment above), and the write stays gated on the issue query.
  const resultCountOwner = claimResultCountOwner()
  $: if (!loadingIssues) {
    setResultCount(resultCountOwner, issues.length)
  }
  onDestroy(() => {
    releaseResultCountOwner(resultCountOwner)
  })

  // Edit-mode state: a single source of truth for explicit drag/resize
  // interactions. Normal bar-body mouse drags are no longer issue moves; they
  // pan the canvas like empty-space drags.
  // GanttCanvas / GanttSidebar / GanttResizeOverlay subscribe to this store;
  // the reducer in lib/drag-controller.ts mutates it.
  // editableIssueIds gates the resize handles + the Set-start-date menu entry
  // per issue based on canEditIssue() (utils.ts:280).
  const activeDrag = writable<DragState>({ kind: 'idle' })

  /**
   * Write a single Gantt-owned key back into the viewlet's ViewOptions.
   *
   * The Gantt renders several controls outside the shared Customize-view
   * popup (the toolbar's Color-by dropdown, the extended sidebar's column
   * resize + sort). Their state used to live in component-local variables
   * only, so it silently reset to the built-in default on every viewlet
   * re-mount / route change. `setViewOptions` is the same storage path the
   * Customize-view popup uses (localStorage + `viewOptionStore`), and the
   * store write propagates straight back down into our `viewOptions` prop
   * via IssuesView's `getViewOptions(viewlet, $viewOptionStore)`.
   */
  function persistViewOption (key: string, value: unknown): void {
    if (viewlet === undefined) return
    const base = (viewOptions as unknown as Record<string, unknown> | undefined) ?? {}
    setViewOptions(viewlet, { ...base, [key]: value } as unknown as ViewOptions)
  }

  // Bar-color toolbar / overlay / progress state — initial defaults from spec.
  const ganttBarColorBy = writable<BarColorMode>('status')
  const ganttShowPastDueOverlay = writable<boolean>(true)
  const ganttShowBlockedOverlay = writable<boolean>(true)
  const ganttShowSubIssueProgress = writable<boolean>(false)

  // Live BarColorContext derived from current Gantt data — see below.
  const barColorContextStore = writable<BarColorContext>(buildBarColorContext([], new Map(), new Map(), new Map()))

  // Predecessor maps for the blocked-hatch overlay — populated reactively
  // below; GanttBar reads them via context.
  const predecessorsByIssueIdStore = writable<Map<string, Array<Ref<Issue>>>>(new Map())
  const predStatusByIssueIdStore = writable<Map<string, Ref<IssueStatus>>>(new Map())

  // Init contexts ONCE at component setup. Updates flow via .set() below.
  setContext('gantt-bar-color-mode', ganttBarColorBy)
  setContext('gantt-overlay-past-due', ganttShowPastDueOverlay)
  setContext('gantt-overlay-blocked', ganttShowBlockedOverlay)
  setContext('gantt-progress-fill', ganttShowSubIssueProgress)
  setContext('gantt-bar-color-context', barColorContextStore)
  setContext('gantt-predecessors-by-issue', predecessorsByIssueIdStore)
  setContext('gantt-pred-status-by-issue', predStatusByIssueIdStore)

  const subIssuesByParent = writable<Map<string, Issue[]>>(new Map())
  setContext('gantt-sub-issues-by-parent', subIssuesByParent)

  const subIssuesQuery = createQuery()

  // A single Set holds editable Issue _ids AND Milestone _ids — both
  // are stringified Ref<...> so a single Set lookup serves the bar
  // editable={} flag for both row kinds without parallel data structures.
  let editableIssueIds = new Set<string>()

  // Dependency state
  let relations: IssueRelation[] = []
  let optimisticRelations: IssueRelation[] = []
  // Critical path + slack. ViewOptions toggle the visual layer;
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
  /** Debounce window for the critical-path / slack recompute, see below. */
  const CP_RECOMPUTE_DEBOUNCE_MS = 200
  const cpDirtyTimer = new DebouncedRecompute(CP_RECOMPUTE_DEBOUNCE_MS)
  let lastCpCycleNotifiedAt = 0
  let hoveredIssue: Ref<Issue> | null = null
  let hoveredEdge: { source: Ref<Issue>, target: Ref<Issue> } | null = null
  $: displayedRelations = [
    ...relations,
    ...optimisticRelations.filter(
      (pending) =>
        !relations.some(
          (rel) => rel.attachedTo === pending.attachedTo && rel.target === pending.target && rel.kind === pending.kind
        )
    )
  ]
  $: connectedIds = connectedIssueIds(hoveredIssue, hoveredEdge, displayedRelations)
  $: showPredecessors = ((viewOptions as Record<string, unknown>)?.ganttShowPredecessors ?? false) !== false

  /**
   * Two-stage edit gate: an unselected bar remains
   * a canvas-pan surface during click-and-hold, while a plain click arms it.
   * Once armed, body drag moves the issue/milestone and edge handles resize.
   */
  let selectedIssueId: string | null = null
  // Bulk-Select + Bulk-Drag.
  // Holds the multi-selection set as stringified issue ids so it can be
  // diffed cheaply against the bar's `String(row.issue._id)`. The
  // `selectedIssueId` flag stays separate because it governs the
  // single-bar "armed" cursor + resize-handle UI; multi-selected bars
  // share the outline but never expose resize. `lastClickedIssueId` is
  // the anchor a Shift-Click extends the range from.
  let multiSelectedIssueIds = new Set<Ref<Issue>>()
  let lastClickedIssueId: Ref<Issue> | null = null
  let lastCanvasPanEndedAt = 0

  let canvasViewportLeft = 0
  let canvasViewportWidth = 1200
  let scrollTop = 0
  let viewportHeight = 600

  let containerEl: HTMLDivElement | undefined
  let scrollerEl: HTMLDivElement | null = null
  let hScrollEl: HTMLDivElement | null = null

  // Mobile-Friendly Gantt. layoutMode is driven by the
  // viewport width on mount + on resize. Phone (≤640) hides the sidebar
  // behind a slide-out drawer + gates the canvas to read-only; Tablet
  // (641-1024) keeps the full edit UX but routes touch-drag through a
  // long-press; Desktop (>1024) is the legacy behaviour bit-for-bit.
  let layoutMode: LayoutMode = typeof window !== 'undefined' ? detectLayoutMode(window.innerWidth) : 'desktop'
  let mobileDrawerOpen: boolean = false
  // Phone is strictly read-only: the bars are far too small there for the
  // hit-targets that drag/resize/connect need. All drag/connector/resize
  // gates derive from this flag.
  $: phoneReadOnly = layoutMode === 'phone'

  // Pinch-zoom 2-pointer tracker. The reducer is pure; the wiring lives
  // in onScrollerPointerDown / Move / Up / Cancel below. Triggered on
  // touch input only (mouse + pen fall through to the existing wheel
  // zoom / click-drag handlers).
  let pinchState: PinchState = pinchInitial()

  let zoom: ZoomLevel = 'week'
  // C — continuous Ctrl+Wheel zoom. `userPxPerDay` is the
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
  // Critical-path + slack visualization. Toggled via the
  // Customize-view panel (same pattern as ganttConfirmMove etc.).
  $: showCriticalPath = ((viewOptions as Record<string, unknown>)?.ganttCriticalPath ?? false) === true
  $: showSlackColumn = ((viewOptions as Record<string, unknown>)?.ganttSlackColumn ?? false) === true
  // Extended sidebar grid. Toggled via Customize-view; default OFF
  // so existing users see the legacy compact layout. When ON, the sidebar
  // renders a sortable header row + per-column cells via GanttSidebarColumn.
  $: extendedColumns = ((viewOptions as Record<string, unknown>)?.ganttSidebarColumnsExtended ?? false) === true
  // Per-column visibility toggles for the extended sidebar. Each toggle adds
  // its column to the default identifier+title+predecessors+slack set. Hidden
  // when extendedColumns=false (toggle row is then collapsed in the popup too).
  $: ganttSidebarShowStatus = ((viewOptions as Record<string, unknown>)?.ganttSidebarShowStatus ?? false) === true
  $: ganttSidebarShowPriority = ((viewOptions as Record<string, unknown>)?.ganttSidebarShowPriority ?? false) === true
  $: ganttSidebarShowAssignee = ((viewOptions as Record<string, unknown>)?.ganttSidebarShowAssignee ?? false) === true
  $: ganttSidebarShowEstimation =
    ((viewOptions as Record<string, unknown>)?.ganttSidebarShowEstimation ?? false) === true
  $: ganttSidebarShowStartDate = ((viewOptions as Record<string, unknown>)?.ganttSidebarShowStartDate ?? false) === true
  $: ganttSidebarShowDueDate = ((viewOptions as Record<string, unknown>)?.ganttSidebarShowDueDate ?? false) === true
  $: ganttSidebarShowDeadline = ((viewOptions as Record<string, unknown>)?.ganttSidebarShowDeadline ?? false) === true
  $: ganttSidebarShowProgress = ((viewOptions as Record<string, unknown>)?.ganttSidebarShowProgress ?? false) === true

  // Overlay + sub-issue-progress toggles driven by Customize-view.
  // Unconditional .set() with default fallback — active-default-reset policy:
  // when a key is absent in the incoming viewOptions blob (e.g. switching back
  // to a default view from a saved one that had these set), the store snaps
  // back to the built-in default rather than retaining the previous saved-view value.
  $: {
    const vo = (viewOptions as Record<string, unknown> | undefined) ?? {}
    const pastDue = vo.ganttShowPastDueOverlay
    ganttShowPastDueOverlay.set(typeof pastDue === 'boolean' ? pastDue : true)

    const blocked = vo.ganttShowBlockedOverlay
    ganttShowBlockedOverlay.set(typeof blocked === 'boolean' ? blocked : true)

    const progress = vo.ganttShowSubIssueProgress
    ganttShowSubIssueProgress.set(typeof progress === 'boolean' ? progress : false)

    // Toolbar Color-by. Same active-default-reset policy as the overlays
    // above. The dropdown lives in GanttToolbarBar rather than in the
    // Customize-view popup, but its value is stored as a ViewOption all the
    // same (`onColorBySelectChange` writes it back through
    // `persistViewOption`), so the choice survives a viewlet re-mount /
    // route change instead of snapping back to "Status".
    const colorBy = vo.ganttBarColorBy
    ganttBarColorBy.set(isBarColorMode(colorBy) ? colorBy : 'status')
  }

  // Extended-sidebar column widths + sort order. Both are user-visible layout
  // state driven by the sortable/resizable column header, and both used to be
  // component-local ("persistence is a follow-up"), so a re-mount snapped
  // every column — the Slack column included — back to its default width and
  // dropped the active sort. They are stored as ViewOptions now, using the
  // same defensive parsing contract as `parseColumns`: unknown shapes fall
  // back to the built-in defaults.
  //
  // The handlers below also assign these directly, which keeps the drag
  // interactive at pointer-move rate; the write-back happens once on
  // end-of-drag and re-derives the identical value.
  let sidebarWidths: Record<string, number>
  let sidebarSort: GanttSortState
  $: sidebarWidths = parseWidths((viewOptions as Record<string, unknown> | undefined)?.ganttSidebarWidths)
  $: sidebarSort = parseSortState((viewOptions as Record<string, unknown> | undefined)?.ganttSidebarSort)

  // Bar-label slots driven by Customize-view ViewOptions.
  // Defaults preserve legacy "title inside the bar" rendering.
  $: barLabelLeft = (((viewOptions as Record<string, unknown>)?.ganttBarLabelLeft as string) ?? 'none') as BarLabelSlot
  $: barLabelInside = (((viewOptions as Record<string, unknown>)?.ganttBarLabelInside as string) ??
    'title') as BarLabelSlot
  $: barLabelRight = (((viewOptions as Record<string, unknown>)?.ganttBarLabelRight as string) ??
    'none') as BarLabelSlot
  // Opt-in quick-info popover on single click.
  // on phone layout we drop the dblclick → openIssue shortcut
  // (mobile OSes intercept double-tap for system zoom). The quick-info
  // popover with its "Open full editor" button becomes the canonical
  // entry point for opening an issue, so force-enable it regardless of
  // the user's view option on phones.
  $: quickInfoOnClick =
    layoutMode === 'phone' ? true : ((viewOptions as Record<string, unknown>)?.ganttQuickInfoOnClick ?? false) === true

  // Group-by swimlanes. `ganttGroupBy` is a declared ViewOption (see
  // `ganttViewOptions()` in models/tracker/src/viewlets.ts) but its control
  // lives in the Gantt toolbar, not in the Customize-view popup — the popup
  // hides the key (`hideKeys` in IssuesView). So the write-back has to happen
  // here, through the very same `persistViewOption` path the toolbar's
  // Color-by dropdown already uses. Without it the key stayed at its stored
  // value forever and every viewlet / route change snapped the swimlanes back.
  //
  // Read direction: `viewOptions` re-derives the value on every store change,
  // so a saved view (or another tab) that carries a different `ganttGroupBy`
  // is picked up as well. The collapsed-group set is reset on every change of
  // the mode for the same reason `setGroupBy` does it — its keys belong to
  // the previous mode.
  let ganttGroupBy: GroupByKey = 'none'
  $: applyGroupByFromViewOptions((viewOptions as Record<string, unknown> | undefined)?.ganttGroupBy)
  function applyGroupByFromViewOptions (raw: unknown): void {
    const next: GroupByKey =
      typeof raw === 'string' && (GROUP_BY_KEYS as readonly string[]).includes(raw) ? (raw as GroupByKey) : 'none'
    if (next === ganttGroupBy) return
    ganttGroupBy = next
    collapsedGroups = new Set()
  }
  let collapsedGroups = new Set<string>()
  // E — `ganttFilter` / `filterPopupOpen` / `filterCount` removed
  // with the gantt-toolbar Filter button. Filter state lives on the
  // standard FilterBar in IssuesView.svelte and reaches us via `query`.

  // Undo/redo. One manager per GanttView mount; the stack lives
  // in memory only and is deliberately dropped on navigation-away, so a
  // stale stack can never be replayed against data the user no longer sees.
  // The flash-store drives a transient highlight on bars touched by an
  // undo/redo so the user sees what just rolled back.
  // TxOperations & Client has the structural subset UndoApplyClient needs;
  // the cast lives at the construction site so the manager itself stays free
  // of any tracker/core imports beyond pure types.
  // Inject the class refs from the tracker plugin metadata (source of
  // truth) instead of letting the manager fall back to its hardcoded string
  // defaults.
  const undoManager = new UndoManager(
    getClient() as unknown as ConstructorParameters<typeof UndoManager>[0],
    tracker.class.Issue,
    tracker.class.IssueRelation
  )
  const canUndo = undoManager.canUndo
  const canRedo = undoManager.canRedo
  const nextUndoDescription = undoManager.nextUndoDescription
  const nextRedoDescription = undoManager.nextRedoDescription
  const undoFlashStore = createFlashStore()
  onDestroy(() => {
    undoManager.clear()
  })
  /**
   * When the user picks a new group-by mode, drop the collapsed-state — it
   * was indexed by keys from the previous mode and would either be a no-op
   * or accidentally collapse a same-named bucket in the new mode.
   */
  function setGroupBy (next: GroupByKey): void {
    if (next === ganttGroupBy) return
    ganttGroupBy = next
    collapsedGroups = new Set()
    // Same storage path as the Color-by dropdown right next to it
    // (localStorage + `viewOptionStore`), so the choice survives a
    // viewlet re-mount / route change.
    persistViewOption('ganttGroupBy', next)
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
  $: scheduleCpRecompute(issues, relations, showCriticalPath, showSlackColumn, effectiveCalendar)

  function setZoom (z: ZoomLevel): void {
    zoom = z
    // C — preset button clears any wheel-zoom override so the
    // canonical preset px/day takes over again.
    userPxPerDay = null
    if (hScrollEl != null) {
      hScrollEl.scrollLeft = 0
    }
    queueMicrotask(syncViewport)
  }

  // C — derived px/day used by both the time-scale and the tick
  // generator: prefer the wheel-zoom override when set, else the preset.
  $: effectivePxPerDay = userPxPerDay !== null ? userPxPerDay : ZOOM_PX_PER_DAY[zoom]
  // Tick granularity follows pxPerDay (continuous zoom). On preset clicks
  // this resolves back to the matching ZoomLevel via the same table.
  $: tickZoomLevel = userPxPerDay !== null ? pxPerDayToTickZoom(userPxPerDay) : zoom

  // Toolbar zoom dropdown + visible-days input.
  // The dropdown selection follows wheel-zoom: when `userPxPerDay` snaps
  // back exactly onto a preset (Day=32, Week=14, Month=4, Quarter=1.5) the
  // preset label shows; otherwise Custom appears as the active row.
  $: zoomDropdownSelection = dropdownSelectionForPxPerDay(userPxPerDay, zoom) as DropdownSelection
  // Custom is *not* directly user-selectable from the dropdown — wheel-zoom
  // is the only way to enter that state. We therefore include the Custom
  // item only while it's currently active, so clicking the dropdown still
  // shows the user *what* their current state is, without offering Custom
  // as an explicit choice that wouldn't change anything.
  $: zoomDropdownItems = (() => {
    const items: DropdownIntlItem[] = [
      { id: 'day', label: tracker.string.GanttZoomDay },
      { id: 'week', label: tracker.string.GanttZoomWeek },
      { id: 'month', label: tracker.string.GanttZoomMonth },
      { id: 'quarter', label: tracker.string.GanttZoomQuarter }
    ]
    if (zoomDropdownSelection === 'custom') {
      items.push({ id: 'custom', label: tracker.string.GanttZoomCustom })
    }
    return items
  })()
  // Visible-day count shown in the EditBox next to the dropdown. Round so
  // the user sees a stable integer; the underlying pxPerDay stays continuous.
  $: visibleDays = visibleDaysFromPxPerDay(canvasViewportWidth, effectivePxPerDay)
  // Locally edited value bound to the EditBox. We do *not* sync
  // automatically from `visibleDays` (it would steal keystrokes from the
  // user mid-edit) — instead `applyVisibleDaysInput()` writes back the
  // pxPerDay, the reactive `visibleDays` follows, and we re-sync the
  // input on the next blur/Enter/Escape.
  let visibleDaysInput: number = visibleDays
  // Sync the input *only* when the underlying viewport changed externally
  // (wheel-zoom, preset click, resize) and the input is empty/uninitialized.
  // We detect "external change" by tracking the last value we wrote out.
  let lastVisibleDaysOut: number = visibleDays
  $: if (visibleDays !== lastVisibleDaysOut) {
    visibleDaysInput = visibleDays
    lastVisibleDaysOut = visibleDays
  }

  function onZoomDropdownSelected (e: CustomEvent<DropdownSelection | undefined>): void {
    const id = e.detail
    if (id === undefined || id === 'custom') return
    setZoom(id)
  }

  function applyVisibleDaysInput (): void {
    const days = Number(visibleDaysInput)
    if (!Number.isFinite(days) || days < MIN_VISIBLE_DAYS) {
      visibleDaysInput = visibleDays
      return
    }
    if (canvasViewportWidth <= 0) return
    const rawPpd = pxPerDayFromVisibleDays(canvasViewportWidth, days)
    // Honour the dynamic zoom-out floor (5% pad each side); if the user
    // typed a day-count that would zoom out beyond it, clamp + re-sync
    // the input on the next reactive pass.
    const nextPpd = Math.max(rawPpd, dynamicMinPpd)
    // Editing the day count puts the toolbar into Custom-state by design —
    // we set `userPxPerDay` directly, which the reactive block above maps
    // back to a Custom selection unless the value happens to round to a
    // preset (in which case the dropdown re-snaps automatically).
    userPxPerDay = nextPpd
    queueMicrotask(syncViewport)
  }

  function onVisibleDaysKeyDown (e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      applyVisibleDaysInput()
      ;(e.target as HTMLElement | null)?.blur?.()
    } else if (e.key === 'Escape') {
      visibleDaysInput = visibleDays
      ;(e.target as HTMLElement | null)?.blur?.()
    }
  }

  // Saved Gantt-Views.
  // Re-hydrate the Gantt zoom + optional pan anchor from a FilteredView's
  // viewOptions blob. Called from the reactive `$selectedFilterStore`
  // block below. The reverse direction (writing) lives in
  // saveCurrentGanttView() / updateCurrentGanttView() further down.
  let lastAppliedSavedViewId: string | null = null
  async function applyGanttSavedView (raw: Record<string, unknown> | undefined): Promise<void> {
    const opts = extractGanttSavedView(raw)
    zoom = opts.zoomLevel
    userPxPerDay = null
    // Pull (and default-reset) the four new toolbar fields. Defaults must
    // match the defaults (Status / on / on / off) so stale state from a
    // previous saved view cannot leak into the loaded view.
    const mode = raw?.ganttBarColorBy
    ganttBarColorBy.set(
      typeof mode === 'string' &&
        (['status', 'priority', 'assignee', 'component', 'milestone', 'none'] as const).includes(mode as any)
        ? (mode as BarColorMode)
        : 'status'
    )
    ganttShowPastDueOverlay.set(typeof raw?.ganttShowPastDueOverlay === 'boolean' ? raw.ganttShowPastDueOverlay : true)
    ganttShowBlockedOverlay.set(typeof raw?.ganttShowBlockedOverlay === 'boolean' ? raw.ganttShowBlockedOverlay : true)
    ganttShowSubIssueProgress.set(
      typeof raw?.ganttShowSubIssueProgress === 'boolean' ? raw.ganttShowSubIssueProgress : false
    )
    // Wait one tick so the new zoom propagates into `timeScale` before we
    // scroll — otherwise toX() uses the previous pxPerDay and the anchor
    // lands at the wrong column when the mount is slow.
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
    const payload: GanttSavedViewOptions = {
      zoomLevel: zoom,
      ganttBarColorBy: $ganttBarColorBy,
      ganttShowPastDueOverlay: $ganttShowPastDueOverlay,
      ganttShowBlockedOverlay: $ganttShowBlockedOverlay,
      ganttShowSubIssueProgress: $ganttShowSubIssueProgress
    }
    if (fixTimeWindow && hScrollEl != null) {
      // Anchor = the visible-left date in the time scale (UTC midnight).
      const t = timeScale.fromX(hScrollEl.scrollLeft)
      payload.panAnchorDate = isoDateForTimestamp(t)
    }
    return mergeGanttSavedView(base, payload)
  }

  async function saveCurrentGanttView (name: string, fixTimeWindow: boolean, sharable: boolean): Promise<void> {
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
    const currentlyFixed =
      cur?.viewletId === viewlet?._id
        ? (cur?.viewOptions as Record<string, unknown> | undefined)?.ganttPanAnchorDate !== undefined
        : false
    showPopup(GanttSaveViewPopup, { fixTimeWindow: currentlyFixed }, 'top', (result) => {
      if (result == null) return
      const r = result as { name?: string, fixTimeWindow?: boolean, sharable?: boolean }
      if (r?.name === undefined) return
      void saveCurrentGanttView(r.name, r.fixTimeWindow === true, r.sharable !== false)
    })
  }

  /**
   *  / Refactor D — open a nested SelectPopup listing the current
   * account's saved Gantt views (mine first, then shared). Clicking an
   * item sets `selectedFilterStore` which the existing reactive block
   * picks up and applies via `applyGanttSavedView`. A "__DEFAULT__"
   * sentinel clears the selection.
   */
  function openLoadViewMenu (anchor: HTMLElement): void {
    const items: SelectPopupValueType[] = []
    items.push({
      id: '__DEFAULT__',
      label: tracker.string.GanttSavedViewLoadDefault,
      category: { label: tracker.string.GanttSavedViewLoadGroup }
    })
    for (const fv of ganttBuckets.mine) {
      items.push({
        id: String(fv._id),
        text: fv.name,
        isSelected: $selectedFilterStore?._id === fv._id,
        category: { label: tracker.string.GanttSavedViewMine }
      })
    }
    for (const fv of ganttBuckets.shared) {
      items.push({
        id: String(fv._id),
        text: fv.name + ' ★',
        isSelected: $selectedFilterStore?._id === fv._id,
        category: { label: tracker.string.GanttSavedViewShared }
      })
    }
    showPopup(SelectPopup, { value: items }, anchor, (selectedId) => {
      if (selectedId === undefined || selectedId === null) return
      const sid = String(selectedId)
      if (sid === '__DEFAULT__') {
        selectedFilterStore.set(undefined)
        lastAppliedSavedViewId = null
        return
      }
      const next = allFilteredViews.find((v) => String(v._id) === sid)
      if (next !== undefined) {
        // Reset the guard BEFORE setting the store. The reactive Apply
        // block above short-circuits when the loaded view's _id equals
        // `lastAppliedSavedViewId` — desired behaviour for cross-viewlet
        // store traffic, but it breaks the user's intent HERE: after
        // locally tweaking color/overlay/zoom they explicitly re-selected
        // the same saved view to REVERT their dirty state. Without this
        // reset the click would be a no-op and savedViewModified stays
        // true forever.
        lastAppliedSavedViewId = null
        selectedFilterStore.set(next)
      }
    })
  }

  /**
   *  / Refactor D — hamburger "More actions" popup. Consolidates
   * Save / Load / PNG / PDF so they no longer crowd toolbar row 2. The
   * menu is positioned relative to the trigger button so it sits below
   * the toolbar (SelectPopup honours `eventToHTMLElement(event)` as
   * anchor). Fullscreen stays in the toolbar as a frequent affordance.
   */
  function openMoreActionsMenu (event: MouseEvent): void {
    const SAVE_ID = '__gantt_save__'
    const LOAD_ID = '__gantt_load__'
    const PNG_ID = '__gantt_png__'
    const PDF_ID = '__gantt_pdf__'
    const items: SelectPopupValueType[] = [
      { id: SAVE_ID, label: tracker.string.GanttSavedViewNew },
      { id: LOAD_ID, label: tracker.string.GanttSavedViewLoad },
      { id: PNG_ID, label: tracker.string.GanttExportPng },
      { id: PDF_ID, label: tracker.string.GanttExportPdf }
    ]
    const anchor = eventToHTMLElement(event)
    showPopup(SelectPopup, { value: items }, anchor, (selectedId) => {
      if (selectedId === undefined || selectedId === null) return
      switch (selectedId) {
        case SAVE_ID:
          openSaveViewPopup()
          break
        case LOAD_ID:
          // Re-anchor on the same trigger element so the submenu lines up
          // with the closed parent menu.
          openLoadViewMenu(anchor)
          break
        case PNG_ID:
          void exportToPng()
          break
        case PDF_ID:
          void exportToPdf()
          break
      }
    })
  }

  //  / Refactor D — onSavedViewSelectChange() removed alongside
  // the toolbar's <select>-element dropdown. Save/Load now route
  // through openMoreActionsMenu → openSaveViewPopup / openLoadViewMenu.

  /**
   * Is the live state different from what the selected saved view stored?
   *
   * The comparison set is exactly what `buildSavedViewOptions` persists — no
   * more, no less. Group-by and the remaining view options are not part of a
   * saved Gantt view, so changing them legitimately does not mark it dirty.
   *
   * The current values are passed IN rather than read from the component
   * scope: as a plain function reading `zoom` / `$ganttBarColorBy` / … from
   * the closure, the reactive statement below only tracked
   * `$selectedFilterStore`, so `savedViewModified` never flipped to true and
   * the whole `savedview` toolbar tier — "modified" marker plus update
   * button — was unreachable dead code.
   */
  function isCurrentGanttViewModified (fv: FilteredView | undefined, current: GanttSavedViewOptions): boolean {
    if (fv === undefined || fv.viewletId !== viewlet?._id) return false
    const saved = (fv.viewOptions as Record<string, unknown> | undefined) ?? {}
    if (saved.ganttZoomLevel !== current.zoomLevel) return true
    if ((saved.ganttBarColorBy ?? 'status') !== current.ganttBarColorBy) return true
    if ((saved.ganttShowPastDueOverlay ?? true) !== current.ganttShowPastDueOverlay) return true
    if ((saved.ganttShowBlockedOverlay ?? true) !== current.ganttShowBlockedOverlay) return true
    if ((saved.ganttShowSubIssueProgress ?? false) !== current.ganttShowSubIssueProgress) return true
    return false
  }

  $: savedViewModified = isCurrentGanttViewModified($selectedFilterStore, {
    zoomLevel: zoom,
    ganttBarColorBy: $ganttBarColorBy,
    ganttShowPastDueOverlay: $ganttShowPastDueOverlay,
    ganttShowBlockedOverlay: $ganttShowBlockedOverlay,
    ganttShowSubIssueProgress: $ganttShowSubIssueProgress
  })

  // Inline-extracted handler — keeping the TS cast out of an `on:click={…}`
  // attribute, which the Svelte 4 parser does not tolerate (// build-fix: inline `as Record<…>` inside an attribute value tripped
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

  // Saved Gantt-Views.
  // Live-query every FilteredView the current account can see (the server
  // already enforces visibility via FilteredView's `users` field + sharable
  // flag — same as SavedView in workbench-resources). We then partition
  // client-side via the helper into (mine | shared) buckets, filtered to
  // our viewlet so a Gantt-view doesn't surface in a List/Kanban context.
  const filteredViewQuery = createQuery()
  let allFilteredViews: FilteredView[] = []
  $: filteredViewQuery.query(view.class.FilteredView, { attachedTo: 'tracker' }, (res: FilteredView[]) => {
    allFilteredViews = res
  })
  $: ganttBuckets = filterGanttFilteredViews(
    allFilteredViews,
    viewlet?._id ?? ('' as Ref<Viewlet>),
    getCurrentAccount().uuid as unknown as string
  )

  // Instance-scoped drag-commit confirmation gate — one per mounted
  // GanttView, so parallel Gantt views never block each other (PR review).
  const confirmGate = createConfirmGate()

  // Phase-2 working-days calendar. `undefined` keeps legacy calendar-day
  // semantics; an explicit config (per-project weekday mask) makes the
  // scheduler and critical-path treat lag/slack in working days and paints
  // non-working days in the canvas background. Holiday DATES are not stored
  // per project: they come from the HR calendar of the department selected
  // in the config — the department's own holidays plus those of all
  // ancestor departments, mirroring hr-resources' ScheduleView semantics.
  // No department configured means "company-wide" (root department only);
  // a stale ref falls back to the root as well (review #10992).
  //
  // Model-optional runtime integration: only the declaration package
  // `@hcengineering/hr` is imported statically; whether the HR *model* is
  // installed is probed via hierarchy.hasClass at runtime. Without the
  // model the calendar is ready with an empty holiday list (no throw).
  // HR is subscribed only while a project opted in via `workingDaysConfig`
  // (legacy mode stays holiday-free by design). No date-window filter: the
  // scheduler/CPM work on the full issue span, not just the visible
  // viewport, and holiday sets are small (deduped).
  //
  // All load/switch state lives in CalendarStateMachine (lib/calendar-state
  // .ts, unit-tested with fake queries): synchronous reset + generation
  // bump on every project switch, stale-callback rejection, and the
  // mutation tickets that guard every persist site below.
  const ganttClient = getClient()
  const hrModelPresent = ganttClient.getHierarchy().hasClass(hr.class.PublicHoliday)
  const hrHolidayQuery = createQuery()
  const hrDepartmentQuery = createQuery()

  let calSnapshot: CalendarSnapshot = { ready: false, mutable: false, cfg: undefined, holidays: [] }
  // The active mutation's ticket. Captured at the three mutation entry
  // points, cleared on project switch. Only one calendar-dependent
  // mutation can be active at a time (single activeDrag state machine;
  // shiftFocused enters synchronously), so one slot suffices.
  let activeMutationTicket: MutationTicket | null = null

  const calendarState = new CalendarStateMachine(
    { project: projectQuery, departments: hrDepartmentQuery, holidays: hrHolidayQuery },
    hrModelPresent,
    { project: tracker.class.Project, department: hr.class.Department, holiday: hr.class.PublicHoliday },
    hr.ids.Head,
    (snap) => {
      // Component-scope assignment → Svelte reactivity.
      calSnapshot = snap
    },
    () => {
      // Synchronous cancellation on project switch: an in-flight drag or an
      // open confirmation popup belongs to the previous project. Release
      // the preview and drop the ticket; a still-open popup's callback then
      // aborts via mutationStillCurrent().
      activeMutationTicket = null
      activeDrag.set({ kind: 'idle' })
    }
  )
  $: calendarState.setSpace(space as Ref<Project> | undefined)
  // Calendar-dependent mutations may only START when a concrete project's
  // calendar is loaded. The all-projects view is read-only for
  // drag/resize/cascade/auto-schedule (no single project calendar); display
  // still renders via effectiveCalendar, and manual context-menu date-picks
  // (which take no mutation ticket) stay available.
  $: calendarMutable = calSnapshot.mutable

  // The single calendar every consumer (scheduler, CPM, canvas paint)
  // sees. Deliberately `undefined` until the gate opens: a half-loaded
  // calendar (weekday mask without holidays) must never reach painting or
  // scheduling math — that was the load-race in the previous revision.
  let effectiveCalendar: WorkingCalendar | undefined = undefined
  $: effectiveCalendar =
    calSnapshot.ready && calSnapshot.cfg !== undefined
      ? { weekdayMask: calSnapshot.cfg.weekdayMask, holidays: calSnapshot.holidays }
      : undefined

  /**
   * Stale-mutation guard for every persist site and every async
   * confirmation callback: ready must still hold, the generation captured
   * at mutation start must be unchanged, and the space being written to
   * must belong to the currently displayed project (see
   * CalendarStateMachine.isTicketCurrent).
   */
  function mutationStillCurrent (targetSpace?: Ref<Project>): boolean {
    return activeMutationTicket !== null && calendarState.isTicketCurrent(activeMutationTicket, targetSpace)
  }

  $: issueDocQuery = (
    space !== undefined ? { space, ...(query as DocumentQuery<Issue>) } : { ...(query as DocumentQuery<Issue>) }
  ) as DocumentQuery<Issue>
  // Milestones are intentionally NOT narrowed by the active search / filter:
  // they are swimlane headers + timeline markers, not search results, and the
  // Issue-only filter keys (priority, assignee, …) plus the `$search` phrase
  // have no counterpart on Milestone. See the `resultIssueCountStore` comment
  // above for why the empty-state count therefore counts issues only.
  $: milestoneDocQuery = (space !== undefined ? { space } : {}) as DocumentQuery<Milestone>
  // Honour the sort selected in the view options (startDate / rank / dueDate),
  // keeping rank as a stable tiebreaker; fall back to startDate when unset.
  $: sortOrder = (viewOptions.orderBy ?? ['startDate', SortingOrder.Ascending]) as [string, SortingOrder]
  $: issueSort = (
    sortOrder[0] === 'rank' ? { rank: sortOrder[1] } : { [sortOrder[0]]: sortOrder[1], rank: SortingOrder.Ascending }
  ) as SortingQuery<Issue>
  $: {
    // `.query()` returns false when the LiveQuery deduped a deep-equal
    // re-query — then no callback is coming and the loading flag must stay
    // as it is. See the `loadingIssues` declaration above.
    const issued = issueQuery.query(
      tracker.class.Issue,
      issueDocQuery,
      (res: Issue[]) => {
        // Normalize date fields to UTC-midnight at the Gantt data boundary
        // so scheduler/CPM/tint/layout and drag-commit all agree (no drag-jump,
        // no off-by-one tint for non-UTC users). Flat copies keep the query
        // cache docs untouched.
        issues = res.map((i) => ({
          ...i,
          startDate: toGanttDay(i.startDate),
          dueDate: toGanttDay(i.dueDate),
          deadline: toGanttDay(i.deadline)
        }))
        loadingIssues = false
      },
      {
        sort: issueSort
      }
    )
    if (issued) loadingIssues = true
  }

  // Resolve per-issue edit permission off the async canEditIssue() into a Set
  // the renderers can hit synchronously. Re-runs each time the issue query
  // delivers a new array. The IIFE pattern is required because Svelte's `$:`
  // doesn't await; the Set assignment fires later, which is fine because the
  // reactive renderers re-run again then.
  let editableGen = 0
  $: void (async () => {
    // Guard against out-of-order completion. Two rapid issue/milestone
    // updates each start an await-chain; without a generation token the older
    // (slower) run could overwrite editableIssueIds with a stale Set.
    const gen = ++editableGen
    const next = new Set<string>()
    for (const i of issues) {
      if (await canEditIssue(i)) next.add(i._id as unknown as string)
    }
    // Milestones share the same Set (their _ids are also branded
    // strings and don't collide with Issue _ids in practice — both are
    // ObjectId hex strings, and the Set lookup in GanttCanvas is just
    // 'has(String(id))').
    for (const m of milestones) {
      if (await canEditMilestone(m)) next.add(m._id as unknown as string)
    }
    if (gen !== editableGen) return // a newer run superseded this one
    editableIssueIds = next
  })()
  $: {
    // Same dedupe-aware arming as the issue query above.
    const issued = milestoneQuery.query(tracker.class.Milestone, milestoneDocQuery, (res: Milestone[]) => {
      // Same UTC-midnight boundary normalization as issues.
      milestones = res.map((m) => ({
        ...m,
        startDate: toGanttDay(m.startDate),
        targetDate: toGanttDay(m.targetDate) ?? m.targetDate
      }))
      loadingMilestones = false
    })
    if (issued) loadingMilestones = true
  }

  // v121 group-by lookup — components, persons, tag-labels live alongside
  // milestones. `space` scopes the query to the active project just like
  // milestones / issues. Persons are cross-project (no `space` filter).
  $: componentDocQuery = (space !== undefined ? { space } : {}) as DocumentQuery<Component>
  $: componentQuery.query(tracker.class.Component, componentDocQuery, (res: Component[]) => {
    components = res
  })
  // Persons feed ONLY the assignee label map (see labelMap below), so
  // scope the query to the assignee refs actually present on loaded issues
  // instead of pulling every Person in the workspace. Empty `$in` matches no
  // docs (correct: no assignees → no person labels needed).
  $: assigneeIds = Array.from(new Set(issues.map((i) => i.assignee).filter((a): a is Ref<Person> => a != null)))
  $: personQuery.query(contact.class.Person, { _id: { $in: assigneeIds } }, (res: Person[]) => {
    persons = res
  })
  $: tagElementQuery.query(tags.class.TagElement, { targetClass: tracker.class.Issue }, (res: TagElement[]) => {
    tagElements = res
  })

  $: relationDocQuery = (space !== undefined ? { space } : {}) as DocumentQuery<IssueRelation>
  // The Huly/CockroachDB adapter doesn't translate `$or` at the top level
  // (it stringifies it as a JSONB path and crashes). Query the entire
  // space's relations instead and let the dependency-layer filter
  // client-side via barRects (only relations whose endpoints are in
  // visible barRects get rendered). Relations are typically sparse so
  // this is cheap. Predecessor column does its own client-side filter.
  $: relationQuery.query(tracker.class.IssueRelation, relationDocQuery, (res: IssueRelation[]) => {
    relations = res
    optimisticRelations = optimisticRelations.filter(
      (pending) =>
        !res.some(
          (rel) => rel.attachedTo === pending.attachedTo && rel.target === pending.target && rel.kind === pending.kind
        )
    )
  })

  // C — padding follows the active tick granularity, so a
  // wheel-zoomed view also gets sensible left/right padding.
  $: dateRange = computeDateRange(issues, milestones, tickZoomLevel)

  // Maximum-zoom-out floor: bars must always occupy at least
  // BAR_COVERAGE_MIN of the canvas viewport, so the user can't pan into
  // an empty void where the issues collapse to a tiny island. Computed
  // from the unpadded data extent (earliest barStart → latest barEnd)
  // and the live canvas width. Falls back to the static MIN_PPD when
  // we don't yet have a viewport width or any issues/milestones to
  // measure.
  const BAR_COVERAGE_MIN = 0.9 // 5% pad left + 5% pad right = 90% bars
  $: barExtentDays = (() => {
    const DAY_MS = 86_400_000
    const ts: number[] = []
    for (const i of issues) {
      if (i.startDate !== null && i.startDate !== undefined) ts.push(i.startDate)
      if (i.dueDate !== null && i.dueDate !== undefined) ts.push(i.dueDate)
    }
    for (const m of milestones) {
      if (m.targetDate !== null && m.targetDate !== undefined) ts.push(m.targetDate)
    }
    if (ts.length < 2) return 0
    return (Math.max(...ts) - Math.min(...ts)) / DAY_MS
  })()
  $: dynamicMinPpd =
    canvasViewportWidth > 0 && barExtentDays > 0
      ? Math.max(MIN_PPD, (BAR_COVERAGE_MIN * canvasViewportWidth) / barExtentDays)
      : MIN_PPD
  // Re-clamp the wheel-zoom override if the dataset or viewport shrinks
  // so an already-overridden value never sits below the new floor.
  $: if (userPxPerDay !== null && userPxPerDay < dynamicMinPpd) {
    userPxPerDay = dynamicMinPpd
  }

  // Lookup so GanttCanvas can build a `DragTarget` for a milestone
  // bar without having to thread the full Milestone[] down.
  $: milestonesById = new Map<string, Milestone>(milestones.map((m) => [m._id as unknown as string, m]))

  // Bar-color context: components lookup for component-color mode.
  $: componentsById = new Map<string, Component>(components.map((c) => [String(c._id), c]))

  // Predecessor maps for the blocked-hatch overlay.
  // Map<successorId stringified, Array<predecessorId>> — FS dependencies only.
  $: predecessorsByIssueId = (() => {
    const m = new Map<string, Array<Ref<Issue>>>()
    for (const rel of relations) {
      if (rel.kind !== 'finish-to-start') continue
      const downstream = String(rel.target)
      const upstream = rel.attachedTo
      const arr = m.get(downstream)
      if (arr === undefined) m.set(downstream, [upstream])
      else arr.push(upstream)
    }
    return m
  })()

  // Map<issueId stringified, Ref<IssueStatus>> — predecessor status lookup.
  $: predStatusByIssueId = new Map<string, Ref<IssueStatus>>(issues.map((i) => [String(i._id), i.status]))

  // Push predecessor maps into context stores whenever they change.
  $: predecessorsByIssueIdStore.set(predecessorsByIssueId)
  $: predStatusByIssueIdStore.set(predStatusByIssueId)

  $: if ($ganttShowSubIssueProgress) {
    const parents = issues.filter((i) => i.subIssues > 0).map((i) => i._id)
    if (parents.length === 0) {
      subIssuesByParent.set(new Map())
    } else {
      // Global query — ignores the active filter on purpose.
      subIssuesQuery.query(tracker.class.Issue, { attachedTo: { $in: parents } }, (loaded: Issue[]) => {
        const m = new Map<string, Issue[]>()
        for (const s of loaded) {
          const k = String(s.attachedTo)
          let arr = m.get(k)
          if (arr === undefined) {
            arr = []
            m.set(k, arr)
          }
          arr.push(s)
        }
        subIssuesByParent.set(m)
      })
    }
  } else {
    subIssuesQuery.unsubscribe()
    subIssuesByParent.set(new Map())
  }

  function paddingDays (z: ZoomLevel): number {
    switch (z) {
      case 'day':
        return 1
      case 'week':
        return 7
      case 'month':
        return 30
      case 'quarter':
        return 90
      default:
        return 7
    }
  }

  function computeDateRange (iss: Issue[], ms: Milestone[], z: ZoomLevel): { from: number, to: number } {
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

  // C — base scale uses `effectivePxPerDay` (preset OR wheel-zoom
  // override) and `tickZoomLevel` for tick granularity. When the user has
  // an explicit override (Ctrl+Wheel), we skip the adaptive widen-to-fill
  // pass so the user's chosen scale is respected literally.
  $: baseTimeScale = createTimeScale(tickZoomLevel, dateRange.from, effectivePxPerDay)
  $: baseDataCanvasWidth = Math.max(1, Math.ceil(baseTimeScale.toX(dateRange.to) - baseTimeScale.toX(dateRange.from)))
  $: adaptivePxPerDay =
    userPxPerDay !== null
      ? effectivePxPerDay
      : computeAdaptivePxPerDay(baseTimeScale.pxPerDay, baseDataCanvasWidth, canvasViewportWidth)
  $: timeScale = createTimeScale(tickZoomLevel, dateRange.from, adaptivePxPerDay)
  $: milestoneMarkers = milestones.map<MilestoneMarker>((m) => ({
    _id: m._id,
    label: m.label,
    startDate: (m as Milestone & { startDate: number | null }).startDate ?? null,
    targetDate: m.targetDate
  }))

  // Tree-View — persisted collapsed-row-id set per project.
  // The store is bound to the current project's localStorage key; switching
  // projects re-binds via the reactive block below. In SSR / test contexts
  // where `window` is undefined we fall back to an in-memory Set so the
  // component still mounts (and toggle is a no-op across reloads).
  let collapsedIds = new Set<string>()
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
    treeExpandUnsub = treeExpandStore.subscribe((set) => {
      collapsedIds = set
    })
  }
  $: bindTreeExpandStore(space === undefined ? undefined : String(space))
  onDestroy(() => {
    treeExpandUnsub?.()
  })

  function onToggle (e: CustomEvent<{ id: string }>): void {
    // Group-header rows carry an `id` like "group:<key>". Route
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

  /** Toolbar "Expand all" — flush every persisted collapsed entry. */
  function expandAllTree (): void {
    if (treeExpandStore !== null) treeExpandStore.expandAll()
    else collapsedIds = new Set()
  }
  /**
   * Toolbar "Collapse all" — collapse every collapsible row in the
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

  // Apply the filter predicate to the raw issue feed BEFORE either
  // legacy buildLayout (hierarchy) or buildGroupedRows (swimlanes) runs. When
  // groupBy is active the hierarchy is intentionally flattened: sub-issues
  // appear in their own bucket per their own status/priority/assignee, not
  // under the parent — hierarchy and group-by cannot both own the row order,
  // and the explicit grouping the user asked for wins. The
  // milestone-row overlay path is similarly suppressed because lane-headers
  // already provide the visual grouping affordance.
  //
  // the legacy `buildLayout` path now receives the *un*-
  // filtered issue list together with a `matchedIds`-set and
  // `includeBreadcrumbs: true`. This lets non-matching parents be rendered
  // as filter-breadcrumbs, so a matching sub-issue never loses its tree
  // context when a filter is on. The group-by path keeps the
  // hard-filter behaviour since swimlanes have no parent-context to preserve.
  // E — `filteredIssues` is now a thin alias for `issues` because
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
  let priorityNames = new Map<string, string>()
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
      // within-level sort. Replaces the global post-pass sort that
      // previously flattened the hierarchy (`sortedRows` is now an identity
      // pass-through — kept for diff-stability with downstream consumers).
      const withinLevelCompare =
        extendedColumns && sidebarSort.column !== null
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
    const withinGroupCompare =
      extendedColumns && sidebarSort.column !== null
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
  // Identifier lookup for the sidebar predecessor column. Built from the full
  // loaded issue set, not from `rows`, so a predecessor that is filtered out,
  // collapsed or in another group lane still resolves to its number.
  $: issueIdentifiers = new Map<Ref<Issue>, string>(issues.map((i) => [i._id, i.identifier]))
  $: statusCategoryMap = buildStatusCategoryMap($statusStore.byId)
  function buildStatusCategoryMap (byId: Map<any, any>): Map<string, string> {
    const out = new Map<string, string>()
    for (const [id, status] of byId.entries()) {
      out.set(String(id), String(status.category ?? ''))
    }
    return out
  }

  // Push a freshly-built BarColorContext whenever inputs change.
  // componentsById is derived above (near milestonesById).
  $: barColorContextStore.set(buildBarColorContext(issues, statusCategoryMap, componentsById, milestonesById))

  function computeSummaryRanges (layoutRows: LayoutRow[], allIssues: Issue[]): Map<string, SummaryRange> {
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
        const starts = kids.map((k) => k.startDate).filter((v): v is number => v !== null && v !== undefined)
        const dues = kids.map((k) => k.dueDate).filter((v): v is number => v !== null && v !== undefined)
        result.set(row.id, {
          startDate: starts.length > 0 ? Math.min(...starts) : null,
          dueDate: dues.length > 0 ? Math.max(...dues) : null
        })
        continue
      }
      if (row.issue === null) continue
      const id = row.issue._id as unknown as string
      const kids = childrenOf.get(id) ?? []
      const starts = kids.map((k) => k.startDate).filter((v): v is number => v !== null && v !== undefined)
      const dues = kids.map((k) => k.dueDate).filter((v): v is number => v !== null && v !== undefined)
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
  $: dataCanvasWidth = Math.max(1, Math.ceil(timeScale.toX(dateRange.to) - timeScale.toX(dateRange.from)))
  $: totalCanvasWidth = computeCanvasRenderWidth(dataCanvasWidth, canvasViewportWidth)

  /**
   * Trigger a debounced critical-path recompute. The 200 ms delay is
   * deliberate: drag interactions can fire dozens of updates per second
   * via reactive cascades, but the user only needs the CP overlay to
   * settle once dragging stops. On cycle detection we surface a banner
   * at most once per minute so a long-lived cycle doesn't flood the
   * notification tray.
   */
  function scheduleCpRecompute (
    _issues: Issue[],
    _relations: IssueRelation[],
    _show: boolean,
    _showSlack: boolean,
    _cfg: WorkingCalendar | undefined
  ): void {
    // Slack is an OUTPUT of the same forward/backward pass that produces the
    // critical set, but it is a separate piece of information: "how far can
    // this issue move before it delays the project". The Slack column is its
    // own Customize-view toggle, so gating the computation on
    // `showCriticalPath` alone made that toggle a no-op whenever the
    // critical-path overlay was off — the switch stayed visibly ON while the
    // column silently rendered nothing. The pass therefore runs whenever
    // EITHER consumer is on; the overlay (red bars / red arrows / CP badge)
    // stays gated on `showCriticalPath` at the render sites, so turning the
    // Slack column on does not add critical-path visuals to the chart.
    if (!showCriticalPath && !showSlackColumn) {
      // Drop a recompute queued before the toggles went off — otherwise it
      // fires into a view that shows neither overlay nor column, repopulating
      // the result cleared right below and possibly raising the cycle warning.
      cpDirtyTimer.cancel()
      if (cpResult.critical.size > 0 || cpResult.slack.size > 0 || cpResult.cycle) {
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
    cpDirtyTimer.schedule(() => {
      cpResult = computeCriticalPath(issues, relations, _cfg)
      if (cpResult.cycle && Date.now() - lastCpCycleNotifiedAt > 60_000) {
        lastCpCycleNotifiedAt = Date.now()
        void (async () => {
          const t = await translate(tracker.string.CriticalPathCycle, {}, undefined)
          addNotification(t, '', undefined as any, undefined, NotificationSeverity.Warning)
        })()
      }
    })
  }

  // Firefox emits a "scroll-linked positioning effect" warning when
  // a scroll handler synchronously mutates layout-affecting CSS (here:
  // `transform: translateX(...)` on `.hscroll-inner`). Defer the reactive
  // update into the next animation frame so the compositor finishes the pan
  // frame uninterrupted; updates within the same frame coalesce on the latest
  // scrollLeft/scrollTop, matching the previous behaviour visually but
  // decoupling from the scroll event itself.
  let vScrollRaf: number | null = null
  let hScrollRaf: number | null = null
  function handleVScroll (e: Event): void {
    const t = e.target as HTMLDivElement
    if (vScrollRaf !== null) return
    vScrollRaf = requestAnimationFrame(() => {
      vScrollRaf = null
      scrollTop = t.scrollTop
      viewportHeight = t.clientHeight
    })
  }
  function handleHScroll (e: Event): void {
    const t = e.target as HTMLDivElement
    if (hScrollRaf !== null) return
    hScrollRaf = requestAnimationFrame(() => {
      hScrollRaf = null
      canvasViewportLeft = t.scrollLeft
      canvasViewportWidth = t.clientWidth
    })
  }

  function onJump (e: CustomEvent<{ x: number }>): void {
    if (hScrollEl != null) {
      hScrollEl.scrollTo({ left: Math.max(0, e.detail.x - 80), behavior: 'smooth' })
      // B — see jumpToToday comment; force viewport resync so the
      // dependency-arrow visibility re-runs without waiting on pointermove.
      queueMicrotask(syncViewport)
    }
    // On phones, tapping a drawer entry scrolls the canvas to that bar and
    // closes the drawer again — leaving it open would just cover the bar the
    // user asked to see.
    if (layoutMode === 'phone') mobileDrawerOpen = false
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

  // Open the EditMilestone popup when a milestone row is clicked in
  // the sidebar — user expects parity with the issue row's single-click
  // open behavior. The sidebar carries a compact
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
  // Edit-mode: bar mousedown → reducer; window mousemove/mouseup; commit.
  // -------------------------------------------------------------------------

  function handleBarMouseDown (
    e: CustomEvent<{ target: DragTarget, edge: 'left' | 'right' | 'body', cursorX: number }>
  ): void {
    const id = String(e.detail.target.doc._id)
    // Bulk-Drag arm-check.
    // If the bar is part of an active multi-selection of size ≥ 2 AND the
    // mousedown is on the body edge, we skip the legacy "arm-then-drag"
    // two-step and go straight to dragging-body with a co-drag payload.
    // The user already armed the bars via Cmd/Shift-click; requiring a
    // second click would defeat the point of bulk-select.
    const isBulkBodyDrag =
      e.detail.edge === 'body' &&
      e.detail.target.kind === 'issue' &&
      multiSelectedIssueIds.size >= 2 &&
      multiSelectedIssueIds.has(e.detail.target.doc._id)
    if (!isBulkBodyDrag && selectedIssueId !== id) {
      selectedIssueId = id
      focusedIssueId = id
      return
    }
    // Ready-gate: no calendar-dependent mutation (drag/resize/bulk-drag)
    // may start before the calendar is initially loaded — a fast drag could
    // otherwise persist dates computed from a half-loaded calendar.
    if (!calendarMutable) return
    // Generation capture: every persist and every async confirmation
    // callback of this mutation re-validates against this ticket.
    activeMutationTicket = calendarState.beginMutation()
    // Capture origin dates at the dispatch boundary so the doc-
    // agnostic reducer doesn't need to know which field on target.doc to
    // read. Milestone uses targetDate, Issue uses dueDate.
    const t = e.detail.target
    const originStart = t.kind === 'issue' ? (t.doc.startDate as number) : (t.doc.startDate as number)
    const originEnd = t.kind === 'issue' ? (t.doc.dueDate as number) : t.doc.targetDate
    // Guard: a milestone with startDate=null shouldn't reach this path — the
    // bar isn't rendered. Issue with null dates was already handled
    // (mousedown-unscheduled path).
    if (originStart == null || originEnd == null) return
    // Build co-drag payload for the bulk-drag branch. Members are every
    // selected issue with both dates set; the leading bar's id is included
    // too so the commit loop can iterate members uniformly without
    // special-casing it.
    let coDrag:
    | {
      members: Array<{ issueId: Ref<Issue>, originStart: number, originEnd: number }>
      minDeltaMs: number
      maxDeltaMs: number
    }
    | undefined
    if (isBulkBodyDrag) {
      const memberIssues = issues.filter(
        (i) => multiSelectedIssueIds.has(i._id) && i.startDate != null && i.dueDate != null
      )
      if (memberIssues.length >= 2) {
        const bounds = computeBulkDeltaBounds(
          new Set(memberIssues.map((i) => i._id)),
          issues,
          relations,
          effectiveCalendar
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
    activeDrag.update((s) =>
      reduce(
        s,
        {
          type: 'mousedown-bar',
          target: t,
          originStart,
          originEnd,
          edge: e.detail.edge,
          cursorX: e.detail.cursorX,
          coDrag
        },
        timeScale
      )
    )
  }

  function handleBarClick (
    e: CustomEvent<{ target: DragTarget, metaKey: boolean, ctrlKey: boolean, shiftKey: boolean }>
  ): void {
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
    const id = e.detail.target.doc._id
    // modifier-key routing.
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
      multiSelectedIssueIds = selectRange(multiSelectedIssueIds, lastClickedIssueId, id, orderedSelectableIds)
      selectedIssueId = idStr
      focusedIssueId = idStr
      return
    }
    multiSelectedIssueIds = clearSelection()
    lastClickedIssueId = id
    selectedIssueId = idStr
    focusedIssueId = idStr
    // Opt-in quick-info popover. Only on plain single click
    // (no modifiers) and only when the user has flipped the ViewOption.
    if (quickInfoOnClick && e.detail.target.kind === 'issue') {
      const issueDoc = e.detail.target.doc
      showPopup(GanttQuickInfoPopup, { issue: issueDoc }, 'top', (result?: 'openFull') => {
        // Mobile-A11Y: the quick-info popover is the canonical
        // "open issue" entry point on phones (double-tap conflicts with
        // iOS/Android system zoom). When the user clicks "Open full
        // editor", route through the same showPanel path that the
        // desktop dblclick uses so behaviour stays consistent.
        if (result === 'openFull') {
          showPanel(
            tracker.component.EditIssue,
            issueDoc._id as Ref<Doc>,
            issueDoc._class as Ref<Class<Doc>>,
            'content'
          )
        }
      })
    }
  }

  function handleConnectorDown (e: CustomEvent<{ source: Issue, originPx: { x: number, y: number } }>): void {
    activeDrag.update((s) =>
      reduce(
        s,
        {
          type: 'mousedown-connector',
          source: e.detail.source,
          originPx: e.detail.originPx,
          cursorPx: e.detail.originPx
        },
        timeScale
      )
    )
    attachWindowDragListeners()
  }

  // Single entry point for connector-drag: GanttConnectorDot dispatches
  // 'connectorDown' via Svelte from one on:mousedown binding on its
  // hit-circle. Earlier drafts had three parallel pathways (template
  // binding + direct addEventListener inside the dot + document-level
  // capture-phase delegation), all of which fired concurrently and
  // produced double mousedown handling. Keep this handler the only one.

  function handleBarHover (e: CustomEvent<{ issue: Issue | null }>): void {
    hoveredIssue = e.detail.issue?._id ?? null
  }

  function handleHoverEdge (e: CustomEvent<{ source: Ref<Issue>, target: Ref<Issue> } | null>): void {
    hoveredEdge = e.detail as { source: Ref<Issue>, target: Ref<Issue> } | null
  }

  /**
   * smooth-scroll the outer scroller to the row of the
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
    // B — Jump-to-Position arrows previously needed a pointermove
    // before dependency arrows to other rows showed up because the
    // programmatic vertical scroll did not always re-fire the scroll event
    // (no-op when target equals current top). Force a viewport resync so
    // depYBounds + classifyArrowVisibility re-run immediately.
    queueMicrotask(syncViewport)
  }

  function handleOpenEditor (e: CustomEvent<{ relation: IssueRelation }>): void {
    const rel = e.detail.relation
    // Editability follows the source (predecessor) issue: a relation is
    // stored on it, so updating the relation is an update of that issue.
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
    // a click outside any bar also clears the multi-
    // selection, matching the UI expectation that the "selection
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
    // once a confirmation popup is open the drag preview must
    // freeze at the position the user released the bar. Without this
    // gate, every pointermove call into the reducer kept moving the
    // preview while the popup was visible (hover-bug).
    if (confirmGate.isConfirming()) return
    // While connector-drawing, dispatch mousemove-connector with
    // svg-local cursorPx + the issue under the cursor. Coordinate frame
    // matches barRects (computed in GanttCanvas) so the live bezier
    // anchors correctly. document.elementFromPoint hits the bar's <rect>
    // through the .bar-wrap <g> and its data-issue-id attribute.
    const state = $activeDrag
    if (state.kind === 'connector-drawing' || state.kind === 'connector-target-hover') {
      const svg = scrollerEl?.querySelector('svg.gantt-canvas') as SVGSVGElement | null
      if (svg === null) return
      const svgRect = svg.getBoundingClientRect()
      const cursorPx = { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top }
      const hoveredEl = document.elementFromPoint(e.clientX, e.clientY)
      const issueId = hoveredEl?.closest('.bar-wrap')?.getAttribute('data-issue-id') as Ref<Issue> | null
      const hoveredBar = issueId !== null ? (issues.find((i) => i._id === issueId) ?? null) : null
      activeDrag.update((s) =>
        reduce(
          s,
          {
            type: 'mousemove-connector',
            cursorPx,
            hoveredBar: hoveredBar !== null && hoveredBar._id !== state.source._id ? hoveredBar : null
          },
          timeScale
        )
      )
      return // Don't also fire mousemove for bar drag
    }
    activeDrag.update((s) =>
      reduce(s, { type: 'mousemove', cursorX: e.clientX, canvasX: computeCanvasX(e) }, timeScale)
    )
  }

  async function handleCanvasPointerUp (e?: PointerEvent | MouseEvent): Promise<void> {
    // when a confirmation popup is up the user's click on the
    // Cancel / Apply button bubbles pointerup to the window. Without this
    // guard we'd re-enter the commit path while activeDrag is still in
    // `dragging-body`, opening a second popup on top of the first
    // (double-popup bug). The popup's own resolve handler is the single
    // exit point that releases the gate and decides commit/cancel.
    if (confirmGate.isConfirming()) return
    const state = $activeDrag
    if (state.kind === 'connector-drawing') {
      activeDrag.set({ kind: 'idle' })
      return
    }
    if (state.kind === 'connector-target-hover') {
      const src = state.source
      const tgt = state.target
      activeDrag.set({ kind: 'idle' })
      // Cycle check before any write: a cyclic dependency graph would make
      // the scheduler diverge, so block the edit and explain it via a toast
      // rather than silently dropping it.
      if (wouldCreateCycle(src._id, tgt._id, relations)) {
        const title = await translate(tracker.string.DependencyCycle, {}, undefined)
        addNotification(title, '', undefined as any, undefined, NotificationSeverity.Error)
        return
      }
      const client = getClient()
      const ops = client.apply(undefined, 'gantt-dependency-create')
      // Pre-allocate the _id so the undo entry can carry the exact
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
   * When the target is a Milestone, the confirm popup gets the
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
    ) {
      return false
    }
    const newStart = state.kind === 'resizing-right' ? state.originStart : state.previewStart
    const newDue = state.kind === 'resizing-left' ? state.originEnd : state.previewEnd
    const kind: 'move' | 'resize' =
      state.kind === 'resizing-left' || state.kind === 'resizing-right' ? 'resize' : 'move'
    // gate further pointer input + re-entry of handleCanvasPointerUp
    // while the confirmation popup is visible. Without this, pointermove
    // keeps shoving the preview bar around (hover-bug) and the Cancel/Apply
    // button's mouseup re-fires handleCanvasPointerUp, opening a second
    // popup (double-popup bug). The flag is cleared inside the resolve
    // path below so any code path out of the popup releases the gate.
    confirmGate.setConfirming(true)
    return await new Promise<boolean>((resolve) => {
      showPopup(
        GanttConfirmCommitPopup,
        { issue: state.target.doc, kind, newStart, newDue },
        'top',
        (result: boolean | undefined) => {
          confirmGate.setConfirming(false)
          resolve(result === true)
        }
      )
    })
  }

  // The drag-commit / cascade paths only read scheduling-relevant
  // fields off the full-space fetch (dates, parents, schedulingMode, assignee,
  // milestone — all data-blob fields — plus the base columns `space` and
  // `createdBy` needed by ops.update() and canEditIssue()'s guest creator
  // short-circuit). Projecting to them avoids selecting the unused base
  // columns while keeping every consumer's inputs byte-identical.
  const dragCommitProjection: Projection<Issue> = {
    _id: 1,
    space: 1,
    createdBy: 1,
    startDate: 1,
    dueDate: 1,
    parents: 1,
    schedulingMode: 1,
    assignee: 1,
    milestone: 1,
    // `identifier` + `title` are display-only for the commit itself, but the
    // issues fetched with this projection are handed straight to
    // ConfirmCascadePopup, whose row labels read exactly these two fields.
    // Without them the popup fell back to a raw `_id` suffix on FIRST open
    // and only rendered "GAME-7 <title>" on the second (by then the client
    // cache held full documents). Projecting them makes the first render
    // correct instead of racing the cache.
    identifier: 1,
    title: 1
  }

  /**
   * Commit a drag for an Issue target. Mirrors the shared commit path; the
   * cascade walks descendant issues (parent → children shift by delta).
   */
  async function commitIssueDrag (
    state: DragState,
    target: { kind: 'issue', doc: Issue },
    ops: ApplyOperations
  ): Promise<void> {
    if (state.kind === 'dragging-body') {
      await ops.update(target.doc, { startDate: (state as any).previewStart, dueDate: (state as any).previewEnd })
      const delta = (state as any).previewStart - (state as any).originStart
      if (delta !== 0) {
        // Fetch the full space's issues here rather than reusing the
        // view-filtered `issues` array — otherwise children hidden by an
        // active Tracker filter wouldn't shift with the parent and the
        // tree would drift out of sync.
        const client = getClient()
        const allInSpace = await client.findAll(
          tracker.class.Issue,
          { space: target.doc.space },
          { projection: dragCommitProjection }
        )
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
   * Commit a drag for a Milestone target.
   * Field mapping: Issue.dueDate ↔ Milestone.targetDate; startDate is shared.
   * Cascade (brainstorm decision B): when the milestone moves, all issues
   * assigned to it shift by the same delta along with their descendants.
   * No cascade for resize — only the milestone bounds change.
   */
  async function commitMilestoneDrag (
    state: DragState,
    target: { kind: 'milestone', doc: Milestone },
    ops: ApplyOperations
  ): Promise<void> {
    if (state.kind === 'dragging-body') {
      await ops.update(target.doc, { startDate: (state as any).previewStart, targetDate: (state as any).previewEnd })
      const delta = (state as any).previewStart - (state as any).originStart
      if (delta !== 0) {
        const client = getClient()
        const allInSpace = await client.findAll(
          tracker.class.Issue,
          { space: target.doc.space },
          { projection: dragCommitProjection }
        )
        const assigned = allInSpace.filter(
          (i) => (i as unknown as { milestone?: string | null }).milestone === target.doc._id
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
     * optional cascadeToken scope override. Bulk-drag
     * passes `'gantt-bulk-cascade'` so every Tx of one bulk-op shares the
     * same prefix downstream consumers ( notification batcher)
     * can correlate by. Default keeps the legacy scope strings.
     */
    cascadeScope?: string
  ): Promise<void> {
    const client = getClient()

    // Full-space lookup is needed for both branches — the alt-bypass branch
    // also needs to resolve hidden predecessors/successors when counting
    // direct violations, otherwise filter-hidden relations are invisible
    // to the warning banner.
    const allInSpace = await client.findAll(tracker.class.Issue, { space }, { projection: dragCommitProjection })
    // Stale-mutation guard after the await: a project switch during the
    // fetch must abort before anything persists (generation captured at
    // mutation start, bumped synchronously on every switch).
    if (!mutationStillCurrent(space)) {
      activeDrag.set({ kind: 'idle' })
      return
    }
    const allByRef = new Map<Ref<Issue>, Issue>()
    for (const i of allInSpace) allByRef.set(i._id, i)

    if (altKey) {
      // cascadeToken plumbing. Tag every cascade-related
      // commit with a unique token (scope-string) so  (bulk-
      // drag) and  (cascade-shift notification) can correlate
      // every sub-Tx of one user-action to a single batch downstream.
      const cascadeToken = newCascadeToken(cascadeScope ?? 'gantt-cascade-bypass')
      const ops = client.apply(undefined, cascadeToken)
      for (const pe of primaryEdits) {
        await ops.update(pe.issue, { startDate: pe.newStart, dueDate: pe.newDue })
      }
      const undoEntry = buildDateUndoEntry(primaryEdits, [])
      // Commit-point guard: the awaited ops.update() calls above are the
      // last suspension points before the write — a project switch while
      // they were awaited must abort HERE, right before ops.commit().
      if (!mutationStillCurrent(space)) {
        activeDrag.set({ kind: 'idle' })
        return
      }
      const result = await ops.commit()
      if (!result.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        activeDrag.set({ kind: 'idle' })
        return
      }
      if (undoEntry !== null) undoManager.push(undoEntry)
      // send dependency-shift bundle notifications. Bypass
      // path: the user explicitly chose to ignore violations, so we still
      // notify watchers/assignees of the primary moves but skip cascade
      // shifts (there are none on the bypass branch).
      void emitDependencyShiftBundles(primaryEdits, [], cascadeToken)
      // Count direct violations against full-space relations + full-space issue dates.
      let violations = 0
      const primarySet = new Set(primaryEdits.map((p) => String(p.issue._id)))
      for (const pe of primaryEdits) {
        for (const r of relations) {
          const involvesPrimary =
            String(r.attachedTo) === String(pe.issue._id) || String(r.target) === String(pe.issue._id)
          if (!involvesPrimary) continue
          const otherRef = String(r.attachedTo) === String(pe.issue._id) ? r.target : r.attachedTo
          if (primarySet.has(String(otherRef))) continue
          const otherIssue = allByRef.get(otherRef)
          if (otherIssue?.startDate == null || otherIssue?.dueDate == null) continue
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
    // Batch the per-issue permission check — for guests this collapses
    // one Collaborator findOne per issue into a single findAll; for non-guests
    // it short-circuits to `true` without any query (same result as before).
    const canEditMap = await canEditIssuesBatch(allInSpace)

    // Re-check after the second await (permission batch), immediately
    // before the simulation reads effectiveCalendar.
    if (!mutationStillCurrent(space)) {
      activeDrag.set({ kind: 'idle' })
      return
    }

    const result: SimulateResult = simulateCascade(
      primaryEdits,
      allInSpace,
      relations,
      (ref) => canEditMap.get(ref) ?? false,
      { workingDays: effectiveCalendar }
    )

    switch (result.kind) {
      case 'no-cascade': {
        // Three sub-paths depending on the shape of the edit:
        //   (a) Single-issue primary + legacy toggle on → GanttConfirmCommitPopup
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
          // gate pointer input + handleCanvasPointerUp re-entry
          // while the cascade popup is up (bulk-drag hover-bug / double-popup).
          confirmGate.setConfirming(true)
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
              confirmGate.setConfirming(false)
              // Async confirmation callback: the popup may have been open
              // across a project switch — re-validate the ticket.
              if (!ok || !mutationStillCurrent(space)) {
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
          // same gate around the single-issue legacy popup.
          confirmGate.setConfirming(true)
          const ok = await new Promise<boolean>((resolve) => {
            showPopup(
              GanttConfirmCommitPopup,
              { issue: pe.issue, kind: legacyConfirmKind, newStart: pe.newStart, newDue: pe.newDue },
              'top',
              (r: boolean | undefined) => {
                confirmGate.setConfirming(false)
                resolve(r === true)
              }
            )
          })
          if (!ok || !mutationStillCurrent(space)) {
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
        // Commit-point guard after the awaited update loop.
        if (!mutationStillCurrent(space)) {
          activeDrag.set({ kind: 'idle' })
          return
        }
        const r = await ops.commit()
        if (!r.result) {
          const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
          addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
        } else {
          if (undoEntry !== null) undoManager.push(undoEntry)
          // single-issue / parent-drag with no cascade: still
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
        // gate pointer input + handleCanvasPointerUp re-entry.
        confirmGate.setConfirming(true)
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
            confirmGate.setConfirming(false)
            // Async confirmation callback: the popup may have been open
            // across a project switch — re-validate the ticket.
            if (!ok || !mutationStillCurrent(space)) {
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
      }
    }
  }

  /**
   * Build a single undo-entry for a primary+shifts batch.
   * Returns null when there is nothing to record (zero-issue commit).
   */
  function buildDateUndoEntry (primary: PrimaryEdit[], shifts: CascadeShift[]): UndoEntry | null {
    const changes: Array<{
      issueId: Ref<Issue>
      issueSpace: Ref<Space>
      before: { startDate: number | null, dueDate: number | null }
      after: { startDate: number | null, dueDate: number | null }
    }> = []
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
     * cascadeToken scope override. Bulk-drag passes
     * `'gantt-bulk-cascade'` so the entire batch (primaries + cascade
     * fanout) shares one scope-prefix downstream.
     */
    cascadeScope: string = 'gantt-cascade-commit'
  ): Promise<void> {
    // Defensive early abort: every caller re-checks, and the commit-point
    // guard below re-validates once more right before ops.commit().
    if (!mutationStillCurrent(primary[0]?.issue.space)) return
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
    // Commit-point guard (pairs with the early abort at the top of this
    // function): the update loops above are awaited — re-check right
    // before the write. Callers release the preview in their .finally(),
    // so a plain return suffices here.
    if (!mutationStillCurrent(primary[0]?.issue.space)) return
    const r = await ops.commit()
    if (!r.result) {
      const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
      addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
      return
    }
    if (undoEntry !== null) undoManager.push(undoEntry)
    // full cascade with shifts: emit one bundle per recipient
    // covering both the primary moves and the cascade fanout.
    void emitDependencyShiftBundles(primary, shifts, cascadeToken)
  }

  /**
   * emit `DependencyShiftedNotification` bundles for the
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
  function relationSatisfied (r: IssueRelation, pe: PrimaryEdit, otherIssue: Issue): boolean {
    const isOutgoing = String(r.attachedTo) === String(pe.issue._id)
    const predStart = isOutgoing ? pe.newStart : (otherIssue.startDate as number)
    const predDue = isOutgoing ? pe.newDue : (otherIssue.dueDate as number)
    const succStart = isOutgoing ? (otherIssue.startDate as number) : pe.newStart
    const succDue = isOutgoing ? (otherIssue.dueDate as number) : pe.newDue
    const lag = r.lag ?? 0
    switch (r.kind) {
      case 'finish-to-start':
        return fsAnchor(predDue, lag, effectiveCalendar) <= succStart
      case 'start-to-start':
        return ssAnchor(predStart, lag, effectiveCalendar) <= succStart
      case 'finish-to-finish':
        return ffAnchor(predDue, lag, effectiveCalendar) <= succDue
      case 'start-to-finish':
        return sfAnchor(predStart, lag, effectiveCalendar) <= succDue
    }
  }

  async function commitDrag (state: DragState, event?: PointerEvent | MouseEvent): Promise<void> {
    // Narrow to drag/resize states that carry a `target` field.
    if (
      state.kind !== 'dragging-body' &&
      state.kind !== 'dragging-unscheduled' &&
      state.kind !== 'resizing-left' &&
      state.kind !== 'resizing-right'
    ) {
      return
    }
    // Guard: an unscheduled-drag that never reached the canvas (e.g. the user
    // clicked the drag-grip and released without moving) must NOT silently
    // schedule the issue to "today".
    if (state.kind === 'dragging-unscheduled' && !state.hasCanvasTarget) return
    // Stale-mutation guard: pointer-up commits run async work before
    // persisting — a project switch in between must abort.
    if (!mutationStillCurrent(state.target.doc.space)) {
      activeDrag.set({ kind: 'idle' })
      return
    }
    const altKey = event?.altKey === true
    const client = getClient()

    // Milestone path — unchanged. The existing
    // `commitMilestoneDrag(state, target, ops)` signature
    // (line ~713: state: DragState, target: { kind: 'milestone', doc:
    // Milestone }, ops: ApplyOperations) handles dragging-body,
    // resizing-left and resizing-right; dragging-unscheduled is
    // unreachable for milestones.
    if (state.target.kind === 'milestone') {
      const ops = client.apply('gantt-drag')
      await commitMilestoneDrag(state, state.target, ops)
      // Commit-point guard: commitMilestoneDrag awaits ops.update() and a
      // client.findAll() — a switch during those suspensions must abort
      // before the batch is sent. Dropping an uncommitted apply-batch
      // needs no cleanup.
      if (!mutationStillCurrent(state.target.doc.space)) {
        activeDrag.set({ kind: 'idle' })
        return
      }
      const r = await ops.commit()
      if (!r.result) {
        const t = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(t, '', undefined as any, undefined, NotificationSeverity.Error)
      }
      // Legacy path manages its own preview lifecycle.
      activeDrag.set({ kind: 'idle' })
      return
    }

    // Issue dragging-unscheduled — no relations to cascade, keep the
    // single-update commit via commitIssueDrag.
    if (state.kind === 'dragging-unscheduled') {
      const ops = client.apply('gantt-drag')
      const doc = state.target.doc
      const before = { startDate: doc.startDate ?? null, dueDate: doc.dueDate ?? null }
      const after = { startDate: (state as any).previewStart as number, dueDate: (state as any).previewEnd as number }
      await commitIssueDrag(state, state.target, ops)
      // Commit-point guard: commitIssueDrag awaits ops.update()/findAll().
      if (!mutationStillCurrent(doc.space)) {
        activeDrag.set({ kind: 'idle' })
        return
      }
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

    // Bulk-Drag commit.
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
      // operation so downstream consumers ( notifications,
      // future undo-grouping work) can collapse them to a single entry.
      await commitWithCascade(primaryEdits, altKey, primaryEdits[0].issue.space, 'none', 'gantt-bulk-cascade')
      return
    }

    // Cascade-eligible issue states (dragging-body, resizing-*).
    // Parent-drag detection: check full space for children.
    if (state.kind === 'dragging-body' && state.target.kind === 'issue') {
      const parent = state.target.doc
      const allInSpace = await client.findAll(
        tracker.class.Issue,
        { space: parent.space },
        { projection: dragCommitProjection }
      )
      const isParent = allInSpace.some((i) => i.parents?.[0]?.parentId === parent._id)
      if (isParent) {
        const delta = (state as any).previewStart - (state as any).originStart
        const primaryEdits: PrimaryEdit[] = [
          {
            issue: parent,
            newStart: (state as any).previewStart,
            newDue: (state as any).previewEnd
          }
        ]
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
      const primaryEdits: PrimaryEdit[] = [
        {
          issue: target,
          newStart: (state as any).previewStart,
          newDue: (state as any).previewEnd
        }
      ]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmMove ? 'move' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
    if (state.kind === 'resizing-left') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [
        {
          issue: target,
          newStart: (state as any).previewStart,
          newDue: target.dueDate as number
        }
      ]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmResize ? 'resize' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
      return
    }
    if (state.kind === 'resizing-right') {
      const target = state.target.doc
      const primaryEdits: PrimaryEdit[] = [
        {
          issue: target,
          newStart: target.startDate as number,
          newDue: (state as any).previewEnd
        }
      ]
      const legacyConfirmKind: 'move' | 'resize' | 'none' = confirmResize ? 'resize' : 'none'
      await commitWithCascade(primaryEdits, altKey, target.space, legacyConfirmKind)
    }
  }

  // Stable void-returning wrapper so attach/detach share one reference (a
  // per-call arrow would leak the listener) while satisfying the void-listener
  // signature — the pointer-up commit is intentionally fire-and-forget with
  // its own internal error handling.
  const onWindowPointerUp = (e: PointerEvent | MouseEvent): void => {
    void handleCanvasPointerUp(e)
  }

  function attachWindowDragListeners (): void {
    window.addEventListener('pointermove', handleCanvasPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)
    window.addEventListener('mousemove', handleCanvasPointerMove)
    window.addEventListener('mouseup', onWindowPointerUp)
  }

  function detachWindowDragListeners (): void {
    window.removeEventListener('pointermove', handleCanvasPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerUp)
    window.removeEventListener('mousemove', handleCanvasPointerMove)
    window.removeEventListener('mouseup', onWindowPointerUp)
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
    // Ready-gate: dropping an unscheduled issue writes dates — blocked
    // until the calendar is initially loaded.
    if (!calendarMutable) return
    activeMutationTicket = calendarState.beginMutation()
    activeDrag.update((s) =>
      reduce(
        s,
        {
          type: 'mousedown-unscheduled',
          target: { kind: 'issue', doc: e.detail.issue },
          cursorX: e.detail.cursorX
        },
        timeScale
      )
    )
  }

  function handleRowContextMenu (e: CustomEvent<{ issue: { _id: string, _class: string }, event: MouseEvent }>): void {
    const found = issues.find((i) => String(i._id) === e.detail.issue._id)
    if (found === undefined) return
    openGanttMenu(e.detail.event, found)
  }

  // -------------------------------------------------------------------------
  // Keyboard: Tab cycles bars with dates, arrows shift focused bar by 1d
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
    // Ready-gate: keyboard shifts run the cascade scheduler — blocked until
    // the calendar is initially loaded.
    if (!calendarMutable) return
    if (focusedIssueId === null) return
    const i = scheduledIssues.find((it) => String(it._id) === focusedIssueId)
    if (i?.startDate == null || i.dueDate == null) return
    if (!editableIssueIds.has(focusedIssueId)) return
    // Capture the mutation ticket only once the preconditions have passed and
    // the mutation is actually about to begin — capturing before the early
    // returns would leave a dangling ticket when no mutation starts.
    activeMutationTicket = calendarState.beginMutation()
    const allInSpace = await getClient().findAll(
      tracker.class.Issue,
      { space: i.space },
      { projection: dragCommitProjection }
    )
    // Stale-mutation guard after the await — before any edit is built.
    if (!mutationStillCurrent(i.space)) return
    // All date arithmetic routes through addScheduleDays so the Phase-2
    // working-calendar swap stays a single integration point.
    const primaryEdits: PrimaryEdit[] = [
      {
        issue: i,
        newStart: addScheduleDays(i.startDate, days),
        newDue: addScheduleDays(i.dueDate, days)
      }
    ]
    // Include descendants (matches drag behaviour for parent shifts).
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
   * Central handler called from the toolbar buttons and the
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
      // D — add a hint sub-line explaining why this frame was
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
    // Cmd+Z / Ctrl+Z (Undo) and Cmd+Shift+Z / Ctrl+Shift+Z (Redo).
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
    // Don't hijack navigation keys while a text input inside the Gantt
    // root owns focus (inline cell edit, CreateIssue in a side panel, …) —
    // Tab/Arrows/+/- must reach the browser so the user can type and move the
    // caret normally.
    if (e.key === 'Tab') {
      if (isTextInputFocused()) return
      // Only trap Tab when a bar already has keyboard focus (escape-hatch).
      // With no focused bar we let the browser move focus naturally so
      // keyboard/AT users are never stuck inside the canvas (A11y).
      if (focusedIssueId === null) return
      moveFocus(e.shiftKey ? -1 : 1)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowRight') {
      if (isTextInputFocused()) return
      void shiftFocused(e.shiftKey ? 7 : 1)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowLeft') {
      if (isTextInputFocused()) return
      void shiftFocused(e.shiftKey ? -7 : -1)
      e.preventDefault()
      return
    }
    if (e.key === 'Escape' && $activeDrag.kind !== 'idle') {
      activeDrag.set({ kind: 'idle' })
      e.preventDefault()
      return
    }
    // Esc clears the multi-selection when no drag is in
    // flight. Sits AFTER the drag-cancel branch so the user's first Esc
    // press still cancels an in-flight drag; only
    // the next Esc clears the selection.
    if (e.key === 'Escape' && multiSelectedIssueIds.size > 0) {
      multiSelectedIssueIds = clearSelection()
      lastClickedIssueId = null
      e.preventDefault()
      return
    }
    // Cmd-A / Ctrl-A selects every visible scheduled
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
    // Zoom shortcuts. `+` / `=` zoom in, `-` zoom out. The same
    // key positions as the browser's native zoom but scoped to the Gantt.
    if (e.key === '+' || e.key === '=') {
      if (isTextInputFocused()) return
      cycleZoom(1)
      e.preventDefault()
      return
    }
    if (e.key === '-' || e.key === '_') {
      if (isTextInputFocused()) return
      cycleZoom(-1)
      e.preventDefault()
      return
    }
    // Bare-key shortcuts T/D/W/M/Q. Skip when an editable
    // target (input/textarea/contenteditable) owns focus so the user
    // can still type these letters in CreateIssue / inline cells.
    if (!isTextInputFocused() && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (e.key === 't' || e.key === 'T') {
        jumpToToday()
        e.preventDefault()
        return
      }
      if (e.key === 'd' || e.key === 'D') {
        setZoom('day')
        e.preventDefault()
        return
      }
      if (e.key === 'w' || e.key === 'W') {
        setZoom('week')
        e.preventDefault()
        return
      }
      if (e.key === 'm' || e.key === 'M') {
        setZoom('month')
        e.preventDefault()
        return
      }
      if (e.key === 'q' || e.key === 'Q') {
        setZoom('quarter')
        e.preventDefault()
        return
      }
    }
    // '?' or Shift+/ shows the keyboard help overlay.
    if (e.key === '?') {
      showPopup(GanttHelpPopup, {}, 'middle')
      e.preventDefault()
      return
    }
    // 'e' / 'E' exports the visible Gantt SVG to PNG.
    if (e.key === 'e' || e.key === 'E') {
      void exportToPng()
      e.preventDefault()
    }
    // E — Phase-3b Ctrl/Cmd+F toggle removed together with the
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

  // C — Ctrl+Wheel (Cmd+Wheel on Mac) over the scroller: continuous
  // zoom with cursor-anchored scroll. Without Ctrl we let the wheel pass
  // through to the native scroller (vertical scroll / shift-wheel
  // horizontal). All math lives in lib/zoom.ts for unit-testability.
  function onScrollerWheel (e: WheelEvent): void {
    if (!(e.ctrlKey || e.metaKey)) return
    // preventDefault FIRST (before any other early-return) so hitting
    // MIN_PPD / MAX_PPD limits or a missing hScrollEl never lets the
    // wheel-event fall through to the browser's page-zoom handler.
    e.preventDefault()
    // hScrollEl only exists when there is horizontal overflow. At low
    // pxPerDay (month=4, quarter=1.5) the chart usually fits in the
    // viewport without overflow, so hScrollEl is not rendered and the
    // wheel-zoom would early-return. Fall back to scrollerEl for the
    // cursor-anchor bounding box and skip the scrollLeft-anchor step
    // (with no overflow, there is nothing to scroll).
    const anchor = hScrollEl ?? scrollerEl
    if (anchor == null) return
    const rect = anchor.getBoundingClientRect()
    const cursorX = Math.max(0, e.clientX - rect.left)
    const oldPpd = effectivePxPerDay
    const oldScrollLeft = hScrollEl?.scrollLeft ?? 0
    // factor=undefined lets adaptiveWheelFactor pick a per-density value:
    // 0.012 for ppd<4 (month/quarter), 0.006 for ppd>=4 (week/day). Math is
    // already multiplicatively adaptive, but in the low-density bands the
    // absolute pixel-delta per notch is small enough that users perceive
    // the same exp() step as slower than at high density.
    const rawPpd = applyWheelZoom(oldPpd, e.deltaY)
    // Honour the dynamic zoom-out floor: bars must stay at least
    // BAR_COVERAGE_MIN of the viewport. Without this clamp the user can
    // wheel out into an empty void where the issues collapse to a tiny
    // island in the middle of the canvas.
    const newPpd = Math.max(rawPpd, dynamicMinPpd)
    if (newPpd === oldPpd) return
    userPxPerDay = newPpd
    if (hScrollEl != null) {
      const nextScroll = cursorAnchoredScrollLeft(cursorX, oldScrollLeft, oldPpd, newPpd)
      queueMicrotask(() => {
        if (hScrollEl == null) return
        hScrollEl.scrollLeft = nextScroll
        syncViewport()
      })
    }
  }

  // pinch-zoom on the canvas scroller. Wired via four
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
    const rawPpd = computePxPerDayFromRatio(pinchState.initialPxPerDay, ratio)
    // Same dynamic zoom-out floor as the wheel-zoom path.
    const newPpd = Math.max(rawPpd, dynamicMinPpd)
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
    const stamp = `gantt-${new Date().toISOString().slice(0, 10)}`
    try {
      await exportGanttDataToPng(
        {
          rows: sortedRows,
          relations: displayedRelations,
          summaryRanges,
          timeScale,
          range: [dateRange.from, dateRange.to],
          chartWidth: totalCanvasWidth,
          title: `${formatRange(dateRange.from)} – ${formatRange(dateRange.to)}`
        },
        stamp
      )
    } catch (err) {
      const title = await translate(tracker.string.GanttExportFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  async function exportToPdf (): Promise<void> {
    try {
      await exportGanttDataToPdf(
        {
          rows: sortedRows,
          relations: displayedRelations,
          summaryRanges,
          timeScale,
          range: [dateRange.from, dateRange.to],
          chartWidth: totalCanvasWidth,
          title: `${formatRange(dateRange.from)} – ${formatRange(dateRange.to)}`
        },
        `gantt-${new Date().toISOString().slice(0, 10)}`
      )
    } catch (err) {
      const title = await translate(tracker.string.GanttExportFailed, {}, undefined)
      addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
    }
  }

  // Fullscreen toggle. Standard browser Fullscreen API on
  // the containing element. If we fullscreened only .gantt-root the
  // toolbar would still be visible (since it lives inside .gantt-root)
  // and that's exactly what we want. Best-effort: silently ignore
  // failures (e.g. iframes without `allowfullscreen`).
  //
  // A — fullscreen target = document.body so that Huly popups
  // (Issue-Editor, QuickInfo, Confirm-Cascade, etc.) remain visible.
  // Showpopup mounts popups in the workbench `<Popup>` portal which
  // sits at workbench-container level; fullscreening only `containerEl`
  // would clip those popups (Fullscreen API only paints descendants of
  // the fullscreened element). Targeting `document.body` keeps the
  // gantt visually fullscreen AND keeps popup-portals inside the
  // rendered subtree. The toolbar/workbench chrome that briefly shows
  // is acceptable; the previous behaviour of "invisible popup forces
  // exit-fullscreen" was strictly worse for the user.
  function toggleFullscreen (): void {
    if (document.fullscreenElement != null) {
      void document.exitFullscreen().catch(() => {})
      return
    }
    const target = document.body
    if (target == null) return
    void target.requestFullscreen().catch(() => {})
  }

  // Mobile-Friendly Gantt. Recompute layoutMode on every
  // window resize. matchMedia would suffice, but resize covers
  // orientation-change on tablets too without listing every breakpoint
  // twice.
  function onWindowResize (): void {
    const next = detectLayoutMode(window.innerWidth)
    if (next !== layoutMode) {
      layoutMode = next
      // Close the drawer when leaving Phone — desktop/tablet doesn't have
      // one, leaving it "open" would be a stale flag.
      if (next !== 'phone') mobileDrawerOpen = false
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onWindowResize)
  })
  onDestroy(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', onWindowResize)
    // The critical-path recompute is debounced. If the view unmounts while a
    // pending recompute is queued, the timer would fire after our reactive
    // store handles were already torn down — cancelling prevents both the
    // dangling reactive write and the late notification banner.
    cpDirtyTimer.cancel()
  })

  // B — programmatic scroll helpers: after any scrollTo / scrollBy
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
  $: hThumbWidth = totalCanvasWidth > 0 ? Math.max(40, (hTrackWidth * hTrackWidth) / totalCanvasWidth) : hTrackWidth
  $: hThumbMax = Math.max(0, hTrackWidth - hThumbWidth)
  $: hScrollMax = Math.max(1, totalCanvasWidth - hTrackWidth)
  $: hThumbLeft = canvasViewportLeft <= 0 ? 0 : (canvasViewportLeft / hScrollMax) * hThumbMax
  $: hHasOverflow = totalCanvasWidth > hTrackWidth + 1

  // Custom vertical scrollbar thumb geometry (proxy for the existing
  // gantt-scroller native scrollTop — Huly globally hides native bars
  // so we render our own in DOM and let the native bar drive scrollTop).
  $: vTrackHeight = viewportHeight > 0 ? viewportHeight : 1
  $: vTotalHeight = ROW_HEIGHT * rows.length + HEADER_HEIGHT
  $: vThumbHeight = vTotalHeight > 0 ? Math.max(40, (vTrackHeight * vTrackHeight) / vTotalHeight) : vTrackHeight
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

  // Drag-resize the sidebar. In legacy mode the handle drives userSidebarWidth
  // directly. In extended-grid mode it instead scales every column-width
  // proportionally so the user can widen the whole sidebar even though each
  // column also carries its own width.
  let resizing = false
  let resizeStartX = 0
  let resizeStartWidth = 0
  let resizeStartColumnWidths: Record<string, number> = {}
  function onResizeStart (e: PointerEvent): void {
    e.stopPropagation()
    e.preventDefault()
    resizing = true
    resizeStartX = e.clientX
    resizeStartWidth = sidebarWidthPx
    if (extendedColumns) {
      resizeStartColumnWidths = { ...sidebarWidths }
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onResizeMove (e: PointerEvent): void {
    if (!resizing) return
    e.stopPropagation()
    const delta = e.clientX - resizeStartX
    if (extendedColumns) {
      // Scale every column width proportionally so the user can widen the
      // whole sidebar even though each column also carries its own width.
      // Clamp the total to MIN/MAX_SIDEBAR_WIDTH; per-column MIN/MAX is then
      // enforced by clampWidth on the next user-driven per-column resize.
      const target = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, resizeStartWidth + delta))
      const scale = target / resizeStartWidth
      const next: Record<string, number> = {}
      for (const k of Object.keys(resizeStartColumnWidths)) {
        next[k] = resizeStartColumnWidths[k] * scale
      }
      sidebarWidths = next
    } else {
      const next = resizeStartWidth + delta
      userSidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, next))
    }
  }
  function onResizeEnd (e: PointerEvent): void {
    if (!resizing) return
    e.stopPropagation()
    resizing = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    // Persist once at end-of-drag (same policy as the per-column handle):
    // the proportional rescale above touched every column width, so the
    // whole map has to go back into the ViewOptions or the sidebar snaps
    // back to the defaults on the next re-mount.
    if (extendedColumns) persistViewOption('ganttSidebarWidths', sidebarWidths)
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
      resizeObs = new ResizeObserver(() => {
        syncViewport()
      })
      if (scrollerEl != null) resizeObs.observe(scrollerEl)
      if (hScrollEl != null) resizeObs.observe(hScrollEl)
    }
  })
  onDestroy(() => {
    resizeObs?.disconnect()
    // cancel pending rAFs so a late-fire never targets a destroyed
    // component (would reactively read scrollerEl/hScrollEl after teardown).
    if (vScrollRaf !== null) {
      cancelAnimationFrame(vScrollRaf)
      vScrollRaf = null
    }
    if (hScrollRaf !== null) {
      cancelAnimationFrame(hScrollRaf)
      hScrollRaf = null
    }
  })

  $: viewport = { left: canvasViewportLeft, right: canvasViewportLeft + canvasViewportWidth }
  //  fix — when the extended sidebar grid is on, the per-column resize
  // handles in the header drive width directly, so the outer sidebar-cell
  // must size to the columns sum (not the legacy slider value). Otherwise
  // the extended grid overflows the outer grid column horizontally and
  // either clips or paints over the canvas. The legacy slider remains the
  // source of truth when the extended grid is off.
  $: sidebarWidthPx = extendedColumns
    ? computeTotalWidth(sidebarColumns, sidebarWidths)
    : showIssueCode || showTitle || showStatus
      ? userSidebarWidth
      : 60

  // Sidebar column state. The default set (identifier + title + predecessors +
  // slack) is always rendered; each ganttSidebarShow* toggle appends the
  // corresponding column. Width + sort state are persisted as ViewOptions —
  // see `sidebarWidths` / `sidebarSort` further up.
  $: sidebarColumns = (() => {
    // Assemble against the full default set first: every optional column
    // anchors on `predecessors`, so dropping that anchor before the inserts
    // would push the whole group behind `slack` instead of in front of it.
    const cols: SidebarColumnKey[] = [...DEFAULT_COLUMNS]
    const insertBefore = (col: SidebarColumnKey, before: SidebarColumnKey) => {
      const idx = cols.indexOf(before)
      if (idx >= 0) cols.splice(idx, 0, col)
      else cols.push(col)
    }
    // Order matches the natural reading order on a Gantt sidebar.
    if (ganttSidebarShowStatus) insertBefore('status', 'predecessors')
    if (ganttSidebarShowPriority) insertBefore('priority', 'predecessors')
    if (ganttSidebarShowAssignee) insertBefore('assignee', 'predecessors')
    if (ganttSidebarShowEstimation) insertBefore('estimation', 'predecessors')
    if (ganttSidebarShowStartDate) insertBefore('startDate', 'predecessors')
    if (ganttSidebarShowDueDate) insertBefore('dueDate', 'predecessors')
    if (ganttSidebarShowDeadline) insertBefore('deadline', 'predecessors')
    if (ganttSidebarShowProgress) insertBefore('progress', 'predecessors')
    // `predecessors` and `slack` ship in DEFAULT_COLUMNS, so both have to be
    // filtered out again when their view option is off — otherwise the
    // extended grid keeps rendering a column the user switched off, while the
    // compact path (`{#if showPredecessors}` / `{#if showSlackColumn}` in
    // GanttSidebar) honours it. Both paths now hang each column on its own
    // toggle alone; only the CP badge inside the slack cell stays gated on
    // `showCriticalPath`, in both paths.
    return cols.filter((c) => (c !== 'slack' || showSlackColumn) && (c !== 'predecessors' || showPredecessors))
  })()
  function onSidebarSort (evt: CustomEvent<{ column: SidebarColumnKey }>): void {
    const next = cycleSort(sidebarSort, evt.detail.column)
    sidebarSort = next
    persistViewOption('ganttSidebarSort', next)
  }

  function onSidebarWidthChange (evt: CustomEvent<{ column: SidebarColumnKey, width: number, commit: boolean }>): void {
    const next = { ...sidebarWidths, [evt.detail.column]: clampWidth(evt.detail.width) }
    sidebarWidths = next
    // Only write on `commit` (end-of-drag). Persisting every pointermove
    // would hammer localStorage and bounce the ViewOptions store — and with
    // it this component's `viewOptions` prop — on every frame of the drag.
    if (evt.detail.commit) persistViewOption('ganttSidebarWidths', next)
  }

  /**
   * Sort has to live as a post-flatten pass to preserve the legacy
   * `buildLayout` API.  moved the sort into `buildLayout` itself
   * (`withinLevelCompare`), so it now respects the hierarchy: siblings sort,
   * tree-structure preserved — sorting happens within a hierarchy level, it
   * never re-parents or flattens rows.
   *
   * `sortedRows` stays as an identity pass-through so the diff against
   * downstream consumers (canvas, dependency layer, virtualization slice)
   * remains minimal. When group-by is active, the within-group-compare in
   * `buildGroupedRows` already covers that path.
   */
  $: sortedRows = rows

  // Bulk-Select. Two derived stores feed downstream:
  //   • `multiSelectedIdStrings` — what GanttCanvas / GanttBar consume as
  //     a Set<string>. Decoupled from the `Ref<Issue>`-typed master set
  //     so the canvas's stringified row keys can do O(1) lookups without
  //     casting.
  //   • `orderedSelectableIds` — visible-row order of issues, used by
  //     Cmd-A / Shift-range. Filters out group-header / milestone rows
  //     and unscheduled issues — Cmd-A is scoped to "visible
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

  // Toolbar-portal bridge. GanttView keeps owning every piece of toolbar
  // state and every handler; the snapshot below carries them out to
  // GanttToolbarBar (mounted in IssuesView's SpaceHeader row 2 slots), so
  // the user sees a single unified row instead of a separate gantt-toolbar
  // strip. Reactive deps below cover every primitive the bar reads; the
  // handler refs are stable so re-setting them is cheap. The store is
  // cleared in onDestroy so a non-Gantt viewlet doesn't render stale
  // controls if the user switches view mode without unmounting IssuesView.
  $: ganttToolbarSnapshot.set({
    layoutMode,
    mobileDrawerOpen,
    toggleMobileDrawer: () => {
      mobileDrawerOpen = !mobileDrawerOpen
    },
    datePickerValue,
    setDatePickerValue: (v) => {
      datePickerValue = v
    },
    jumpToStart,
    pageScrollPrev: () => {
      pageScroll(-1)
    },
    jumpToToday,
    pageScrollNext: () => {
      pageScroll(1)
    },
    jumpToEnd,
    jumpToDate,
    zoomDropdownItems,
    zoomDropdownSelection,
    onZoomDropdownSelected,
    visibleDays,
    visibleDaysInput,
    setVisibleDaysInput: (n) => {
      visibleDaysInput = n
    },
    applyVisibleDaysInput,
    onVisibleDaysKeyDown,
    canUndo: $canUndo,
    canRedo: $canRedo,
    nextUndoDescription: $nextUndoDescription,
    nextRedoDescription: $nextRedoDescription,
    handleUndo: () => {
      void handleUndo()
    },
    handleRedo: () => {
      void handleRedo()
    },
    ganttGroupBy,
    onGroupBySelectChange,
    savedViewModified,
    savedViewName: $selectedFilterStore?.name ?? '',
    onUpdateSavedViewClick,
    toggleFullscreen,
    openMoreActionsMenu,
    ariaLabels,
    ganttBarColorBy: $ganttBarColorBy,
    onColorBySelectChange: (ev: Event) => {
      const v = (ev.target as HTMLSelectElement).value as BarColorMode
      ganttBarColorBy.set(v)
      // Persist so the choice survives a viewlet re-mount / route change.
      // The write echoes back through the ViewOptions store into the
      // reactive block that seeds this store — same value, so no flicker.
      persistViewOption('ganttBarColorBy', v)
    }
  })
  onDestroy(() => {
    ganttToolbarSnapshot.set(null)
  })
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="gantt-root" tabindex="0" bind:this={containerEl} on:click={onBackgroundClick}>
  {#if loading}
    <Loading />
  {:else}
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
             date-range navigation strip on the bottom half ().
              — in extended-grid mode the legacy compact labels are
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
            <!-- Tree-collapse / -expand. Always visible (was: only when groupBy=none).
                 Disabled when swimlanes are active (no rows to act on); tooltip
                 explains the no-op. -->
            <button
              type="button"
              class="corner-tree-btn"
              class:tree-btn-disabled={ganttGroupBy !== 'none'}
              use:tooltip={{
                label:
                  ganttGroupBy === 'none' ? tracker.string.GanttCollapseAll : tracker.string.GanttCornerNoOpInSwimlane
              }}
              aria-label={ariaLabelOf(tracker.string.GanttCollapseAll)}
              on:click={() => {
                if (ganttGroupBy === 'none') collapseAllTree()
              }}
            >
              <Icon icon={IconChevronRight} size="small" />
            </button>
            <button
              type="button"
              class="corner-tree-btn"
              class:tree-btn-disabled={ganttGroupBy !== 'none'}
              use:tooltip={{
                label:
                  ganttGroupBy === 'none' ? tracker.string.GanttExpandAll : tracker.string.GanttCornerNoOpInSwimlane
              }}
              aria-label={ariaLabelOf(tracker.string.GanttExpandAll)}
              on:click={() => {
                if (ganttGroupBy === 'none') expandAllTree()
              }}
            >
              <Icon icon={IconChevronDown} size="small" />
            </button>
          </div>
        </div>
        <div class="cell resize-corner" style="height: {HEADER_HEIGHT}px;" />
        <div class="cell header-cell" style="height: {HEADER_HEIGHT}px;">
          <div
            class="hscroll-inner"
            style="width: {totalCanvasWidth}px; transform: translateX(-{canvasViewportLeft}px);"
          >
            <GanttHeader
              {timeScale}
              {viewport}
              totalWidth={totalCanvasWidth}
              dataWidth={dataCanvasWidth}
              height={HEADER_HEIGHT}
            />
          </div>
        </div>
        <!-- Row 2: sidebar (sticky-left) / resize handle (sticky-left) / canvas -->
        <!-- Mobile-Friendly Gantt. On Phone the cell is
             absolutely positioned and slides in via .drawer-open. On
             Tablet/Desktop the class is inert. -->
        <div class="cell sidebar-cell" class:drawer-open={mobileDrawerOpen}>
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
            dateMutable={calendarMutable}
            relations={displayedRelations}
            {showPredecessors}
            {issueIdentifiers}
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
          <div
            class="hscroll-inner"
            style="width: {totalCanvasWidth}px; transform: translateX(-{canvasViewportLeft}px);"
          >
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
              editableIssueIds={phoneReadOnly ? new Set() : editableIssueIds}
              dateMutable={calendarMutable}
              {layoutMode}
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
              workingDaysConfig={effectiveCalendar}
              {barLabelLeft}
              {barLabelInside}
              {barLabelRight}
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
        <!-- Mobile-Friendly Gantt. Backdrop overlay
             closes the drawer on tap. Rendered inside .gantt-grid so it
             paints above the canvas-cell but below the absolute-
             positioned .sidebar-cell.drawer-open (which has z-index 30).
             a11y-no-static-element-interactions is acceptable here — the
             backdrop is purely a tap-to-dismiss affordance; the
             hamburger button below is the keyboard-accessible toggle. -->
        {#if layoutMode === 'phone' && mobileDrawerOpen}
          <!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
          <div
            class="mobile-drawer-backdrop"
            on:click={() => {
              mobileDrawerOpen = false
            }}
          />
        {/if}
      </div>
    </div>
    <!-- Custom vertical scrollbar — DOM thumb absolutely positioned at
         the right edge of gantt-root so Huly's globally-hidden native
         bar doesn't deny the user a visible scroll affordance. -->
    {#if vHasOverflow}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="gantt-vscrollbar" style="top: {toolbarHeightPx}px; bottom: 11px;">
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
      <div class="gantt-hscrollbar" style="padding-left: {sidebarWidthPx + 5}px;">
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
      <div class="hover-tooltip" style="left: {tooltipState.x + 14}px; top: {tooltipState.y + 14}px;">
        {#if row.kind === 'milestone' && ms !== null}
          <div class="tt-head">◆ <Label label={tracker.string.Milestone} /></div>
          <div class="tt-title">{ms.label}</div>
          {#if ms.startDate !== null}
            <div class="tt-line">
              <Label label={tracker.string.StartDate} />: {new Date(ms.startDate).toISOString().slice(0, 10)}
            </div>
          {/if}
          <div class="tt-line">
            <Label label={tracker.string.TargetDate} />: {new Date(ms.targetDate).toISOString().slice(0, 10)}
          </div>
        {:else if issue !== null}
          {@const code = issueCode(issue)}
          <div class="tt-head">{code}</div>
          <div class="tt-title">{issue.title}</div>
          {#if issue.startDate !== null}
            <div class="tt-line">
              <Label label={tracker.string.StartDate} />: {new Date(issue.startDate).toISOString().slice(0, 10)}
            </div>
          {/if}
          {#if issue.dueDate !== null}
            <div class="tt-line">
              <Label label={tracker.string.DueDate} />: {new Date(issue.dueDate).toISOString().slice(0, 10)}
            </div>
          {/if}
          {#if issue.startDate !== null && issue.dueDate !== null}
            {@const days =
              Math.round(
                (Math.max(issue.dueDate, issue.startDate) - Math.min(issue.dueDate, issue.startDate)) / 86_400_000
              ) + 1}
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
  .toolbar-left {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
  .toolbar-center {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    justify-self: center;
    align-items: center;
  }
  .toolbar-right {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-self: end;
    position: relative;
    align-items: center;
  }
  /* Toolbar overflow on small screens. Below 1024px the
     fixed 3-column grid (1fr / auto / 1fr) gets cramped: zoom-buttons get
     clipped or undo/redo/saved-views/group-by/PNG/PDF/fullscreen overflow
     past the right edge. We collapse the grid into a single column and
     let each cluster (left / center / right) wrap inside itself.
     Phone (<=640px) keeps the existing mobile drawer + hamburger flow
     untouched — no behaviour change there. */
  @media (max-width: 1024px) {
    .gantt-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      padding: 4px 8px;
    }
    /*  fix — clusters stay nowrap so the wrap-points are BETWEEN
       clusters, not WITHIN them. Previously each cluster wrapped its
       own items independently which produced items "floating" mid-row
       between two visual rows. Now each
       cluster stays as a single horizontal block and the toolbar wraps
       only when a full cluster cannot fit on the current line. */
    .toolbar-left,
    .toolbar-center,
    .toolbar-right {
      justify-self: start;
      flex: 0 1 auto;
      flex-wrap: nowrap;
    }
    /* Hamburger + fullscreen must stay flush right even when the
       toolbar wraps onto several lines. `margin-left: auto` pushes
       .toolbar-right to the end of whichever flex line it currently
       sits on. */
    .toolbar-right {
      margin-left: auto;
    }
  }
  /* E — Group-By controls. The Filter-related `.gantt-filter-*`
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
  .gantt-toolbar-icon-btn:hover:not(:disabled) {
    background: var(--theme-button-hovered);
  }
  .gantt-toolbar-icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  /* The old `.gantt-tree-glyph` rule rendered the
     ▶▶ / ▼▼ double-caret text glyphs and was retired together with
     them; expand-/collapse-all now use the standard ChevronRight /
     ChevronDown icons. */
  /* Toolbar row 2 — text-only glyph for PNG/PDF/Fullscreen buttons.
     Keeps the export controls webpack-safe (no Icon imports needed). */
  .gantt-toolbar-text-glyph {
    font-size: 10px;
    line-height: 1;
    font-weight: 600;
    color: var(--theme-content-color);
    pointer-events: none;
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
  // Saved Gantt-Views toolbar widget. Mirrors gantt-groupby-wrap.
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
  /*  / Refactor D — inline saved-view name shown only when a
     view is currently applied AND has unsaved changes. The legacy
     `.gantt-savedview-select` styles were dropped together with the
     toolbar's <select>-element dropdown. */
  .gantt-savedview-name {
    font-size: 12px;
    color: var(--theme-content-color);
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  /* `.zoom-btn` style block removed alongside the 4 preset
     buttons that previously lived in `.toolbar-center`. The zoom-cluster
     is now a Dropdown + numeric days-input; see `.zoom-days-input` below. */
  .zoom-days-input {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    border-radius: 4px;
  }
  .zoom-days-input :global(.antiEditBoxInput) {
    width: 3rem;
    max-width: 3rem;
    text-align: right;
    background: transparent;
    color: var(--theme-content-color);
  }
  .zoom-days-suffix {
    color: var(--theme-content-color);
    opacity: 0.7;
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
  .header-cell,
  .canvas-cell {
    overflow: hidden;
  }
  .hscroll-inner {
    will-change: transform;
  }
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
  }
  .hscroll-track-custom {
    width: 100%;
    height: 100%;
    overflow-x: scroll;
    overflow-y: hidden;
    scrollbar-width: none; /* Firefox: hide native */
  }
  .hscroll-track-custom::-webkit-scrollbar {
    display: none;
  } /* WebKit: hide */
  .hscroll-spacer {
    height: 1px;
  }
  .hscroll-thumb {
    position: absolute;
    top: 1px;
    bottom: 1px;
    background: var(--theme-content-color, #4b5563);
    opacity: 0.45;
    border-radius: 4px;
    cursor: grab;
    pointer-events: auto;
    transition:
      opacity 100ms ease,
      background 100ms ease;
  }
  .hscroll-thumb:hover {
    opacity: 0.85;
    background: var(--theme-state-info-color, #6366f1);
  }
  .hscroll-thumb:active {
    cursor: grabbing;
    opacity: 1;
    background: var(--theme-state-info-color, #6366f1);
  }
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
    transition:
      opacity 100ms ease,
      background 100ms ease;
  }
  .vscroll-thumb:hover {
    opacity: 0.85;
    background: var(--theme-state-info-color, #6366f1);
  }
  .vscroll-thumb:active {
    cursor: grabbing;
    opacity: 1;
    background: var(--theme-state-info-color, #6366f1);
  }
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
  /* In extended-grid mode the corner hosts the GanttSidebar
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
    /* Left-align the tree-toggle buttons; the original `justify-content:
       center` made sense when the corner also held « » date-nav buttons,
       but those were dropped in the corner-range refactor so the
       remaining collapse/expand-all buttons should stay at the start. */
    justify-content: flex-start;
    gap: 8px;
    padding: 2px 8px 4px;
    font-size: 12px;
    color: var(--theme-content-color);
  }
  /* sidebar tree-toggle buttons. ChevronRight/Down icons match the inline row toggles.
     min hit area bumped to 32px on phones via the existing breakpoint media query. */
  .corner-tree-btn {
    width: 24px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--theme-divider-color);
    background: transparent;
    color: var(--theme-darker-color);
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .corner-tree-btn:hover {
    background: var(--theme-button-hovered);
    color: var(--theme-content-color);
  }
  .corner-tree-btn.tree-btn-disabled {
    opacity: 0.4;
    cursor: default;
  }
  .corner-tree-btn.tree-btn-disabled:hover {
    background: transparent;
  }
  .corner .col-toggle {
    flex: 0 0 18px;
  }
  .corner .col-status {
    flex: 0 0 22px;
  }
  .corner .col-id {
    flex: 0 0 80px;
  }
  .corner .col-title {
    flex: 1 1 auto;
  }
  .corner .col-jump {
    flex: 0 0 28px;
  }
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
    /* Clip the extended sidebar grid to the cell so a stale
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
  .resize-cell:hover,
  .resize-cell.active {
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

  /*
   * Mobile-Friendly Gantt.
   *
   * Phone layout (≤640 px): the sidebar grid column collapses to 0
   * (hidden), the hamburger button toggles a slide-out drawer that
   * overlays the canvas. Tablet (641–1024 px) keeps the legacy grid
   * but bumps hit-targets to a touch-friendly 44×44 px.
   */
  .mobile-hamburger {
    .hamburger-glyph {
      font-size: 22px;
      line-height: 1;
      font-weight: 600;
    }
  }
  /* Phone — overlay drawer. A dedicated slide-out drawer
     (translateX(-100%) → translateX(0) with transition, dimmed backdrop,
     hamburger toggle, auto-close on row select). Phone hit-targets are
     bumped to 44px (matching the tablet rule) so finger-tap reliability
     matches the iOS/Android HIG recommendations. */
  @media (max-width: 640px) {
    .nav-btn,
    .gantt-toolbar-icon-btn {
      min-width: 44px;
      min-height: 44px;
    }
    /* The sidebar-cell is positioned absolutely so it can slide over
       the canvas without re-flowing the grid. When .drawer-closed it
       sits off-screen at translateX(-100%); .drawer-open slides it in.
       The resize-cell is hidden because finger-resize of a drawer is
       fiddly and the column-width matters less when the drawer covers
       the whole viewport anyway. */
    .gantt-grid {
      grid-template-columns: 0 0 1fr !important;
    }
    .cell.sidebar-cell {
      position: absolute;
      top: 56px; /* HEADER_HEIGHT — keep in sync with const in GanttView.svelte */
      left: 0;
      width: min(320px, 85vw);
      height: calc(100% - 56px);
      z-index: 30;
      background: var(--theme-bg-color);
      border-right: 1px solid var(--theme-divider-color);
      box-shadow: 4px 0 12px rgba(0, 0, 0, 0.18);
      transition:
        transform 200ms ease,
        visibility 200ms ease;
      transform: translateX(-100%);
      overflow-y: auto;
      /* A closed drawer is parked off-screen. `transform` alone leaves its
         rows in the accessibility tree and in the Tab order, so a keyboard or
         screen-reader user walked through a sidebar sitting at x = -243 with
         nothing visible on screen. `visibility: hidden` takes the whole
         subtree out of both while keeping the slide-in transition intact
         (visibility is animatable in the discrete sense: it flips at the end
         of the transition when hiding, immediately when showing). */
      visibility: hidden;
    }
    .cell.sidebar-cell.drawer-open {
      transform: translateX(0);
      visibility: visible;
    }
    .cell.resize-cell,
    .cell.resize-corner {
      display: none;
    }
    /* Backdrop covers the canvas when the drawer is open so a tap on the
       backdrop closes the drawer (standard slide-out-menu pattern). */
    .mobile-drawer-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      z-index: 20;
    }
  }
  /* Tablet 641-1024px: NO hit-target bump — user reported in  that
     this rule inflated buttons whenever the desktop window was resized
     below 1024px. Phone (≤640px) keeps the 44px rule above because Phone
     is touch-only by spec. Tablet-touch users get the same 26px buttons
     as desktop; long-press on the bars still works because layoutMode
     switches to 'tablet' regardless of CSS hit-target size. */
</style>
