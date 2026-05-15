<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, Milestone } from '@hcengineering/tracker'
  import type { TimeScale } from './lib/time-scale'
  import type { DragState, DragTarget } from './lib/types'
  import GanttConnectorDot from './GanttConnectorDot.svelte'
  import { activeDragTargetId } from './lib/drag-state'
  import { resolveBarLabel, type BarLabelSlot } from './lib/bar-labels'
  // Tier-4 Item 13 — Mobile-Friendly Gantt.
  import type { LayoutMode } from './lib/breakpoint'
  import { classifyPointer, type PointerKind } from './lib/pointer-classify'
  import { LONG_PRESS_MS, MOVE_THRESHOLD_PX } from './lib/long-press'

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
  // Tier-2 Item 6 — Bulk-Select + Bulk-Drag.
  // `multiSelected` is true for every bar that belongs to the active
  // multi-selection (Spec §"Visual"). Paints the same 2-px solid outline
  // as `selected`. The single-selection `selected` flag stays separate
  // because it governs cursor + resize-handle exposure.
  export let multiSelected: boolean = false
  // PR5 critical-path overlay
  export let isCritical: boolean = false
  export let isViolated: boolean = false
  export let slackMs: number = 0
  export let showSlackGlyph: boolean = false
  // Tier-2 Item 5 — Auto-Scheduling-Toggle. `'manual'` paints a small
  // pin glyph in the leading edge of the bar so the user can see at a
  // glance that this issue is protected from cascade. `'auto'` / `undefined`
  // → no glyph (Bestand-Default).
  export let schedulingMode: 'auto' | 'manual' | undefined = undefined

  // Tier-4 Item 13 — Mobile-Friendly Gantt. layoutMode threads through
  // from GanttView so the pointer-classifier can route touch on Tablet
  // through a long-press timer (Spec §"Tablet"). Default 'desktop'
  // preserves the legacy Mouse-direct behaviour for any caller that
  // doesn't wire the prop.
  export let layoutMode: LayoutMode = 'desktop'

  // Phase 1.A — configurable bar-label slots driven by ViewOptions.
  // Each slot resolves via resolveBarLabel(); 'none' skips render.
  // Defaults preserve legacy "title inside the bar" behaviour.
  export let barLabelLeft: BarLabelSlot = 'none'
  export let barLabelInside: BarLabelSlot = 'title'
  export let barLabelRight: BarLabelSlot = 'none'

  const DAY_MS_FOR_SLACK = 86_400_000
  $: slackPx = showSlackGlyph && slackMs > 0
    ? Math.max(2, (slackMs / DAY_MS_FOR_SLACK) * timeScale.pxPerDay)
    : 0

  const dispatch = createEventDispatcher<{
    barMouseDown: { target: DragTarget, edge: 'left' | 'right' | 'body', cursorX: number }
    barClick: {
      target: DragTarget
      /**
       * Tier-2 Item 6 — modifier keys are surfaced on the event payload
       * so GanttView can route Cmd/Shift-click into the bulk-selection
       * helpers without leaking a DOM event through the dispatcher.
       */
      metaKey: boolean
      ctrlKey: boolean
      shiftKey: boolean
    }
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

  /**
   * Tier-4 Item 13 — Mobile-Friendly Gantt.
   *
   * Long-press timer state. Pointer-classify returns 'long-press' on
   * touch-input at Tablet/Desktop scope; we hold an in-flight
   * setTimeout per bar-rect and clear it on pointermove > 10 px or
   * pointerup before the threshold. Mouse + pen fire the drag-start
   * dispatch immediately ('allow' branch) so legacy desktop UX is
   * unchanged bit-for-bit.
   */
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let longPressStartX: number = 0
  let longPressStartY: number = 0
  let longPressPointerId: number | null = null

  function clearLongPressTimer (): void {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    longPressPointerId = null
  }

  onDestroy(clearLongPressTimer)

  /**
   * Dispatch the actual drag-start. Extracted so both the 'allow' and
   * 'long-press' branches can call it with the same payload shape.
   */
  function dispatchDragStart (
    edge: 'left' | 'right' | 'body',
    cursorX: number,
    modifiers: { metaKey: boolean, ctrlKey: boolean, shiftKey: boolean }
  ): void {
    if (dragTarget === undefined) return
    if (edge === 'body' && !selected && !multiSelected) return
    if (edge === 'body' && (modifiers.metaKey || modifiers.ctrlKey || modifiers.shiftKey)) return
    dispatch('barMouseDown', { target: dragTarget, edge, cursorX })
  }

  /**
   * Tier-4 Item 13 — pointer-events replace the legacy mousedown handler.
   * Pointer-events fire uniformly across mouse / pen / touch, eliminating
   * the previous mouse+pointer double-dispatch issue called out in the
   * Pre-Flight (Item 9).
   */
  function onBarPointer (edge: 'left' | 'right' | 'body') {
    return (evt: PointerEvent): void => {
      // Selected bar swallows the pointerdown so the canvas-pan handler
      // upstream doesn't also grab it. Preserved from the legacy
      // onBarPointerDown so the Item 5 (Bulk-Drag) pan-suppression keeps
      // working.
      if (selected) evt.stopPropagation()
      if (!editable || dragTarget === undefined) return
      if (evt.button !== 0) return
      const action: 'drag' | 'resize' = edge === 'body' ? 'drag' : 'resize'
      const decision = classifyPointer(layoutMode, evt.pointerType as PointerKind, action)
      if (decision === 'block') return
      const modifiers = { metaKey: evt.metaKey, ctrlKey: evt.ctrlKey, shiftKey: evt.shiftKey }
      if (decision === 'allow') {
        dispatchDragStart(edge, evt.clientX, modifiers)
        evt.preventDefault()
        evt.stopPropagation()
        return
      }
      // decision === 'long-press' — schedule a deferred drag-start; the
      // capture of cursorX is the touch-down position (anchoring drag-math
      // from where the finger landed, not where it ends up after the
      // 300 ms hold).
      const startCursorX = evt.clientX
      clearLongPressTimer()
      longPressStartX = evt.clientX
      longPressStartY = evt.clientY
      longPressPointerId = evt.pointerId
      longPressTimer = setTimeout(() => {
        longPressTimer = null
        longPressPointerId = null
        dispatchDragStart(edge, startCursorX, modifiers)
      }, LONG_PRESS_MS)
    }
  }

  function onBarPointerMove (evt: PointerEvent): void {
    if (longPressTimer === null) return
    if (longPressPointerId !== null && evt.pointerId !== longPressPointerId) return
    const dx = evt.clientX - longPressStartX
    const dy = evt.clientY - longPressStartY
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD_PX) clearLongPressTimer()
  }

  function onBarPointerEnd (evt: PointerEvent): void {
    if (longPressPointerId !== null && evt.pointerId !== longPressPointerId) return
    clearLongPressTimer()
  }

  function onBarClick (evt: MouseEvent): void {
    if (!editable || dragTarget === undefined) return
    if (evt.button !== 0) return
    dispatch('barClick', {
      target: dragTarget,
      metaKey: evt.metaKey,
      ctrlKey: evt.ctrlKey,
      shiftKey: evt.shiftKey
    })
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
  /**
   * Tier-2 Item 6 — co-drag membership. True iff THIS bar is a follower
   * member of an active bulk-drag (the leading bar uses `isThisBarActive`
   * instead). The reducer keeps `coDrag.members` immutable for the
   * duration of the drag, so the lookup is safe to do every frame.
   */
  $: coDragMember = (() => {
    if (dragState.kind !== 'dragging-body' || dragState.coDrag === undefined) return undefined
    if (issueRef === undefined) return undefined
    if (isThisBarActive) return undefined
    return dragState.coDrag.members.find((m) => String(m.issueId) === String(issueRef))
  })()
  $: previewStart = (() => {
    if (coDragMember !== undefined && dragState.kind === 'dragging-body' && dragState.coDrag !== undefined) {
      return coDragMember.originStart + dragState.coDrag.anchorDeltaMs
    }
    if (!isThisBarActive) return effectiveStart
    if (dragState.kind === 'dragging-body' || dragState.kind === 'dragging-unscheduled') return dragState.previewStart
    if (dragState.kind === 'resizing-left') return dragState.previewStart
    if (dragState.kind === 'resizing-right') return dragState.originStart
    return effectiveStart
  })()
  $: previewDue = (() => {
    if (coDragMember !== undefined && dragState.kind === 'dragging-body' && dragState.coDrag !== undefined) {
      return coDragMember.originEnd + dragState.coDrag.anchorDeltaMs
    }
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
  // Manual-pin glyph occupies ~14 px at the leading edge of the bar (10 px
  // glyph + 4 px gap to the label). Only render it once the bar is wide
  // enough that the glyph plus at least one label char would fit; on tiny
  // bars the manual-status falls back to the tooltip suffix only.
  $: showManualPin = schedulingMode === 'manual' && !isSummary
  $: manualPinVisible = showManualPin && w >= 24
  $: tooltipText = visible
    ? `${issue.title} (${new Date(startVal).toISOString().slice(0, 10)} → ${new Date(dueVal).toISOString().slice(0, 10)})${
        showManualPin ? ' · manual schedule' : ''
      }`
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
  // Manual-pin glyph takes 14 px of leading room; subtract that from the
  // label budget so the title doesn't overlap the glyph.
  $: maxChars = Math.floor((w - 12 - (manualPinVisible ? 14 : 0)) / CHAR_PX)
  $: barLabel = maxChars >= 4
    ? (issue.title.length > maxChars ? issue.title.slice(0, Math.max(1, maxChars - 1)) + '…' : issue.title)
    : ''
  // For Issues we pass the full doc; for synthetic milestone/summary rows
  // GanttBar gets a bare {title, startDate, dueDate} via the `issue` prop,
  // so we have to skip label resolution and fall back to title-only.
  $: hasFullIssue = dragTarget !== undefined && dragTarget.kind === 'issue'
  $: leftLabel = hasFullIssue ? resolveBarLabel((dragTarget as any)!.doc as Issue, barLabelLeft) : ''
  $: insideLabelRaw = hasFullIssue ? resolveBarLabel((dragTarget as any)!.doc as Issue, barLabelInside) : ''
  $: insideLabel = (() => {
    if (insideLabelRaw === '') return ''
    if (maxChars < 4) return ''
    if (insideLabelRaw.length > maxChars) return insideLabelRaw.slice(0, Math.max(1, maxChars - 1)) + '…'
    return insideLabelRaw
  })()
  $: rightLabel = hasFullIssue ? resolveBarLabel((dragTarget as any)!.doc as Issue, barLabelRight) : ''
  // Summary (milestone/parent) bars keep the old title-truncation behaviour
  // since we don't have a full Issue doc to resolve labels from.
  $: summaryLabel = maxChars >= 4
    ? (issue.title.length > maxChars ? issue.title.slice(0, Math.max(1, maxChars - 1)) + '…' : issue.title)
    : ''
</script>

{#if visible}
  {@const barY = row.y + 6}
  {@const barH = row.height - 12}
  {#if isSummary}
    <!-- MS-Project-style claw: thin black bar with downward triangles at
         both ends. A transparent hit-rect spanning the full claw width
         receives mousedown/contextmenu so parent-issues (which render as
         a claw because they have children) can still be dragged. Without
         this rect the claw is visually editable but functionally inert —
         commitDrag's parent-pulls-children path is unreachable from
         the UI. -->
    {#if editable && !isMilestoneSummary}
      <!--
        role="button" makes the interactive SVG rect addressable by AT
        (screen reader announces "Drag {title} to reschedule"). Keyboard
        access is handled at the GanttView level (Tab/ArrowLeft/Right —
        see onKey handler in GanttView.svelte), so the per-rect
        a11y-click-events-have-key-events warning is intentionally ignored.
      -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <rect
        x={x}
        y={barY}
        width={w}
        height={barH}
        fill="transparent"
        class="summary-hit"
        class:selected={selected || multiSelected}
        class:active-drag={isThisBarActive || coDragMember !== undefined}
        role="button"
        tabindex="-1"
        aria-label={issue.title}
        on:pointerdown={onBarPointer('body')}
        on:pointermove={onBarPointerMove}
        on:pointerup={onBarPointerEnd}
        on:pointercancel={onBarPointerEnd}
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
    {#if summaryLabel !== ''}
      <text
        x={x + 10}
        y={barY + barH / 2 - 4}
        class="bar-label summary-label"
        fill="var(--theme-content-color)"
      >{summaryLabel}</text>
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
      stroke={(isCritical || isViolated) ? '#dc2626' : barColors.border}
      stroke-width={(isCritical || isViolated) ? 2 : 1}
      stroke-dasharray={isViolated ? '4 2' : 'none'}
      class="bar"
      class:editable
      class:active-drag={isThisBarActive || coDragMember !== undefined}
      class:focused
      class:selected={selected || multiSelected}
      class:critical={isCritical}
      class:violated={isViolated}
      role="button"
      tabindex="-1"
      aria-label={issue.title}
      on:pointerdown={onBarPointer('body')}
      on:pointermove={onBarPointerMove}
      on:pointerup={onBarPointerEnd}
      on:pointercancel={onBarPointerEnd}
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
    {#if isCritical && showSlackGlyph}
      <!-- PR5: 18%-opacity red overlay on critical bars, on top of the
           status fill. pointer-events: none so drag/click stays routed
           to the underlying bar rect. -->
      <rect
        x={x}
        y={barY}
        width={w}
        height={barH}
        rx={3}
        ry={3}
        fill="#dc2626"
        fill-opacity="0.18"
        pointer-events="none"
      />
    {/if}
    {#if slackPx > 0 && !isCritical}
      <!-- PR5: slack glyph — light-grey trailing bar showing total
           slack (LS - ES). Critical bars (slack = 0) don't render this. -->
      <rect
        x={x + w + 1}
        y={barY + 2}
        width={slackPx}
        height={barH - 4}
        rx={2}
        ry={2}
        fill="#9ca3af"
        fill-opacity="0.4"
        pointer-events="none"
      />
    {/if}
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
    <!-- PR4a connector-dot rendering moved to a sibling overlay layer in
         GanttCanvas (rendered AFTER GanttDependencyLayer) so the dot
         paints above dep-arrows. Keeping a duplicate dot inside the bar
         would also work, but the in-bar copy is rendered before the
         dep-layer and therefore occluded by the arrow's 12 px invisible
         click target. The overlay is the single source of truth. -->

    {#if manualPinVisible}
      <!-- Tier-2 Item 5 — Manual-pin glyph (inline SVG: small map-pin
           shape rotated to point left). Sized 10 px tall, centred vertically
           in the bar with 4 px of leading padding. pointer-events: none so
           drag/click stays routed to the underlying bar rect. -->
      <g class="manual-pin" pointer-events="none">
        <circle
          cx={x + 9}
          cy={barY + barH / 2}
          r={4}
          fill={barColors.text}
          stroke={barColors.fill}
          stroke-width={1}
        />
        <circle
          cx={x + 9}
          cy={barY + barH / 2}
          r={1.6}
          fill={barColors.fill}
        />
        <path
          d="M {x + 5} {barY + barH / 2} L {x + 1.5} {barY + barH / 2 - 0.5} L {x + 1.5} {barY + barH / 2 + 0.5} Z"
          fill={barColors.text}
        />
      </g>
    {/if}
    {#if barLabel !== ''}
      <text
        x={x + 6 + (manualPinVisible ? 14 : 0)}
        y={barY + barH / 2 + 4}
        class="bar-label-inside"
        fill={barColors.text}
        pointer-events="none"
      >{insideLabel}</text>
    {/if}
    {#if rightLabel !== ''}
      <text
        x={x + w + 6}
        y={barY + barH / 2}
        class="bar-label-right"
        text-anchor="start"
        dominant-baseline="middle"
        fill="var(--theme-content-trans-color)"
        pointer-events="none"
      >{rightLabel}</text>
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
  .bar-label-left,
  .bar-label-right {
    font-size: 11px;
    font-weight: 400;
    user-select: none;
  }
  .bar-label-inside {
    font-size: 13px;
    font-weight: 500;
    user-select: none;
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
   * on every fill color (backlog grey through active orange). The earlier
   * 2px stroke was too subtle on bright bars.
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
