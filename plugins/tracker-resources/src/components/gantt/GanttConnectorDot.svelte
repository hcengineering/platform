<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  /**
   * Anchored to the right edge of the source bar (the FS / FF anchor).
   * The canvas overlay reads cx/cy to position both the visible dot and
   * the live bezier endpoint while the user is drawing a new dependency.
   * Permission gating is handled by the caller (GanttCanvas only renders
   * the dot for editable issue rows).
   *
   * Event flow (single path):
   *   <circle class="gantt-connector-hit" on:mousedown> → onDown()
   *     → dispatch('connectorDown', …) (Svelte CustomEvent)
   *     → bubbles up to GanttCanvas on:connectorDown forwarder
   *     → bubbles up to GanttView on:connectorDown handler
   *
   * Earlier drafts had three parallel pathways (template binding,
   * direct addEventListener, document-level capture-phase delegation
   * looking for .closest('.gantt-connector')) plus a synthetic
   * 'gantt-connector-start' CustomEvent. The 30 ms `lastDownAt` debounce
   * was a band-aid for the resulting double-fires. With one source of
   * truth the debounce becomes a no-op but is kept as a defensive guard
   * against the rare browser-double-fire of `mousedown`.
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

  function onDown (evt: MouseEvent): void {
    if (evt.button !== 0) return
    const now = Date.now()
    if (now - lastDownAt < 30) return
    lastDownAt = now
    evt.preventDefault()
    evt.stopPropagation()
    dispatch('connectorDown', { cursorX: evt.clientX, cursorY: evt.clientY })
  }
</script>

<g
  class="gantt-connector"
  data-source-id={sourceId}
  data-source-space={sourceSpace}
>
  <circle
    class="gantt-connector-hit"
    {cx}
    {cy}
    r={hitR}
    fill="transparent"
    data-source-id={sourceId}
    data-source-space={sourceSpace}
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
