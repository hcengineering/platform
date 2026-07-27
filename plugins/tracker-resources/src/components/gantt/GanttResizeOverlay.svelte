<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { writable, type Writable } from 'svelte/store'
  import { translate } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/ui'
  import type { DragState } from './lib/types'
  import type { TimeScale } from '@hcengineering/gantt'
  import tracker from '../../plugin'

  const idleDrag: DragState = { kind: 'idle' }

  export let activeDrag: Writable<DragState> = writable(idleDrag)
  export let timeScale: TimeScale
  export let canvasHeight: number = 600

  const DAY_MS = 86_400_000

  function fmt (ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function originGeometry (state: DragState): { x: number, w: number } | null {
    if (state.kind === 'dragging-body') {
      const x = timeScale.toX(state.originStart)
      return { x, w: timeScale.toX(state.originEnd) - x + timeScale.pxPerDay }
    }
    // dragging-unscheduled has no meaningful origin until the cursor enters
    // the canvas; before that the "origin" is just today and would mislead
    // the user with a ghost outline at the wrong place.
    if (state.kind === 'dragging-unscheduled' && state.hasCanvasTarget) {
      const x = timeScale.toX(state.originStart)
      return { x, w: timeScale.toX(state.originEnd) - x + timeScale.pxPerDay }
    }
    if (state.kind === 'resizing-left' || state.kind === 'resizing-right') {
      const x = timeScale.toX(state.originStart)
      return { x, w: timeScale.toX(state.originEnd) - x + timeScale.pxPerDay }
    }
    return null
  }

  function guideX (state: DragState): number | null {
    if (state.kind === 'dragging-body') return timeScale.toX(state.previewStart)
    if (state.kind === 'resizing-left') return timeScale.toX(state.previewStart)
    if (state.kind === 'resizing-right') return timeScale.toX(state.previewEnd) + timeScale.pxPerDay
    if (state.kind === 'dragging-unscheduled' && state.hasCanvasTarget) return timeScale.toX(state.previewStart)
    return null
  }

  function pillDate (state: DragState): number | null {
    if (state.kind === 'dragging-body') return state.previewStart
    if (state.kind === 'resizing-left') return state.previewStart
    if (state.kind === 'resizing-right') return state.previewEnd
    if (state.kind === 'dragging-unscheduled' && state.hasCanvasTarget) return state.previewStart
    return null
  }

  /**
   * Parameters for `GanttResizingTooltip` — the before/after duration in days
   * and the signed difference. Returned as params instead of a formatted
   * string so the wording stays in the locale files (`{from} days → {to} days
   * ({delta} d)`); the sign is part of `delta` because the message renders it
   * inline.
   */
  function durationTooltipParams (state: DragState): { from: number, to: number, delta: string } | null {
    let before: number
    let after: number
    if (state.kind === 'resizing-left') {
      before = Math.round((state.originEnd - state.originStart) / DAY_MS) + 1
      after = Math.round((state.originEnd - state.previewStart) / DAY_MS) + 1
    } else if (state.kind === 'resizing-right') {
      before = Math.round((state.originEnd - state.originStart) / DAY_MS) + 1
      after = Math.round((state.previewEnd - state.originStart) / DAY_MS) + 1
    } else {
      return null
    }
    const delta = after - before
    const sign = delta >= 0 ? '+' : '−'
    return { from: before, to: after, delta: `${sign}${Math.abs(delta)}` }
  }

  $: state = $activeDrag ?? idleDrag
  $: geom = originGeometry(state)
  $: gx = guideX(state)
  $: pd = pillDate(state)
  $: tipParams = durationTooltipParams(state)

  // SVG <text> cannot take a Promise child, so the tooltip is resolved
  // asynchronously into a plain string — same pattern as GanttDependencyArrow.
  let tip: string | null = null
  $: void (async () => {
    tip =
      tipParams === null ? null : await translate(tracker.string.GanttResizingTooltip, tipParams, $themeStore.language)
  })()
</script>

{#if state.kind !== 'idle' && state.kind !== 'hover-bar' && geom !== null}
  <!-- Ghost outline at the original geometry. -->
  <rect
    class="ghost"
    x={geom.x}
    y={0}
    width={geom.w}
    height={canvasHeight}
    fill="none"
    stroke="var(--theme-content-color)"
    stroke-width={1}
    stroke-dasharray="4,4"
    opacity={0.3}
    pointer-events="none"
  />
{/if}

{#if gx !== null}
  <line
    class="guide"
    x1={gx}
    x2={gx}
    y1={0}
    y2={canvasHeight}
    stroke="var(--theme-state-info-color, #6366f1)"
    stroke-width={1}
    stroke-dasharray="4,4"
    pointer-events="none"
  />
{/if}

{#if pd !== null && gx !== null}
  <g transform="translate({gx}, 0)" class="date-pill" pointer-events="none">
    <rect x={-44} y={2} width={88} height={18} rx={9} ry={9} fill="var(--theme-state-info-color, #6366f1)" />
    <text x={0} y={15} text-anchor="middle" fill="white" class="date-pill-text">{fmt(pd)}</text>
  </g>
{/if}

{#if tip !== null && gx !== null}
  <g transform="translate({gx}, {canvasHeight - 30})" class="duration-tip" pointer-events="none">
    <rect
      x={-72}
      y={0}
      width={144}
      height={22}
      rx={4}
      ry={4}
      fill="var(--theme-bg-color)"
      stroke="var(--theme-divider-color)"
    />
    <text x={0} y={15} text-anchor="middle" fill="var(--theme-content-color)" class="duration-tip-text">{tip}</text>
  </g>
{/if}

<style lang="scss">
  .date-pill-text {
    font-size: 11px;
    font-weight: 600;
    user-select: none;
  }
  .duration-tip-text {
    font-size: 11px;
    user-select: none;
  }
</style>
