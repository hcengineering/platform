<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import type { Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import { type BarRect, bezierPath } from './lib/dependency-router'
  import type { DragState } from './lib/types'
  import GanttDependencyArrow from './GanttDependencyArrow.svelte'

  /**
   * Renders the dependency arrows above the bar layer. Subscribes to the
   * shared drag-state writable so the live connector-drawing preview
   * stays in sync with the source bar's connector-dot position and the
   * cursor — same store pattern as GanttResizeOverlay.
   */
  export let relations: IssueRelation[]
  export let barRects: Map<string, BarRect>
  export let activeDrag: Writable<DragState>
  export let connectedIds: Set<Ref<Issue>>
  export let hoveredIssue: Ref<Issue> | null = null
  export let hoveredEdge: { source: Ref<Issue>, target: Ref<Issue> } | null = null

  $: dragState = $activeDrag

  function isDimmed (rel: IssueRelation): boolean {
    // Nothing hovered -> no dimming.
    if (hoveredIssue === null && hoveredEdge === null) return false
    return !(connectedIds.has(rel.attachedTo) && connectedIds.has(rel.target))
  }

  function livePath (): string | null {
    if (dragState.kind !== 'connector-drawing' && dragState.kind !== 'connector-target-hover') return null
    return bezierPath(dragState.originPx, dragState.cursorPx)
  }
  $: live = livePath()
</script>

<g class="gantt-dep-layer">
  {#each relations as rel (rel._id)}
    {@const src = barRects.get(String(rel.attachedTo)) ?? null}
    {@const dst = barRects.get(String(rel.target)) ?? null}
    <GanttDependencyArrow
      relation={rel}
      sourceBar={src}
      targetBar={dst}
      dimmed={isDimmed(rel)}
      on:openEditor
      on:hoverEdge
    />
  {/each}

  {#if live !== null}
    <!-- Live connector preview while drawing. Dashed when no target,
         solid when over a candidate target. -->
    <path
      d={live}
      class="live-connector"
      class:targeting={dragState.kind === 'connector-target-hover'}
      stroke="#94a3b8"
      stroke-width={1.5}
      fill="none"
      pointer-events="none"
    />
  {/if}
</g>

<style lang="scss">
  :global(svg.gantt-canvas .live-connector) {
    stroke-dasharray: 5,4;
  }
  :global(svg.gantt-canvas .live-connector.targeting) {
    /* "0" is the canonical "no dash" reset; "none" is not a valid value
       for stroke-dasharray and browsers fall back silently. */
    stroke-dasharray: 0;
    stroke: #475569;
  }
</style>
