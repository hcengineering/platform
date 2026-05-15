<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  /**
   * Anchored to the right edge of the source bar (the FS / FF anchor). The
   * canvas overlay layer reads cx/cy to position both the dot and the live
   * bezier endpoint while the user is drawing a new dependency. Mounted by
   * GanttBar (see Task 14) when the bar is hovered AND editable, so the
   * permission gate is handled by the caller.
   */
  export let cx: number
  export let cy: number
  export let sourceId: string
  export let sourceSpace: string
  export let r: number = 5
  export let hitR: number = 12

  const dispatch = createEventDispatcher<{
    connectorDown: { cursorX: number, cursorY: number }
  }>()

  let lastDownAt = 0
  let hitCircle: SVGCircleElement | null = null

  function onDown (evt: PointerEvent | MouseEvent): void {
    if (evt.button !== 0) return
    const now = Date.now()
    if (now - lastDownAt < 30) return
    lastDownAt = now
    evt.preventDefault()
    dispatch('connectorDown', { cursorX: evt.clientX, cursorY: evt.clientY })
    hitCircle?.dispatchEvent(new CustomEvent('gantt-connector-start', {
      bubbles: true,
      composed: true,
      detail: {
        sourceId,
        sourceSpace,
        originPx: { x: cx, y: cy }
      }
    }))
  }

  onMount(() => {
    if (hitCircle === null) return
    hitCircle.addEventListener('pointerdown', onDown)
    hitCircle.addEventListener('mousedown', onDown)
  })

  onDestroy(() => {
    if (hitCircle === null) return
    hitCircle.removeEventListener('pointerdown', onDown)
    hitCircle.removeEventListener('mousedown', onDown)
  })
</script>

<g
  class="gantt-connector"
  data-source-id={sourceId}
  data-source-space={sourceSpace}
  on:pointerdown={onDown}
  on:mousedown={onDown}
  on:click|stopPropagation={() => {}}
>
  <circle
    bind:this={hitCircle}
    class="gantt-connector-hit"
    {cx}
    {cy}
    r={hitR}
    fill="transparent"
    data-source-id={sourceId}
    data-source-space={sourceSpace}
    on:pointerdown={onDown}
    on:mousedown={onDown}
  />
  <circle
    class="gantt-connector-dot"
    {cx}
    {cy}
    {r}
    fill="#6366f1"
    stroke="#ffffff"
    stroke-width={1.5}
    pointer-events="none"
    on:pointerdown={onDown}
    on:mousedown={onDown}
  />
</g>

<style lang="scss">
  :global(svg.gantt-canvas .gantt-connector) {
    cursor: crosshair;
    pointer-events: all;
  }
  :global(svg.gantt-canvas .gantt-connector-hit) {
    pointer-events: all;
  }
  :global(svg.gantt-canvas .gantt-connector-dot) {
    filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.4));
  }
  :global(svg.gantt-canvas .gantt-connector:hover .gantt-connector-dot) {
    fill: #4f46e5;
  }
</style>
