<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { writable, type Writable } from 'svelte/store'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import {
    type ArrowVisibility,
    type BarRect,
    type YBounds,
    bezierPath,
    classifyArrowVisibility
  } from './lib/dependency-router'

  const BOTH_VISIBLE: ArrowVisibility = { kind: 'both-visible' }

  function resolveVisibility (
    src: BarRect | null,
    dst: BarRect | null,
    bounds: YBounds | undefined
  ): ArrowVisibility {
    if (bounds === undefined) return BOTH_VISIBLE
    return classifyArrowVisibility(src, dst, bounds)
  }
  import type { DragState } from './lib/types'
  import GanttDependencyArrow from './GanttDependencyArrow.svelte'

  /**
   * Renders the dependency arrows above the bar layer. Subscribes to the
   * shared drag-state writable so the live connector-drawing preview
   * stays in sync with the source bar's connector-dot position and the
   * cursor — same store pattern as GanttResizeOverlay.
   */
  export let relations: IssueRelation[] = []
  export let barRects: Map<string, BarRect> = new Map()
  export let activeDrag: Writable<DragState> = writable({ kind: 'idle' })
  export let connectedIds: Set<Ref<Issue>> = new Set()
  export let hoveredIssue: Ref<Issue> | null = null
  export let hoveredEdge: { source: Ref<Issue>, target: Ref<Issue> } | null = null
  // PR5 critical-path overlay
  export let criticalRelations: Set<Ref<IssueRelation>> = new Set()
  export let violatedRelations: Set<Ref<IssueRelation>> = new Set()
  export let showCriticalPath: boolean = false
  /**
   * Tier-3 Item 5 — Y-axis viewport bounds in canvas-pixel space (same
   * coordinate system as the barRects map above). When `undefined`, every
   * arrow is rendered in full (legacy mode, used by embed previews and
   * fixtures). When set, off-viewport endpoints are clipped to the edge
   * and rendered with a small triangle indicator the user can click to
   * scroll-to-row.
   */
  export let yBounds: YBounds | undefined = undefined

  $: dragState = $activeDrag

  function isDimmed (rel: IssueRelation): boolean {
    // Nothing hovered -> no dimming.
    if (hoveredIssue === null && hoveredEdge === null) return false
    return !(connectedIds.has(rel.attachedTo) && connectedIds.has(rel.target))
  }

  // Inline the live-preview calculation so Svelte's reactivity tracker sees
  // dragState as a direct dependency. Wrapping it in a function hides the
  // dependency (function-indirection bug — same pattern as PR3.1's reactive
  // prop helper fix), so the bezier preview wasn't redrawing as the cursor
  // moved during connector-drag.
  $: live = (dragState.kind === 'connector-drawing' || dragState.kind === 'connector-target-hover')
    ? bezierPath(dragState.originPx, dragState.cursorPx)
    : null
</script>

<g class="gantt-dep-layer">
  {#each relations as rel (rel?._id)}
    {#if rel !== undefined && rel.kind !== undefined}
      {@const src = barRects.get(String(rel.attachedTo)) ?? null}
      {@const dst = barRects.get(String(rel.target)) ?? null}
      {@const visibility = resolveVisibility(src, dst, yBounds)}
      {#if visibility.kind !== 'none'}
        <GanttDependencyArrow
          relation={rel}
          sourceBar={src}
          targetBar={dst}
          dimmed={isDimmed(rel)}
          isCritical={showCriticalPath && criticalRelations.has(rel._id)}
          isViolated={showCriticalPath && violatedRelations.has(rel._id)}
          {visibility}
          {yBounds}
          on:openEditor
          on:hoverEdge
          on:scrollToRow
        />
      {/if}
    {/if}
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
