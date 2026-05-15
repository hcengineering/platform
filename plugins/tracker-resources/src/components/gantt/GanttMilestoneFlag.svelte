<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type TimeScale } from './lib/time-scale'
  import { type MilestoneMarker } from './lib/types'

  export let milestone: MilestoneMarker
  export let timeScale: TimeScale
  export let canvasHeight: number
  export let viewport: { left: number; right: number }
  export let labelStripHeight: number = 20

  $: x = timeScale.toX(milestone.targetDate)
  $: visible = x >= viewport.left - 16 && x <= viewport.right + 16
</script>

{#if visible}
  <line
    x1={x}
    x2={x}
    y1={labelStripHeight}
    y2={canvasHeight}
    stroke="var(--theme-state-info-color, #6366f1)"
    stroke-width={1}
    stroke-dasharray="3 3"
    opacity={0.5}
  />
  <polygon
    points="{x - 6},{labelStripHeight - 6} {x + 6},{labelStripHeight - 6} {x},{labelStripHeight + 6}"
    fill="var(--theme-state-info-color, #6366f1)"
  >
    <title>{milestone.label}</title>
  </polygon>
  <text
    x={x + 9}
    y={labelStripHeight - 2}
    class="milestone-label"
    fill="var(--theme-state-info-color, #6366f1)"
  >
    {milestone.label}
  </text>
{/if}

<style lang="scss">
  .milestone-label {
    font-size: 11px;
    font-weight: 500;
    user-select: none;
    pointer-events: none;
  }
</style>
