<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  /**
   * Anchored to the right edge of the source bar (the FS / FF anchor). The
   * canvas overlay layer reads cx/cy to position both the dot and the live
   * bezier endpoint while the user is drawing a new dependency. Mounted by
   * GanttBar (see Task 14) when the bar is hovered AND editable, so the
   * permission gate is handled by the caller.
   */
  export let cx: number
  export let cy: number
  export let r: number = 5

  const dispatch = createEventDispatcher<{
    connectorDown: { cursorX: number, cursorY: number }
  }>()

  function onDown (evt: PointerEvent): void {
    if (evt.button !== 0) return
    evt.preventDefault()
    evt.stopPropagation()
    dispatch('connectorDown', { cursorX: evt.clientX, cursorY: evt.clientY })
  }
</script>

<circle
  class="gantt-connector-dot"
  {cx}
  {cy}
  {r}
  fill="#6366f1"
  stroke="#ffffff"
  stroke-width={1.5}
  on:pointerdown={onDown}
  on:click|stopPropagation={() => {}}
/>

<style lang="scss">
  :global(svg.gantt-canvas .gantt-connector-dot) {
    cursor: crosshair;
    filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.4));
  }
  :global(svg.gantt-canvas .gantt-connector-dot:hover) {
    fill: #4f46e5;
  }
</style>
