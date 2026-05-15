<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import {
    type ArrowVisibility,
    type BarRect,
    type YBounds,
    anchorOf,
    arrowheadPoints,
    bezierPath,
    clippedEndpointPx,
    endpointPx,
    pathMidpoint
  } from './lib/dependency-router'
  import { kindCode, signedLag } from './lib/predecessor-format'
  import { translate } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/ui'
  import tracker from '../../plugin'

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
  // PR5 critical-path overlay
  export let isCritical: boolean = false
  export let isViolated: boolean = false
  /**
   *  — visibility classification from the dependency-layer.
   * When kind !== 'both-visible', one or both endpoints are off-screen
   * and the arrow is drawn to / from a synthetic indicator endpoint at
   * the viewport edge.
   */
  export let visibility: ArrowVisibility = { kind: 'both-visible' }
  export let yBounds: YBounds | undefined = undefined

  // Critical-relation visual: solid red. Violated-relation visual:
  // red dashed with '!' hint via title tooltip (Spec §5.4). Violated
  // wins over critical when both are true.
  $: arrowStroke = isViolated || isCritical ? 'var(--theme-state-negative-color)' : 'var(--theme-state-regular-color)'
  $: arrowStrokeWidth = isViolated || isCritical ? 2 : 1.5
  $: arrowDash = isViolated ? '4 2' : 'none'

  const dispatch = createEventDispatcher<{
    openEditor: { relation: IssueRelation }
    hoverEdge: { source: Ref<Issue>, target: Ref<Issue> } | null
    scrollToRow: { issue: Ref<Issue> }
  }>()

  $: sourceAnchor = anchorOf(relation.kind, 'source')
  $: targetAnchor = anchorOf(relation.kind, 'target')
  // Resolve endpoints. When the visibility classification reports a clipped
  // side, swap that side's endpoint for the synthetic edge-anchor point so
  // the bezier ends at the viewport edge instead of off-screen.
  $: p1 = (() => {
    if (sourceBar === null) return null
    if (yBounds !== undefined && visibility.kind === 'target-only') {
      return clippedEndpointPx(sourceBar, sourceAnchor, yBounds, visibility.sourceEdge)
    }
    if (yBounds !== undefined && visibility.kind === 'both-off') {
      return clippedEndpointPx(sourceBar, sourceAnchor, yBounds, visibility.sourceEdge)
    }
    return endpointPx(sourceBar, sourceAnchor)
  })()
  $: p2 = (() => {
    if (targetBar === null) return null
    if (yBounds !== undefined && visibility.kind === 'source-only') {
      return clippedEndpointPx(targetBar, targetAnchor, yBounds, visibility.targetEdge)
    }
    if (yBounds !== undefined && visibility.kind === 'both-off') {
      return clippedEndpointPx(targetBar, targetAnchor, yBounds, visibility.targetEdge)
    }
    return endpointPx(targetBar, targetAnchor)
  })()
  $: path = p1 !== null && p2 !== null ? bezierPath(p1, p2) : null
  $: mid = p1 !== null && p2 !== null ? pathMidpoint(p1, p2) : null
  $: head = p1 !== null && p2 !== null ? arrowheadPoints(p1, p2) : null
  $: pillText = `${kindCode(relation.kind)}${signedLag(relation.lag)}`
  $: pillWidth = Math.max(28, pillText.length * 6 + 8)
  // Off-viewport indicator endpoints — small triangle at the clipped edge.
  // Only rendered when the corresponding endpoint is actually clipped.
  $: sourceIndicator = (yBounds !== undefined && (visibility.kind === 'target-only' || visibility.kind === 'both-off'))
    ? p1
    : null
  $: targetIndicator = (yBounds !== undefined && (visibility.kind === 'source-only' || visibility.kind === 'both-off'))
    ? p2
    : null
  // Which y-edge each indicator points to (▲ for top, ▼ for bottom).
  $: sourceIndicatorEdge = (visibility.kind === 'target-only')
    ? visibility.sourceEdge
    : (visibility.kind === 'both-off' ? visibility.sourceEdge : null)
  $: targetIndicatorEdge = (visibility.kind === 'source-only')
    ? visibility.targetEdge
    : (visibility.kind === 'both-off' ? visibility.targetEdge : null)

  function onSourceIndicator (evt: MouseEvent): void {
    if (evt.button !== 0) return
    evt.preventDefault()
    evt.stopPropagation()
    dispatch('scrollToRow', { issue: relation.attachedTo })
  }
  function onTargetIndicator (evt: MouseEvent): void {
    if (evt.button !== 0) return
    evt.preventDefault()
    evt.stopPropagation()
    dispatch('scrollToRow', { issue: relation.target })
  }

  // Resolve the indicator-tooltip strings asynchronously. Falls back to a
  // ASCII glyph during the first paint frame — Huly's translate() returns
  // a Promise, but <title> SVG elements don't accept Promise children.
  let sourceTitle: string = ''
  let targetTitle: string = ''
  $: void (async () => {
    if (sourceIndicatorEdge !== null) {
      const key = sourceIndicatorEdge === 'top'
        ? tracker.string.GanttArrowIndicatorSourceAbove
        : tracker.string.GanttArrowIndicatorSourceBelow
      sourceTitle = await translate(key, {}, $themeStore.language)
    } else {
      sourceTitle = ''
    }
  })()
  $: void (async () => {
    if (targetIndicatorEdge !== null) {
      const key = targetIndicatorEdge === 'top'
        ? tracker.string.GanttArrowIndicatorTargetAbove
        : tracker.string.GanttArrowIndicatorTargetBelow
      targetTitle = await translate(key, {}, $themeStore.language)
    } else {
      targetTitle = ''
    }
  })()

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
    <path d={path} class="curve" class:critical={isCritical} class:violated={isViolated}
      stroke={arrowStroke} stroke-width={arrowStrokeWidth} stroke-dasharray={arrowDash}
      fill="none" pointer-events="none" />
    <polygon
      points={`${head[0].x},${head[0].y} ${head[1].x},${head[1].y} ${head[2].x},${head[2].y}`}
      class="arrowhead"
      class:critical={isCritical}
      class:violated={isViolated}
      fill={arrowStroke}
      pointer-events="none"
    />
    {#if signedLag(relation.lag) !== '' && visibility.kind === 'both-visible'}
      <!-- Lag pill at the curve midpoint. Same click handler as the curve.
           Suppressed when either endpoint is clipped — pill at viewport
           edge is visually noisy and ambiguous. -->
      <g
        class="lag-pill"
        transform={`translate(${mid.x - pillWidth / 2}, ${mid.y - 8})`}
        on:click={onOpen}
      >
        <rect width={pillWidth} height={16} rx={8} ry={8}
          fill="var(--theme-bg-color)" stroke="var(--theme-state-regular-color)" stroke-width={1} />
        <text x={pillWidth / 2} y={11} text-anchor="middle" class="lag-pill-text">{pillText}</text>
      </g>
    {/if}
    {#if sourceIndicator !== null && sourceIndicatorEdge !== null}
      <!--  — off-viewport indicator pointing at the source bar
           which is above (▲) or below (▼) the visible band. Click scrolls
           to the source row. -->
      <polygon
        class="dep-indicator"
        points={sourceIndicatorEdge === 'top'
          ? `${sourceIndicator.x - 5},${sourceIndicator.y + 8} ${sourceIndicator.x + 5},${sourceIndicator.y + 8} ${sourceIndicator.x},${sourceIndicator.y}`
          : `${sourceIndicator.x - 5},${sourceIndicator.y - 8} ${sourceIndicator.x + 5},${sourceIndicator.y - 8} ${sourceIndicator.x},${sourceIndicator.y}`}
        fill={arrowStroke}
        opacity={0.85}
        on:click={onSourceIndicator}
      >
        <title>{sourceTitle}</title>
      </polygon>
    {/if}
    {#if targetIndicator !== null && targetIndicatorEdge !== null}
      <!--  — off-viewport indicator pointing at the target bar
           which is above (▲) or below (▼) the visible band. Click scrolls
           to the target row. -->
      <polygon
        class="dep-indicator"
        points={targetIndicatorEdge === 'top'
          ? `${targetIndicator.x - 5},${targetIndicator.y + 8} ${targetIndicator.x + 5},${targetIndicator.y + 8} ${targetIndicator.x},${targetIndicator.y}`
          : `${targetIndicator.x - 5},${targetIndicator.y - 8} ${targetIndicator.x + 5},${targetIndicator.y - 8} ${targetIndicator.x},${targetIndicator.y}`}
        fill={arrowStroke}
        opacity={0.85}
        on:click={onTargetIndicator}
      >
        <title>{targetTitle}</title>
      </polygon>
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
  :global(svg.gantt-canvas .gantt-dep-arrow:hover .curve) { stroke: var(--theme-content-color); }
  :global(svg.gantt-canvas .gantt-dep-arrow:hover .arrowhead) { fill: var(--theme-content-color); }
  :global(svg.gantt-canvas .lag-pill-text) {
    font-size: 10px;
    font-weight: 600;
    fill: var(--theme-content-color);
    user-select: none;
    pointer-events: none;
  }
  :global(svg.gantt-canvas .dep-indicator) {
    cursor: pointer;
    transition: opacity 120ms ease;
  }
  :global(svg.gantt-canvas .dep-indicator:hover) {
    opacity: 1 !important;
  }
</style>
