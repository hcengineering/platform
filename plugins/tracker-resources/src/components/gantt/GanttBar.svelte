<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { Issue } from '@hcengineering/tracker'
  import type { TimeScale } from './lib/time-scale'
  import type { DragState } from './lib/types'

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

  // PR 3 edit-mode props. issueObj carries the full Issue when this bar
  // represents one (vs. a synthetic milestone-summary); editable gates the
  // resize-handle rendering and the mousedown handlers; activeDrag is the
  // shared store written by the drag-controller reducer.
  export let editable: boolean = false
  export let activeDrag: Writable<DragState> = writable({ kind: 'idle' })
  export let issueRef: Ref<Issue> | undefined = undefined
  export let issueObj: Issue | undefined = undefined

  const dispatch = createEventDispatcher<{
    barMouseDown: { issue: Issue, edge: 'left' | 'right' | 'body', cursorX: number }
  }>()

  /**
   * Each visible region of the bar (body + the two resize handles) gets
   * its own mousedown listener with an explicit edge tag. This is simpler
   * and more reliable than position-detection: SVG event.target identifies
   * the clicked element directly, no DOMRect math needed.
   * Codex review 2026-05-10: avoid the previous unified onBarMouseDown +
   * detectEdge because the resize-handle <rect>s would not fire it without
   * separate listeners.
   */
  function onBarDown (edge: 'left' | 'right' | 'body') {
    return (evt: MouseEvent): void => {
      if (!editable || issueObj === undefined) return
      if (evt.button !== 0) return // only left-click starts a drag
      dispatch('barMouseDown', { issue: issueObj, edge, cursorX: evt.clientX })
      evt.preventDefault()
      evt.stopPropagation()
    }
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
  $: visible = effectiveStart !== null && effectiveDue !== null
  $: rawStart = (effectiveStart ?? 0) as number
  $: rawDue = (effectiveDue ?? 0) as number
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
    <!-- MS-Project-style claw: thin black bar with downward triangles at both ends -->
    <line
      x1={x + 1}
      x2={x + w - 1}
      y1={barY + barH / 2}
      y2={barY + barH / 2}
      stroke="var(--theme-content-color)"
      stroke-width={3}
    />
    <polygon
      points="{x},{barY + barH / 2 - 1} {x + 6},{barY + barH / 2 - 1} {x + 3},{barY + barH / 2 + 5}"
      fill="var(--theme-content-color)"
    />
    <polygon
      points="{x + w - 6},{barY + barH / 2 - 1} {x + w},{barY + barH / 2 - 1} {x + w - 3},{barY + barH / 2 + 5}"
      fill="var(--theme-content-color)"
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
      on:mousedown={onBarDown('body')}
    />
    {#if editable && w >= 18}
      <rect
        class="resize-handle resize-left"
        x={x}
        y={barY}
        width={6}
        height={barH}
        fill="transparent"
        pointer-events="all"
        on:mousedown={onBarDown('left')}
      />
      <rect
        class="resize-handle resize-right"
        x={x + w - 6}
        y={barY}
        width={6}
        height={barH}
        fill="transparent"
        pointer-events="all"
        on:mousedown={onBarDown('right')}
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
  .bar.editable {
    cursor: grab;
  }
  :global(svg.gantt-canvas .resize-handle) {
    cursor: ew-resize;
  }
  :global(svg.gantt-canvas .resize-handle.resize-left:hover),
  :global(svg.gantt-canvas .resize-handle.resize-right:hover) {
    fill: var(--theme-state-info-color, #6366f1);
    fill-opacity: 0.35;
  }
</style>
