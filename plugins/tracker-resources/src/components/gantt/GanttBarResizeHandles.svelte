<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  The two 6-px resize handles of a selected bar, rendered as an OVERLAY layer.

  Why they are not part of <GanttBar>: SVG has no z-index — paint order is
  document order, and hit-testing walks the painted stack top-down. The
  dependency layer is painted after the bar layer (arrows have to be visible
  on top of the bars), and every arrow carries an invisible 12-px-wide
  hit-stroke so it stays clickable. An arrow that merely PASSES OVER a
  foreign bar therefore captured the pointerdown meant for that bar's resize
  handle: the event landed on the arrow's path, bubbled to the canvas and was
  interpreted as a chart pan, so the bar never resized.

  Trimming the hit-stroke at both ends (see `bezierHitPath`) only fixes the
  arrow's own endpoints; it cannot help with unrelated bars underneath the
  middle of the curve. The structural fix is to give the handles their own
  layer ABOVE the dependency layer, which is the exact pattern the
  connector-dot overlay in GanttCanvas already uses for the same reason.

  Both handles keep GanttBar's semantics bit-for-bit: same 6 × barH geometry
  centred on the bar edge, same `classifyPointer` gate (phone = read-only,
  touch on tablet/desktop = long-press) and the same `barMouseDown` payload,
  so the drag-controller reducer upstream is unchanged.
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import type { DragTarget } from './lib/types'
  import type { LayoutMode } from '@hcengineering/gantt'
  import { classifyPointer, LONG_PRESS_MS, MOVE_THRESHOLD_PX } from '@hcengineering/gantt'

  /** Left edge of the bar in canvas pixels. */
  export let x: number
  /** Bar width in canvas pixels. */
  export let w: number
  /** Top of the bar body in canvas pixels (already row-relative). */
  export let barY: number
  /** Height of the bar body in canvas pixels. */
  export let barH: number
  export let dragTarget: DragTarget
  export let layoutMode: LayoutMode = 'desktop'

  const dispatch = createEventDispatcher<{
    barMouseDown: { target: DragTarget, edge: 'left' | 'right' | 'body', cursorX: number }
  }>()

  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let longPressStartX = 0
  let longPressStartY = 0
  let longPressPointerId: number | null = null

  function clearLongPressTimer (): void {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    longPressPointerId = null
  }

  onDestroy(clearLongPressTimer)

  function onHandlePointer (edge: 'left' | 'right') {
    return (evt: PointerEvent): void => {
      // Swallow the pointerdown so the canvas-pan handler upstream does not
      // also grab it — same guard the selected bar body applies.
      evt.stopPropagation()
      if (evt.button !== 0) return
      const decision = classifyPointer(layoutMode, evt.pointerType, 'resize')
      if (decision === 'block') return
      if (decision === 'allow') {
        dispatch('barMouseDown', { target: dragTarget, edge, cursorX: evt.clientX })
        evt.preventDefault()
        return
      }
      const startCursorX = evt.clientX
      clearLongPressTimer()
      longPressStartX = evt.clientX
      longPressStartY = evt.clientY
      longPressPointerId = evt.pointerId
      longPressTimer = setTimeout(() => {
        longPressTimer = null
        longPressPointerId = null
        dispatch('barMouseDown', { target: dragTarget, edge, cursorX: startCursorX })
      }, LONG_PRESS_MS)
    }
  }

  function onHandlePointerMove (evt: PointerEvent): void {
    if (longPressTimer === null) return
    if (longPressPointerId !== null && evt.pointerId !== longPressPointerId) return
    const dx = evt.clientX - longPressStartX
    const dy = evt.clientY - longPressStartY
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD_PX) clearLongPressTimer()
  }

  function onHandlePointerEnd (evt: PointerEvent): void {
    if (longPressPointerId !== null && evt.pointerId !== longPressPointerId) return
    clearLongPressTimer()
  }
</script>

<rect
  x={x - 3}
  y={barY}
  width={6}
  height={barH}
  class="bar-resize-handle left"
  on:pointerdown={onHandlePointer('left')}
  on:pointermove={onHandlePointerMove}
  on:pointerup={onHandlePointerEnd}
  on:pointercancel={onHandlePointerEnd}
/>
<rect
  x={x + w - 3}
  y={barY}
  width={6}
  height={barH}
  class="bar-resize-handle right"
  on:pointerdown={onHandlePointer('right')}
  on:pointermove={onHandlePointerMove}
  on:pointerup={onHandlePointerEnd}
  on:pointercancel={onHandlePointerEnd}
/>

<style lang="scss">
  /* Carried over verbatim from GanttBar so the affordance is unchanged: the
     handle itself is invisible and only tints on hover. */
  .bar-resize-handle {
    fill: transparent;
    cursor: ew-resize;
    pointer-events: all;
  }
  .bar-resize-handle:hover {
    fill: color-mix(in srgb, var(--theme-state-info-color, #6366f1) 18%, transparent);
  }
</style>
