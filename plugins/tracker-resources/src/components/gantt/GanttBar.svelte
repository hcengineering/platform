<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, Milestone } from '@hcengineering/tracker'
  import type { TimeScale } from './lib/time-scale'
  import type { DragState, DragTarget } from './lib/types'
  import GanttConnectorDot from './GanttConnectorDot.svelte'
  import { activeDragTargetId } from './lib/drag-state'

  // Bar is rendered for both Issues and synthetic milestone summaries; the
  // structural subset below is all the bar geometry needs.
  export let issue: { title: string; startDate: number | null; dueDate: number | null }
  export let row: { y: number; height: number }
  export let timeScale: TimeScale
  export let isSummary: boolean = false
  export let summaryRange: { startDate: number | null; dueDate: number | null } | null = null
  // Status category drives bar fill: backlog grey, todo blue, in-progress
  // amber, completed green, cancelled muted. null = no status info.
  export let statusCategory: string | null = null

  // PR 3 edit-mode props. dragTarget carries the discriminated drag subject
  // (Issue or Milestone — PR3.3 2026-05-11); editable gates body selection
  // and dependency connector controls. activeDrag is the shared store written
  // by the drag-controller reducer. issueRef is kept for the legacy active-drag
  // highlight check below; it still works for both Issue and Milestone _id
  // values.
  export let editable: boolean = false
  export let activeDrag: Writable<DragState> = writable({ kind: 'idle' })
  export let issueRef: Ref<Issue> | Ref<Milestone> | undefined = undefined
  export let dragTarget: DragTarget | undefined = undefined
  export let focused: boolean = false
  export let selected: boolean = false

  const dispatch = createEventDispatcher<{
    barMouseDown: { target: DragTarget, edge: 'left' | 'right' | 'body', cursorX: number }
    barClick: { target: DragTarget }
    contextMenu: { issue: Issue, event: MouseEvent }
    connectorDown: { source: Issue, cursorClientX: number, cursorClientY: number }
    barHover: { issue: Issue | null }
  }>()

  let hovered = false

  function onBarContextMenu (evt: MouseEvent): void {
    // Context-menu is currently issue-only (PR3 menu wires Issue actions);
    // milestone bars don't surface it. PR3.3 keeps this gated until the
    // milestone menu is designed.
    if (dragTarget === undefined || dragTarget.kind !== 'issue') return
    evt.preventDefault()
    evt.stopPropagation()
    dispatch('contextMenu', { issue: dragTarget.doc, event: evt })
  }

  function onBarDown (edge: 'left' | 'right' | 'body') {
    return (evt: MouseEvent): void => {
      if (!editable || dragTarget === undefined) return
      if (evt.button !== 0) return // only left-click starts a drag
      if (edge === 'body' && !selected) return
      dispatch('barMouseDown', { target: dragTarget, edge, cursorX: evt.clientX })
      evt.preventDefault()
      evt.stopPropagation()
    }
  }

  function onBarPointerDown (evt: PointerEvent): void {
    if (selected) evt.stopPropagation()
  }

  function onBarClick (evt: MouseEvent): void {
    if (!editable || dragTarget === undefined) return
    if (evt.button !== 0) return
    dispatch('barClick', { target: dragTarget })
    evt.preventDefault()
    evt.stopPropagation()
  }

  // Status-driven fill + matching text color. Active gets the most
  // emphatic treatment (saturated fill, white text) so the user can
  // spot in-flight work at a glance — redesign feedback.
  $: barColors = statusFill(statusCategory)
  function statusFill (cat: string | null): { fill: string, border: string, text: string } {
    switch (cat) {
      case 'task:statusCategory:UnStarted':
      case 'tracker:statusCategory:Backlog':
        return { fill: 'var(--theme-button-default)', border: 'var(--theme-button-border)', text: 'var(--theme-content-color)' }
      case 'task:statusCategory:ToDo':
        return { fill: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' }
      case 'task:statusCategory:Active':
        return { fill: '#f59e0b', border: '#d97706', text: '#ffffff' }
      case 'task:statusCategory:Won':
        return { fill: '#10b981', border: '#059669', text: '#ffffff' }
      case 'task:statusCategory:Lost':
        return { fill: '#d1d5db', border: '#9ca3af', text: '#374151' }
      default:
        return { fill: 'var(--theme-button-default)', border: 'var(--theme-button-border)', text: 'var(--theme-content-color)' }
    }
  }

  $: effectiveStart = isSummary ? summaryRange?.startDate ?? issue.startDate : issue.startDate
  $: effectiveDue = isSummary ? summaryRange?.dueDate ?? issue.dueDate : issue.dueDate

  // PR 3 edit-mode: while THIS bar is the active drag target, swap the bar
  // geometry over to the reducer's preview values so the bar visually tracks
  // the cursor without waiting for the server round-trip. Other bars keep
  // their stored geometry.
  $: dragState = $activeDrag
  // PR3.3: DragState carries `target: { kind, doc }` (Issue or Milestone)
  // since the refactor. Read doc._id for the active-bar match.
  $: isThisBarActive =
    issueRef !== undefined &&
    activeDragTargetId(dragState) === issueRef
  $: isThisConnectorActive =
    issueRef !== undefined &&
    (dragState.kind === 'connector-drawing' || dragState.kind === 'connector-target-hover') &&
    String(dragState.source._id) === String(issueRef)
  $: previewStart = (() => {
    if (!isThisBarActive) return effectiveStart
    if (dragState.kind === 'dragging-body' || dragState.kind === 'dragging-unscheduled') return dragState.previewStart
    if (dragState.kind === 'resizing-left') return dragState.previewStart
    if (dragState.kind === 'resizing-right') return dragState.originStart
    return effectiveStart
  })()
  $: previewDue = (() => {
    if (!isThisBarActive) return effectiveDue
    if (dragState.kind === 'dragging-body' || dragState.kind === 'dragging-unscheduled') return dragState.previewEnd
    if (dragState.kind === 'resizing-left') return dragState.originEnd
    if (dragState.kind === 'resizing-right') return dragState.previewEnd
    return effectiveDue
  })()

  $: visible = previewStart !== null && previewDue !== null
  $: rawStart = (previewStart ?? 0) as number
  $: rawDue = (previewDue ?? 0) as number
  // Normalise reversed ranges (start > due): render the bar across [min, max]
  // rather than collapsing to a 2px sliver at the start. Tooltip mirrors the
  // visual order so the user sees the same range that's drawn.
  $: startVal = Math.min(rawStart, rawDue)
  $: dueVal = Math.max(rawStart, rawDue)
  $: x = visible ? timeScale.toX(startVal) : 0
  $: x2 = visible ? timeScale.toX(dueVal) : 0
  $: w = Math.max(2, x2 - x + timeScale.pxPerDay) // inclusive duration: see spec §8.0
  $: tooltipText = visible
    ? `${issue.title} (${new Date(startVal).toISOString().slice(0, 10)} → ${new Date(dueVal).toISOString().slice(0, 10)})`
    : ''
  // Milestone-synthetic-summary claws were dropped in PR3.3 (the milestone
  // is now rendered as its own editable bar). Parent-issue summaries have a
  // dragTarget of kind='issue' carrying the parent Issue. So the only
  // remaining case for `isMilestoneSummary` is a summary row without an
  // issue-target — defensive: keeps the gate intact if a future row-kind
  // mounts GanttBar without a dragTarget. Was `issueObj === undefined`
  // before PR3.3 renamed `issueObj` → `dragTarget` (latent regression
  // surfaced during PR4a code review 2026-05-11).
  $: isMilestoneSummary = isSummary && (dragTarget === undefined || dragTarget.kind !== 'issue')

  // Heuristic: ~7.5px per character at 13px font — leave breathing room.
  const CHAR_PX = 7.5
  $: maxChars = Math.floor((w - 12) / CHAR_PX)
  $: barLabel = maxChars >= 4
    ? (issue.title.length > maxChars ? issue.title.slice(0, Math.max(1, maxChars - 1)) + '…' : issue.title)
    : ''
</script>

{#if visible}
  {@const barY = row.y + 6}
  {@const barH = row.height - 12}
  {#if isSummary}
    <!-- MS-Project-style claw: thin black bar with downward triangles at
         both ends. review note (2026-05-11): a transparent hit-rect
         spanning the full claw width receives mousedown/contextmenu so
         parent-issues (which render as a claw because they have children)
         can still be dragged. Without this rect the claw was visually
         editable but functionally inert — commitDrag's parent-pulls-
         children path was unreachable from the UI. -->
    {#if editable && !isMilestoneSummary}
      <!--
        role="button" makes the interactive SVG rect addressable by AT
        (screen reader announces "Drag {title} to reschedule"). Keyboard
        access is handled at the GanttView level (Tab/ArrowLeft/Right —
        see onKey handler in GanttView.svelte), so the per-rect
        a11y-click-events-have-key-events warning is intentionally
        ignored. review note 2026-05-11.
      -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <rect
        x={x}
        y={barY}
        width={w}
        height={barH}
        fill="transparent"
        class="summary-hit"
        class:selected
        class:active-drag={isThisBarActive}
        role="button"
        tabindex="-1"
        aria-label={issue.title}
        on:pointerdown={onBarPointerDown}
        on:mousedown={onBarDown('body')}
        on:click={onBarClick}
        on:contextmenu={onBarContextMenu}
        on:mouseenter={() => {
          hovered = true
          if (dragTarget !== undefined && dragTarget.kind === 'issue') dispatch('barHover', { issue: dragTarget.doc })
        }}
        on:mouseleave={() => {
          hovered = false
          dispatch('barHover', { issue: null })
        }}
      />
    {/if}
    <line
      x1={x + 1}
      x2={x + w - 1}
      y1={barY + barH / 2}
      y2={barY + barH / 2}
      stroke="var(--theme-content-color)"
      stroke-width={3}
      pointer-events="none"
    />
    <polygon
      points="{x},{barY + barH / 2 - 1} {x + 6},{barY + barH / 2 - 1} {x + 3},{barY + barH / 2 + 5}"
      fill="var(--theme-content-color)"
      pointer-events="none"
    />
    <polygon
      points="{x + w - 6},{barY + barH / 2 - 1} {x + w},{barY + barH / 2 - 1} {x + w - 3},{barY + barH / 2 + 5}"
      fill="var(--theme-content-color)"
      pointer-events="none"
    />
    {#if barLabel !== ''}
      <text
        x={x + 10}
        y={barY + barH / 2 - 4}
        class="bar-label summary-label"
        fill="var(--theme-content-color)"
      >{barLabel}</text>
    {/if}
    <title>{tooltipText}</title>
  {:else}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <rect
      x={x}
      y={barY}
      width={w}
      height={barH}
      rx={3}
      ry={3}
      fill={barColors.fill}
      stroke={barColors.border}
      stroke-width={1}
      class="bar"
      class:editable
      class:active-drag={isThisBarActive}
      class:focused
      class:selected
      role="button"
      tabindex="-1"
      aria-label={issue.title}
      on:pointerdown={onBarPointerDown}
      on:mousedown={onBarDown('body')}
      on:click={onBarClick}
      on:contextmenu={onBarContextMenu}
      on:mouseenter={() => {
        hovered = true
        if (dragTarget !== undefined && dragTarget.kind === 'issue') dispatch('barHover', { issue: dragTarget.doc })
      }}
      on:mouseleave={() => {
        hovered = false
        dispatch('barHover', { issue: null })
      }}
    />
    {#if editable && selected && w >= 18}
      <rect
        x={x - 3}
        y={barY}
        width={6}
        height={barH}
        class="bar-resize-handle left"
        on:pointerdown|stopPropagation
        on:mousedown={onBarDown('left')}
      />
      <rect
        x={x + w - 3}
        y={barY}
        width={6}
        height={barH}
        class="bar-resize-handle right"
        on:pointerdown|stopPropagation
        on:mousedown={onBarDown('right')}
      />
    {/if}
    {#if editable && (selected || isThisConnectorActive) && dragTarget !== undefined && dragTarget.kind === 'issue' && w >= 18}
      <GanttConnectorDot
        cx={x + w + 12}
        cy={barY + barH - 2}
        sourceId={String(dragTarget.doc._id)}
        sourceSpace={String(dragTarget.doc.space)}
        hitR={10}
        on:connectorDown={(e) => {
          if (dragTarget === undefined || dragTarget.kind !== 'issue') return
          dispatch('connectorDown', {
            source: dragTarget.doc,
            cursorClientX: e.detail.cursorX,
            cursorClientY: e.detail.cursorY
          })
        }}
      />
    {/if}
    {#if barLabel !== ''}
      <text
        x={x + 6}
        y={barY + barH / 2 + 4}
        class="bar-label"
        fill={barColors.text}
      >{barLabel}</text>
    {/if}
    <title>{tooltipText}</title>
  {/if}
{/if}

<style lang="scss">
  .bar {
    transition: filter 120ms ease;
  }
  .bar:hover {
    filter: brightness(1.1);
  }
  .bar-label {
    font-size: 13px;
    user-select: none;
    pointer-events: none;
    dominant-baseline: alphabetic;
  }
  .summary-label {
    font-weight: 600;
  }
  /*
   * Cursor state machine (user feedback 2026-05-11):
   *   editable, not selected → pointer  (single click marks the bar)
   *   editable + selected    → grab     (click-and-hold pans the canvas)
   *   mid-drag               → grabbing (legacy/sidebar explicit drags)
   */
  .bar.editable {
    cursor: pointer;
  }
  .bar.editable.selected {
    cursor: grab;
  }
  .bar.editable.active-drag {
    cursor: grabbing;
  }
  .bar-resize-handle {
    fill: transparent;
    cursor: ew-resize;
    pointer-events: all;
  }
  .bar-resize-handle:hover {
    fill: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 18%, transparent);
  }
  .bar.active-drag {
    stroke: var(--theme-state-info-color, #6366f1);
    stroke-width: 2px;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--theme-state-info-color, #6366f1) 50%, transparent));
  }
  /*
   * .focused (keyboard Tab cycle) is intentionally low-contrast — a thin
   * dashed 1px outline. handleBarMouseDown syncs focusedIssueId to
   * selectedIssueId on click, so .focused only appears alone for pure
   * keyboard navigation (rare) and never competes visually with .selected.
   */
  .bar.focused {
    stroke: var(--theme-state-info-color, #6366f1);
    stroke-width: 1px;
    stroke-dasharray: 2,2;
  }
  /*
   * Click-to-select state: thick solid blue outline + glow. Made deliberately
   * stronger than the previous 2px stroke so the armed state is unmistakable
   * on every fill color (backlog grey through active orange). Codex review-7
   * 2026-05-11: user reported the previous treatment was too subtle.
   */
  .bar.selected {
    stroke: var(--theme-state-info-color, #6366f1);
    stroke-width: 3px;
    paint-order: stroke fill;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--theme-state-info-color, #6366f1) 60%, transparent));
  }
  /* Parent-issue summary claw: invisible hit-rect with select/drag visual
     feedback when the user has armed the claw via click. Same cursor
     state machine as .bar. */
  :global(svg.gantt-canvas .summary-hit) {
    cursor: pointer;
  }
  :global(svg.gantt-canvas .summary-hit.selected) {
    cursor: grab;
  }
  :global(svg.gantt-canvas .summary-hit.active-drag) {
    cursor: grabbing;
  }
  :global(svg.gantt-canvas .summary-hit.selected),
  :global(svg.gantt-canvas .summary-hit.active-drag) {
    fill: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 18%, transparent);
    stroke: var(--theme-state-info-color, #6366f1);
    stroke-width: 1.5px;
    stroke-dasharray: 4,2;
  }
</style>
