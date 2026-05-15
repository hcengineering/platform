<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import type { Issue, IssueRelation, Milestone } from '@hcengineering/tracker'
  import { formatPredecessors } from './lib/predecessor-format'
  import { Icon, IconChevronDown, IconChevronRight, Label, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import type { DragState, LayoutRow } from './lib/types'
  import type { TimeScale } from './lib/time-scale'
  import IssuePresenter from '../issues/IssuePresenter.svelte'
  import StatusBadge from './StatusBadge.svelte'
  import GanttSidebarHeaderCell from './GanttSidebarHeaderCell.svelte'
  import GanttSidebarColumn from './GanttSidebarColumn.svelte'
  import { activeDragTargetId } from './lib/drag-state'
  import {
    DEFAULT_COLUMNS,
    DEFAULT_WIDTHS,
    type SidebarColumnKey
  } from './lib/sidebar-columns'
  import type { GanttSortState, SortDirection } from './lib/sidebar-sort'
  import { computeYViewport, sliceVisibleRows } from './lib/y-viewport'

  export let rows: LayoutRow[]
  export let width: number = 280
  export let timeScale: TimeScale | undefined = undefined
  export let viewportLeft: number = 0
  export let viewportRight: number = 0
  export let showIssueCode: boolean = false
  export let showTitle: boolean = true
  export let showStatus: boolean = true
  export let hoveredRowId: string | null = null
  export let activeDrag: Writable<DragState> = writable({ kind: 'idle' })
  export let relations: IssueRelation[] = []
  export let showPredecessors: boolean = false
  // PR5: slack column (numeric days) + CP badge
  export let slack: Map<Ref<Issue>, number> = new Map()
  export let criticalSet: Set<Ref<Issue>> = new Set()
  export let showCriticalPath: boolean = false
  export let showSlackColumn: boolean = false
  // Phase 3a — extended grid mode. When true, render a sortable header row
  // and per-column cells via GanttSidebarColumn. When false, the legacy
  // render path (compact 4-column layout) is preserved bit-for-bit so
  // existing users see no visual surface change on upgrade.
  export let extendedColumns: boolean = false
  export let columns: readonly SidebarColumnKey[] = DEFAULT_COLUMNS
  export let widths: Record<string, number> = { ...DEFAULT_WIDTHS }
  export let sort: GanttSortState = { column: null, direction: 'asc' }
  /**
   * v121.2 fix — when true, render ONLY the extended grid header row (no
   * body, no add-issue row). GanttView mounts this variant inside the
   * sticky corner cell so the column headings stay pinned above the
   * body and the user can sort/resize from the same row. Only meaningful
   * when {@link extendedColumns} is also true.
   */
  export let headerOnly: boolean = false
  // Tier-3 Item 5 — Y-axis virtualization. When all three are set, only rows
  // intersecting the [scrollTop, scrollTop+viewportHeight] band are rendered,
  // with absolute-positioning so the DOM aligns with the canvas bars at the
  // same y. When any is omitted (e.g. fixtures/tests), the legacy render
  // path renders every row in document order — bit-for-bit compatible with
  // prior phases.
  export let scrollTop: number = 0
  export let viewportHeight: number = 0
  export let rowHeight: number = 0
  /** Extra rows rendered above + below the visible band. Default 5 (spec §4). */
  export let overscan: number = 5

  /** Set of columns that have a meaningful comparator — others are non-sortable. */
  const SORTABLE_COLUMNS: ReadonlySet<SidebarColumnKey> = new Set<SidebarColumnKey>([
    'title', 'identifier', 'estimation', 'priority', 'modifiedOn', 'createdOn',
    'startDate', 'dueDate', 'deadline'
  ])

  const COLUMN_LABELS: Record<SidebarColumnKey, IntlString> = {
    identifier: tracker.string.GanttSidebarColIdentifier,
    title: tracker.string.GanttSidebarColTitle,
    status: tracker.string.GanttSidebarColStatus,
    priority: tracker.string.GanttSidebarColPriority,
    assignee: tracker.string.GanttSidebarColAssignee,
    estimation: tracker.string.GanttSidebarColEstimation,
    component: tracker.string.GanttSidebarColComponent,
    milestone: tracker.string.GanttSidebarColMilestone,
    predecessors: tracker.string.GanttSidebarColPredecessors,
    slack: tracker.string.GanttSidebarColSlack,
    startDate: tracker.string.GanttSidebarColStartDate,
    dueDate: tracker.string.GanttSidebarColDueDate,
    deadline: tracker.string.GanttSidebarColDeadline,
    progress: tracker.string.GanttSidebarColProgress,
    modifiedOn: tracker.string.GanttSidebarColModifiedOn,
    createdOn: tracker.string.GanttSidebarColCreatedOn
  }

  /** Total width of all visible columns — used as the explicit grid width. */
  $: gridWidthPx = columns.reduce((sum, c) => sum + (widths[c] ?? DEFAULT_WIDTHS[c]), 0)

  function sortDirOf (col: SidebarColumnKey): SortDirection | null {
    return sort.column === col ? sort.direction : null
  }

  const DAY_MS_SIDEBAR = 86_400_000

  function slackDaysFor (rowIssueId: string | undefined): number {
    if (rowIssueId === undefined) return 0
    const ms = slack.get(rowIssueId as Ref<Issue>) ?? 0
    return Math.round(ms / DAY_MS_SIDEBAR)
  }

  function isCriticalRow (rowIssueId: string | undefined): boolean {
    return rowIssueId !== undefined && criticalSet.has(rowIssueId as Ref<Issue>)
  }

  $: dragState = $activeDrag
  $: activeIssueIdStr = activeDragTargetId(dragState)
  $: anyDragActive = dragState.kind !== 'idle' && dragState.kind !== 'hover-bar'

  // Tier-3 Item 5 — virtualization is "on" when the parent wires the three
  // viewport props. Off → render every row (legacy path, preserved for
  // tests / embed previews).
  $: virtualizationOn = rowHeight > 0 && viewportHeight > 0
  // When the parent applies a sort that re-orders the `rows` array, each
  // row's `.y` field (set by `buildLayout` on the un-sorted ordering) no
  // longer matches the sorted position. Re-stamp `y = index × rowHeight`
  // so the absolute-positioned rows visually appear in the order they're
  // passed in. This is identical to buildLayout's own y assignment for
  // uniform-height rows, just keyed on the current (post-sort) index.
  $: indexedRows = virtualizationOn
    ? rows.map((r, i) => ({ row: r, vy: i * rowHeight }))
    : rows.map((r) => ({ row: r, vy: r.y }))
  // Total scrollable height — rowCount × rowHeight, matching the canvas.
  $: totalRowsHeight = rows.length * (rowHeight > 0 ? rowHeight : 0) || (rows.length > 0 ? rows[rows.length - 1].y + rows[rows.length - 1].height : 0)
  $: yViewport = virtualizationOn
    ? computeYViewport({
        rowCount: rows.length,
        rowHeight,
        scrollTop,
        viewportHeight,
        overscan
      })
    : null
  // Slice on the re-stamped vy (so post-sort order matters) and project the
  // result back to `{ row, vy }` pairs the template iterates over.
  $: visibleIndexed = (virtualizationOn && yViewport !== null)
    ? indexedRows.filter((p) => {
        return p.vy + (p.row.height ?? rowHeight) > scrollTop - overscan * rowHeight &&
          p.vy < scrollTop + viewportHeight + overscan * rowHeight
      })
    : indexedRows
  // When virtualizing, render the slice anchored to its re-stamped vy; the
  // wrapper carries an explicit height so the scroller's scrollHeight
  // matches the unvirtualized layout. The add-issue-row sits BELOW the
  // spacer so it always renders at the bottom of the list.
  $: spacerHeight = virtualizationOn ? totalRowsHeight : 0

  const dispatch = createEventDispatcher<{
    jump: { x: number }
    toggle: { id: string }
    openIssue: { issue: { _id: string, _class: string } }
    openMilestone: { milestoneId: Ref<Milestone> }
    hoverRow: { id: string | null, row?: LayoutRow, mouseX?: number, mouseY?: number }
    addIssue: undefined
    rowContextMenu: { issue: { _id: string, _class: string }, event: MouseEvent }
    rowDragStart: { issue: Issue, cursorX: number }
    sortChange: { column: SidebarColumnKey }
    widthChange: { column: SidebarColumnKey, width: number, commit: boolean }
  }>()

  function handleSort (evt: CustomEvent<{ column: SidebarColumnKey }>): void {
    dispatch('sortChange', { column: evt.detail.column })
  }

  function handleResizePreview (evt: CustomEvent<{ column: SidebarColumnKey, width: number }>): void {
    dispatch('widthChange', { column: evt.detail.column, width: evt.detail.width, commit: false })
  }

  function handleResizeCommit (evt: CustomEvent<{ column: SidebarColumnKey, width: number }>): void {
    dispatch('widthChange', { column: evt.detail.column, width: evt.detail.width, commit: true })
  }

  function openIssue (issue: { _id: any, _class: any }): void {
    dispatch('openIssue', { issue: { _id: issue._id as string, _class: issue._class as string } })
  }

  function openMilestone (milestoneId: Ref<Milestone>): void {
    dispatch('openMilestone', { milestoneId })
  }

  function onDragGripDown (issue: Issue): (evt: MouseEvent) => void {
    return (evt: MouseEvent): void => {
      dispatch('rowDragStart', { issue, cursorX: evt.clientX })
    }
  }

  /**
   * Tier-4 Item 12 — Tree-View — produce a tooltip-options object only when
   * the row is a filter breadcrumb (parent of a matching child). Returning a
   * typed `null` (instead of an inline `... ? {} : undefined` ternary) keeps
   * svelte-check from flattening the surrounding event handlers' parameter
   * types to `any`.
   */
  function breadcrumbTooltip (row: LayoutRow): { label: IntlString } | undefined {
    if (row.isBreadcrumb !== true) return undefined
    return { label: tracker.string.GanttTreeBreadcrumb }
  }

  function onRowContextMenu (evt: MouseEvent, row: LayoutRow): void {
    if (row.issue === null) return
    evt.preventDefault()
    evt.stopPropagation()
    dispatch('rowContextMenu', {
      issue: { _id: String(row.issue._id), _class: String(row.issue._class) },
      event: evt
    })
  }

  function jumpDirection (
    obj: { startDate: number | null, dueDate: number | null }
  ): 'left' | 'right' | null {
    if (timeScale === undefined) return null
    if (viewportRight <= viewportLeft) return null
    if (obj.startDate == null && obj.dueDate == null) return null
    const startX = obj.startDate != null ? timeScale.toX(obj.startDate) : null
    const dueX = obj.dueDate != null ? timeScale.toX(obj.dueDate) : null
    const minX = Math.min(startX ?? Infinity, dueX ?? Infinity)
    const maxX = Math.max(startX ?? -Infinity, dueX ?? -Infinity)
    if (maxX < viewportLeft) return 'left'
    if (minX > viewportRight) return 'right'
    return null
  }

  function rowJumpTarget (
    row: LayoutRow
  ): { startDate: number | null, dueDate: number | null } | null {
    if (row.kind === 'issue' && row.issue !== null) {
      return { startDate: row.issue.startDate, dueDate: row.issue.dueDate }
    }
    if (row.kind === 'milestone' && row.milestone !== null) {
      return { startDate: row.milestone.startDate, dueDate: row.milestone.targetDate }
    }
    return null
  }

  function rowJumpX (row: LayoutRow): number | null {
    if (timeScale === undefined) return null
    const tgt = rowJumpTarget(row)
    if (tgt === null) return null
    const start = tgt.startDate ?? tgt.dueDate
    if (start === null) return null
    return timeScale.toX(start)
  }

  /**
   * Issue identifiers in Huly look like "OSTRO-12". The predecessor column
   * strips the project prefix so the notation stays compact, matching
   * MS Project / Asana conventions. Lookup is against the visible `rows`
   * (passed in as a prop) — predecessors that aren't in the current view
   * still get rendered, but with the numeric suffix only.
   */
  function issueNumberOf (ref: Ref<Issue>): string {
    for (const r of rows) {
      if (r.issue !== null && r.issue._id === ref) {
        const ident = (r.issue as unknown as { identifier?: string }).identifier ?? ''
        return ident.replace(/^[A-Z]+-/, '')
      }
    }
    return ''
  }
</script>

{#if extendedColumns && headerOnly}
  <!-- v121.2 — corner-only header variant. Renders the sortable/resizable
       column header inside the GanttView corner cell so the headings are
       always visible (sticky-top) instead of scrolling away with the body. -->
  <div class="sidebar-grid header-only" style="width: {gridWidthPx}px;">
    <div class="sidebar-grid-header" role="row">
      {#each columns as col (col)}
        <GanttSidebarHeaderCell
          column={col}
          width={widths[col] ?? DEFAULT_WIDTHS[col]}
          label={COLUMN_LABELS[col]}
          sortDirection={sortDirOf(col)}
          sortable={SORTABLE_COLUMNS.has(col)}
          on:sort={handleSort}
          on:resizePreview={handleResizePreview}
          on:resizeCommit={handleResizeCommit}
        />
      {/each}
    </div>
  </div>
{:else if extendedColumns}
  <!-- Phase 3a extended grid: sortable header row + per-column cells.
       Width comes from the sum of visible column widths; the parent's
       sidebar-cell still clips us via overflow:hidden.
       v121.2 — the header row is rendered by the corner cell instead
       (headerOnly variant above) so it stays sticky-top; the body keeps
       the per-column cells aligned to the same column widths. -->
  <div class="sidebar-grid" style="width: {gridWidthPx}px;">
    <div
      class="sidebar-grid-body"
      class:has-hover={hoveredRowId !== null}
      class:virtualized={virtualizationOn}
      style={virtualizationOn ? `height: ${spacerHeight}px;` : ''}
    >
      {#each visibleIndexed as p (p.row.id)}
        {@const row = p.row}
        {#if row.kind === 'group-header'}
          <!-- Phase 3b — swimlane header in the extended-grid sidebar.
               Spans the full grid width via grid-column: 1 / -1. -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="sidebar-grid-row gantt-group-header"
            class:collapsed={row.collapsed}
            role="row"
            style={virtualizationOn
              ? `position: absolute; top: ${p.vy}px; left: 0; right: 0; height: ${row.height}px;`
              : `height: ${row.height}px;`}
          >
            <button
              type="button"
              class="toggle-btn"
              use:tooltip={{ label: row.collapsed ? tracker.string.GanttExpand : tracker.string.GanttCollapse }}
              on:click={() => dispatch('toggle', { id: row.id })}
            >
              <Icon icon={row.collapsed ? IconChevronRight : IconChevronDown} size="small" />
            </button>
            <span class="gantt-group-label" title={row.groupLabel ?? ''}>{row.groupLabel ?? ''}</span>
            <span class="gantt-group-count">{row.groupCount ?? 0}</span>
          </div>
        {:else}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="sidebar-grid-row"
          class:summary={row.isSummary}
          class:milestone={row.kind === 'milestone'}
          class:hovered={hoveredRowId === row.id}
          class:tree-breadcrumb={row.isBreadcrumb === true}
          role="row"
          style={virtualizationOn
            ? `position: absolute; top: ${p.vy}px; left: 0; right: 0; height: ${row.height}px;`
            : `height: ${row.height}px;`}
          on:mouseenter={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
          on:mousemove={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
          on:mouseleave={() => dispatch('hoverRow', { id: null })}
          on:contextmenu={(e) => onRowContextMenu(e, row)}
        >
          {#each columns as col (col)}
            <GanttSidebarColumn
              column={col}
              {row}
              width={widths[col] ?? DEFAULT_WIDTHS[col]}
              {relations}
              {issueNumberOf}
              {slack}
              {criticalSet}
              {showCriticalPath}
              on:openIssue={(e) => dispatch('openIssue', e.detail)}
            />
          {/each}
        </div>
        {/if}
      {/each}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div
        class="add-issue-row"
        role="button"
        tabindex="0"
        style={virtualizationOn
          ? `position: absolute; top: ${spacerHeight}px; left: 0; right: 0;`
          : ''}
        on:click={() => dispatch('addIssue')}
        on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') dispatch('addIssue') }}
      >
        <span class="plus-glyph">+</span>
        <span class="add-issue-label"><Label label={tracker.string.AddIssue} /></span>
      </div>
    </div>
  </div>
{:else}
<div
  class="sidebar-rows"
  class:has-hover={hoveredRowId !== null}
  class:virtualized={virtualizationOn}
  style={virtualizationOn ? `width: ${width}px; height: ${spacerHeight}px;` : `width: ${width}px;`}
>
  {#each visibleIndexed as p (p.row.id)}
    {@const row = p.row}
    {#if row.kind === 'group-header'}
      <!-- Phase 3b — swimlane header in the sidebar. Click the chevron to
           collapse/expand the lane. Label + count occupy the full width of
           the legacy sidebar; the canvas-side tint band is rendered by
           GanttCanvas, this row only carries the textual affordance. -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="sidebar-row gantt-group-header"
        class:collapsed={row.collapsed}
        style={virtualizationOn
          ? `position: absolute; top: ${p.vy}px; left: 0; right: 0; height: ${row.height}px;`
          : `height: ${row.height}px;`}
      >
        <span class="col-toggle">
          <button
            type="button"
            class="toggle-btn"
            use:tooltip={{ label: row.collapsed ? tracker.string.GanttExpand : tracker.string.GanttCollapse }}
            on:click={() => dispatch('toggle', { id: row.id })}
          >
            <Icon icon={row.collapsed ? IconChevronRight : IconChevronDown} size="small" />
          </button>
        </span>
        <span class="gantt-group-label" title={row.groupLabel ?? ''}>{row.groupLabel ?? ''}</span>
        <span class="gantt-group-count">{row.groupCount ?? 0}</span>
      </div>
    {:else}
    {@const indent = row.depth * 20}
    {@const tgt = rowJumpTarget(row)}
    {@const dir = tgt !== null ? jumpDirection(tgt) : null}
    {@const jumpX = rowJumpX(row)}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="sidebar-row"
      class:summary={row.isSummary}
      class:milestone={row.kind === 'milestone'}
      class:hovered={hoveredRowId === row.id}
      class:drag-dimmed={anyDragActive && row.issue !== null && activeIssueIdStr !== null && String(row.issue._id) !== activeIssueIdStr}
      class:tree-breadcrumb={row.isBreadcrumb === true}
      class:tree-indented={row.depth > 0}
      style={virtualizationOn
        ? `position: absolute; top: ${p.vy}px; left: 0; right: 0; height: ${row.height}px; padding-left: ${8 + indent}px;`
        : `height: ${row.height}px; padding-left: ${8 + indent}px;`}
      on:mouseenter={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
      on:mousemove={(e) => dispatch('hoverRow', { id: row.id, row, mouseX: e.clientX, mouseY: e.clientY })}
      on:mouseleave={() => dispatch('hoverRow', { id: null })}
      on:contextmenu={(e) => onRowContextMenu(e, row)}
    >
      <span class="col-toggle">
        {#if row.collapsible}
          <button
            type="button"
            class="toggle-btn"
            use:tooltip={{ label: row.collapsed ? tracker.string.GanttExpand : tracker.string.GanttCollapse }}
            on:click={() => dispatch('toggle', { id: row.id })}
          >
            <Icon icon={row.collapsed ? IconChevronRight : IconChevronDown} size="small" />
          </button>
        {/if}
      </span>
      {#if row.kind === 'milestone' && row.milestone !== null}
        {#if showStatus}<span class="cell-status ms-icon" title="Milestone">◆</span>{/if}
        {#if showIssueCode}
          <span class="cell-id">
            <span class="ms-tag">MS</span>
          </span>
        {/if}
        {#if showTitle}
          <!-- PR3.2: single-click opens EditMilestone, matching the issue
               row affordance. role/tabindex mirror the issue-title link. -->
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <span
            class="cell-title clickable"
            title={row.milestone.label}
            role="link"
            tabindex="0"
            on:click={() => row.milestone !== null && openMilestone(row.milestone._id)}
          >
            {row.milestone.label}
          </span>
        {/if}
      {:else if row.issue !== null}
        {#if row.issue.startDate === null && row.issue.dueDate === null}
          <!-- svelte-ignore a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
          <span
            class="drag-grip"
            use:tooltip={{ label: tracker.string.GanttDragToSchedule }}
            on:mousedown|stopPropagation={row.issue !== null ? onDragGripDown(row.issue) : undefined}
          >⋮⋮</span>
        {/if}
        {#if showStatus}
          <span class="cell-status"><StatusBadge issue={row.issue} /></span>
        {/if}
        {#if showIssueCode}
          <span class="cell-id">
            <IssuePresenter value={row.issue} disabled={false} />
          </span>
        {/if}
        {#if showTitle}
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <span
            class="cell-title clickable"
            title={row.issue.title}
            role="link"
            tabindex="0"
            on:click={() => row.issue !== null && openIssue(row.issue)}
            on:keydown={(e) => { if (e.key === 'Enter' && row.issue !== null) openIssue(row.issue) }}
          >
            <!-- Tier-4 Item 12 — Tree-View — wrap the label in an inner span
                 carrying the breadcrumb tooltip. Putting `use:tooltip` on the
                 outer link breaks Svelte's TS inference for the sibling event
                 handlers. -->
            <span class="cell-title-label" use:tooltip={breadcrumbTooltip(row)}>{row.issue.title}</span>
          </span>
        {/if}
        {#if showPredecessors && row.issue !== null}
          {@const text = formatPredecessors(row.issue, relations, issueNumberOf)}
          <span class="cell-predecessors" title={text || ''}>
            {#if text === ''}
              <Label label={tracker.string.NoPredecessors} />
            {:else}
              {text}
            {/if}
          </span>
        {/if}
        {#if showCriticalPath && showSlackColumn && row.issue !== null}
          <span class="cell-slack">
            {#if isCriticalRow(String(row.issue._id))}
              <span class="cp-badge"><Label label={tracker.string.CriticalPathBadge} /></span>
            {:else}
              {slackDaysFor(String(row.issue._id))}d
            {/if}
          </span>
        {/if}
      {:else}
        {#if showStatus}<span class="cell-status" />{/if}
        {#if showIssueCode}
          <span class="cell-id" />
        {/if}
        {#if showTitle}
          <span class="cell-title" />
        {/if}
      {/if}
      <span class="cell-jump">
        {#if dir !== null && jumpX !== null}
          <button
            type="button"
            class="jump-btn"
            use:tooltip={{ label: dir === 'left' ? tracker.string.GanttScrollLeftToBar : tracker.string.GanttScrollRightToBar }}
            on:click={() => dispatch('jump', { x: jumpX })}
          >
            {dir === 'left' ? '←' : '→'}
          </button>
        {/if}
      </span>
    </div>
    {/if}
  {/each}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="add-issue-row"
    role="button"
    tabindex="0"
    style={virtualizationOn
      ? `position: absolute; top: ${spacerHeight}px; left: 0; right: 0;`
      : ''}
    on:click={() => dispatch('addIssue')}
    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') dispatch('addIssue') }}
  >
    <span class="plus-glyph">+</span>
    <span class="add-issue-label"><Label label={tracker.string.AddIssue} /></span>
  </div>
</div>
{/if}

<style lang="scss">
  /* Phase 3a — extended grid styles. */
  .sidebar-grid {
    background: var(--theme-comp-header-color);
    display: flex;
    flex-direction: column;
  }
  .sidebar-grid-header {
    display: flex;
    align-items: stretch;
    height: 28px;
    border-bottom: 1px solid var(--theme-divider-color);
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .sidebar-grid-body {
    display: flex;
    flex-direction: column;
  }
  /* Tier-3 Item 5 — when virtualized, the body acts as a positioning
     ancestor for absolute-positioned rows. `display: block` cancels the
     flex layout so absolute children honour `top: N px`. */
  .sidebar-grid-body.virtualized {
    display: block;
    position: relative;
  }
  .sidebar-grid-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--theme-divider-color);
    box-sizing: border-box;
    background: var(--theme-comp-header-color);
  }
  .sidebar-grid-row.summary { font-weight: 600; }
  .sidebar-grid-row.milestone {
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 6%, transparent);
  }
  .sidebar-grid-row.hovered {
    background: var(--theme-button-hovered);
  }
  :global(.sidebar-grid-body.has-hover) .sidebar-grid-row:not(.hovered) {
    opacity: 0.55;
  }

  /* Legacy compact mode (default) — preserved bit-for-bit. */
  .sidebar-rows {
    background: var(--theme-comp-header-color);
  }
  .sidebar-rows.virtualized {
    position: relative;
  }
  .col-toggle {
    flex: 0 0 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sidebar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 8px;
    border-bottom: 1px solid var(--theme-divider-color);
    color: var(--theme-content-color);
    font-size: 13px;
    overflow: hidden;
    white-space: nowrap;
    box-sizing: border-box;
    background: var(--theme-comp-header-color);
  }
  .cell-status {
    flex: 0 0 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cell-status.ms-icon {
    color: var(--theme-state-info-color, #6366f1);
    font-size: 14px;
  }
  .ms-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 15%, transparent);
    color: var(--theme-state-info-color, #6366f1);
  }
  .cell-id {
    flex: 0 0 80px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-title {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-title.clickable { cursor: pointer; }
  .cell-title.clickable:hover { text-decoration: underline; }
  /* Tier-4 Item 12 — inner label span (carries breadcrumb tooltip) inherits
     ellipsis from the parent cell-title via display:inline-block + overflow. */
  .cell-title-label {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }
  .cell-jump {
    flex: 0 0 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .toggle-btn {
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--theme-darker-color);
    font-size: 10px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .toggle-btn:hover { color: var(--theme-content-color); }
  .jump-btn {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--theme-button-border);
    border-radius: 3px;
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .jump-btn:hover { filter: brightness(1.1); }
  .sidebar-row.summary { font-weight: 600; }
  .sidebar-row.milestone {
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 6%, transparent);
  }
  .sidebar-row.hovered {
    background: var(--theme-button-hovered);
  }
  /* When ANY row is hovered, dim non-hovered rows for a 
     spotlight effect — implemented by the parent setting a data attr. */
  :global(.sidebar-rows.has-hover) .sidebar-row:not(.hovered) {
    opacity: 0.55;
  }
  .sidebar-row.drag-dimmed { opacity: 0.55; }
  /* Tier-4 Item 12 — Tree-View — breadcrumb (parent of matching child)
     is dimmed + italic so the user can read it as filter-context, not as
     a regular result. */
  .sidebar-row.tree-breadcrumb,
  .sidebar-grid-row.tree-breadcrumb {
    opacity: 0.6;
    font-style: italic;
  }
  .sidebar-row.tree-breadcrumb .cell-title,
  .sidebar-grid-row.tree-breadcrumb .cell-title {
    font-style: italic;
  }
  /* Tier-4 Item 12 — Tree-View — dashed depth guide-line so siblings of
     the same parent share a visual rail. Drawn 10px from the row's left
     edge (half an indent-step) to land inside the row's padding. */
  .sidebar-row.tree-indented {
    position: relative;
  }
  .sidebar-row.tree-indented::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 10px;
    border-left: 1px dashed var(--theme-divider-color);
    pointer-events: none;
  }
  .drag-grip {
    cursor: grab;
    color: var(--theme-darker-color);
    user-select: none;
    padding: 0 4px;
    font-size: 14px;
  }
  .drag-grip:active { cursor: grabbing; }
  .sidebar-row.milestone.hovered {
    background: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 14%, transparent);
  }
  .add-issue-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px dashed var(--theme-divider-color);
    color: var(--theme-darker-color);
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    background: var(--theme-comp-header-color);
  }
  .add-issue-row:hover {
    background: var(--theme-button-hovered);
    color: var(--theme-content-color);
  }
  .add-issue-row .plus-glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 14px;
    line-height: 1;
    border-radius: 3px;
    background: color-mix(in srgb, var(--theme-content-color) 8%, transparent);
  }
  .add-issue-row:hover .plus-glyph {
    background: color-mix(in srgb, var(--theme-content-color) 16%, transparent);
  }
  .cell-predecessors {
    display: inline-block;
    max-width: 14ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: var(--theme-content-color);
    margin-left: auto;
    padding-left: 8px;
  }
  .cell-slack {
    font-size: 11px;
    color: var(--theme-content-trans-color);
    padding-left: 8px;
    text-align: right;
    min-width: 40px;
    flex-shrink: 0;
  }
  .cp-badge {
    display: inline-block;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--theme-state-negative-color);
    color: white;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  /* Phase 3b — swimlane header row. Spans both the legacy and the
     extended-grid sidebar layouts via the .gantt-group-header modifier. */
  .sidebar-row.gantt-group-header,
  .sidebar-grid-row.gantt-group-header {
    background: var(--theme-divider-color);
    color: var(--theme-content-color);
    font-weight: 600;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    grid-column: 1 / -1;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .gantt-group-label {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gantt-group-count {
    flex: 0 0 auto;
    opacity: 0.7;
    font-weight: 500;
    font-size: 11px;
  }
</style>
