<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import {
    type BarRect,
    anchorOf,
    arrowheadPoints,
    bezierPath,
    endpointPx,
    pathMidpoint
  } from './lib/dependency-router'
  import { kindCode, signedLag } from './lib/predecessor-format'

  /**
   * One bezier arrow per IssueRelation. Endpoints come from anchorOf() so
   * FS/SS/FF/SF all attach to the right corners of source / target bars.
   * Hover and click both bubble up; GanttView owns the hover-state and
   * the popup-mount, mirroring how PR3 owns selectedIssueId.
   */
  export let relation: IssueRelation
  export let sourceBar: BarRect | null
  export let targetBar: BarRect | null
  export let dimmed: boolean = false

  const dispatch = createEventDispatcher<{
    openEditor: { relation: IssueRelation }
    hoverEdge: { source: Ref<Issue>, target: Ref<Issue> } | null
  }>()

  $: sourceAnchor = anchorOf(relation.kind, 'source')
  $: targetAnchor = anchorOf(relation.kind, 'target')
  $: p1 = sourceBar !== null ? endpointPx(sourceBar, sourceAnchor) : null
  $: p2 = targetBar !== null ? endpointPx(targetBar, targetAnchor) : null
  $: path = p1 !== null && p2 !== null ? bezierPath(p1, p2) : null
  $: mid = p1 !== null && p2 !== null ? pathMidpoint(p1, p2) : null
  $: head = p1 !== null && p2 !== null ? arrowheadPoints(p1, p2) : null
  $: pillText = `${kindCode(relation.kind)}${signedLag(relation.lag)}`
  $: pillWidth = Math.max(28, pillText.length * 6 + 8)

  function onOpen (evt: MouseEvent): void {
    if (evt.button !== 0) return
    evt.preventDefault()
    evt.stopPropagation()
    dispatch('openEditor', { relation })
  }
  function onEnter (): void {
    dispatch('hoverEdge', { source: relation.attachedTo, target: relation.target })
  }
  function onLeave (): void {
    dispatch('hoverEdge', null)
  }
</script>

{#if path !== null && head !== null && mid !== null}
  <g
    class="gantt-dep-arrow"
    class:dimmed
    on:mouseenter={onEnter}
    on:mouseleave={onLeave}
  >
    <!-- Invisible wider stroke for an easier click target -->
    <path d={path} stroke="transparent" stroke-width={12} fill="none" on:click={onOpen} />
    <path d={path} class="curve" stroke="#94a3b8" stroke-width={1.5} fill="none" pointer-events="none" />
    <polygon
      points={`${head[0].x},${head[0].y} ${head[1].x},${head[1].y} ${head[2].x},${head[2].y}`}
      class="arrowhead"
      fill="#94a3b8"
      pointer-events="none"
    />
    {#if signedLag(relation.lag) !== '' }
      <!-- Lag pill at the curve midpoint. Same click handler as the curve. -->
      <g
        class="lag-pill"
        transform={`translate(${mid.x - pillWidth / 2}, ${mid.y - 8})`}
        on:click={onOpen}
      >
        <rect width={pillWidth} height={16} rx={8} ry={8}
          fill="#ffffff" stroke="#94a3b8" stroke-width={1} />
        <text x={pillWidth / 2} y={11} text-anchor="middle" class="lag-pill-text">{pillText}</text>
      </g>
    {/if}
  </g>
{/if}

<style lang="scss">
  .gantt-dep-arrow.dimmed {
    opacity: 0.4;
    transition: opacity 120ms ease;
  }
  :global(svg.gantt-canvas .gantt-dep-arrow path),
  :global(svg.gantt-canvas .gantt-dep-arrow polygon),
  :global(svg.gantt-canvas .gantt-dep-arrow .lag-pill) {
    cursor: pointer;
  }
  :global(svg.gantt-canvas .gantt-dep-arrow:hover .curve) { stroke: #475569; }
  :global(svg.gantt-canvas .gantt-dep-arrow:hover .arrowhead) { fill: #475569; }
  :global(svg.gantt-canvas .lag-pill-text) {
    font-size: 10px;
    font-weight: 600;
    fill: #475569;
    user-select: none;
    pointer-events: none;
  }
</style>
