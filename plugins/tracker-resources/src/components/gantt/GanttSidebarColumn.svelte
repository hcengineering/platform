<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  /**
   * Phase 3a per-column renderer. Reads a column key + a LayoutRow and
   * paints the corresponding inline cell. The cell is **display-only** in
   * v1: it shows status/priority/assignee/dates without an in-cell editor.
   * Click-to-edit will be staged in Phase 3a.v2 alongside the undo-manager
   * (Phase 3c) so a missed edit cannot leak through with no rollback path.
   *
   * Non-orderable / not-yet-implemented columns (component, milestone,
   * progress, deadline) render a placeholder — see header sortable=false
   * for the matching no-op cycle behaviour.
   */
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import { IssuePriority } from '@hcengineering/tracker'
  import { HighlightedText, Label } from '@hcengineering/ui'
  import { rawSearchTextStore, searchHighlightEnabledStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import StatusBadge from './StatusBadge.svelte'
  import IssuePresenter from '../issues/IssuePresenter.svelte'
  import { formatPredecessors } from './lib/predecessor-format'
  import type { LayoutRow } from './lib/types'
  import type { SidebarColumnKey } from './lib/sidebar-columns'

  export let column: SidebarColumnKey
  export let row: LayoutRow
  export let width: number
  export let relations: IssueRelation[] = []
  export let issueNumberOf: (ref: Ref<Issue>) => string = () => ''
  export let slack: Map<Ref<Issue>, number> = new Map()
  export let criticalSet: Set<Ref<Issue>> = new Set()
  export let showCriticalPath: boolean = false

  const DAY_MS = 86_400_000

  const dispatch = createEventDispatcher<{
    openIssue: { issue: { _id: string, _class: string } }
  }>()

  $: issue = row.issue
  $: isCritical = issue !== null && criticalSet.has(issue._id)

  function slackDays (id: Ref<Issue>): number {
    return Math.round((slack.get(id) ?? 0) / DAY_MS)
  }

  function priorityLabel (p: IssuePriority): string {
    switch (p) {
      case IssuePriority.Urgent: return 'Urgent'
      case IssuePriority.High: return 'High'
      case IssuePriority.Medium: return 'Medium'
      case IssuePriority.Low: return 'Low'
      default: return '—'
    }
  }

  /** Render a Timestamp as `YYYY-MM-DD` — locale-stable, ISO short form. */
  function formatDateShort (ts: number | null | undefined): string {
    if (ts === null || ts === undefined) return '—'
    const d = new Date(ts)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function onTitleClick (): void {
    if (issue === null) return
    dispatch('openIssue', { issue: { _id: String(issue._id), _class: String(issue._class) } })
  }
</script>

<div class="sidebar-cell col-{column}" style="width: {width}px;">
  {#if issue !== null}
    {#if column === 'identifier'}
      <span class="cell-content cell-identifier"><IssuePresenter value={issue} disabled={false} /></span>
    {:else if column === 'title'}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <span
        class="cell-content cell-title clickable"
        title={issue.title}
        role="link"
        tabindex="0"
        on:click={onTitleClick}
        on:keydown={(e) => { if (e.key === 'Enter') onTitleClick() }}
      >
        <HighlightedText text={issue.title} query={$rawSearchTextStore} enabled={$searchHighlightEnabledStore} />
      </span>
    {:else if column === 'status'}
      <span class="cell-content cell-status"><StatusBadge {issue} /></span>
    {:else if column === 'priority'}
      <span class="cell-content cell-priority" title={priorityLabel(issue.priority)}>{priorityLabel(issue.priority)}</span>
    {:else if column === 'assignee'}
      <span class="cell-content cell-assignee dim">
        {issue.assignee !== null ? '·' : '—'}
      </span>
    {:else if column === 'estimation'}
      <span class="cell-content cell-numeric">{issue.estimation > 0 ? `${issue.estimation}h` : '—'}</span>
    {:else if column === 'component'}
      <span class="cell-content dim">—</span>
    {:else if column === 'milestone'}
      <span class="cell-content dim">—</span>
    {:else if column === 'predecessors'}
      {@const text = formatPredecessors(issue, relations, issueNumberOf)}
      <span class="cell-content cell-predecessors" title={text || ''}>
        {#if text === ''}
          <Label label={tracker.string.NoPredecessors} />
        {:else}
          {text}
        {/if}
      </span>
    {:else if column === 'slack'}
      <span class="cell-content cell-slack">
        {#if showCriticalPath && isCritical}
          <span class="cp-badge"><Label label={tracker.string.CriticalPathBadge} /></span>
        {:else}
          {slackDays(issue._id)}d
        {/if}
      </span>
    {:else if column === 'startDate'}
      <span class="cell-content cell-date">{formatDateShort(issue.startDate)}</span>
    {:else if column === 'dueDate'}
      <span class="cell-content cell-date">{formatDateShort(issue.dueDate)}</span>
    {:else if column === 'deadline'}
      <span class="cell-content cell-date dim">—</span>
    {:else if column === 'progress'}
      <span class="cell-content dim">—</span>
    {:else if column === 'modifiedOn'}
      <span class="cell-content cell-date">{formatDateShort(issue.modifiedOn)}</span>
    {:else if column === 'createdOn'}
      <span class="cell-content cell-date">{formatDateShort(issue.createdOn ?? null)}</span>
    {/if}
  {:else if row.kind === 'milestone' && row.milestone !== null}
    <!-- Milestone rows in extended-columns mode. The legacy single-cell
         sidebar showed the milestone label inline; the extended grid
         iterates columns and previously rendered an empty placeholder
         everywhere, hiding the milestone text. Map the milestone fields
         onto the matching columns so the label + dates stay visible. -->
    {#if column === 'title'}
      <span class="cell-content cell-title cell-milestone-title" title={row.milestone.label}>{row.milestone.label}</span>
    {:else if column === 'startDate'}
      <span class="cell-content cell-date">{formatDateShort(row.milestone.startDate)}</span>
    {:else if column === 'dueDate'}
      <span class="cell-content cell-date">{formatDateShort(row.milestone.targetDate)}</span>
    {:else if column === 'deadline'}
      <span class="cell-content cell-date">{formatDateShort(row.milestone.targetDate)}</span>
    {:else}
      <span class="cell-content dim"></span>
    {/if}
  {:else}
    <!-- swimlane / group rows — no per-column data, render a thin placeholder.
         The group-header row already renders the label via its own branch
         in GanttSidebar.svelte. -->
    <span class="cell-content dim"></span>
  {/if}
</div>

<style lang="scss">
  .sidebar-cell {
    display: inline-flex;
    align-items: center;
    height: 100%;
    box-sizing: border-box;
    padding: 0 6px;
    border-right: 1px solid var(--theme-divider-color);
    overflow: hidden;
    white-space: nowrap;
    flex: 0 0 auto;
    font-size: 13px;
    color: var(--theme-content-color);
  }
  .cell-content {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cell-title.clickable { cursor: pointer; }
  .cell-title.clickable:hover { text-decoration: underline; }
  /* Milestone labels in extended-columns mode — same column as issue
     titles but italic to match the legacy compact sidebar's milestone
     row styling. */
  .cell-milestone-title {
    font-style: italic;
    font-weight: 500;
  }
  .cell-numeric, .cell-date {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 12px;
  }
  .cell-priority {
    font-size: 12px;
  }
  .cell-predecessors {
    font-size: 11px;
    color: var(--theme-content-color);
  }
  .cell-slack {
    font-size: 11px;
    color: var(--theme-content-trans-color);
    text-align: right;
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
  .dim {
    color: var(--theme-content-trans-color);
  }
</style>
