<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type TimeScale } from './lib/time-scale'

  export let timeScale: TimeScale
  export let viewport: { left: number; right: number }   // px
  export let height: number = 32

  $: visibleRange = [
    timeScale.fromX(viewport.left),
    timeScale.fromX(viewport.right)
  ] as [number, number]

  $: ticks = timeScale.ticks(visibleRange)
</script>

<svg
  class="gantt-header"
  width={viewport.right - viewport.left}
  {height}
  viewBox="{viewport.left} 0 {viewport.right - viewport.left} {height}"
  preserveAspectRatio="none"
>
  {#each ticks as tick (tick.date)}
    {@const x = timeScale.toX(tick.date)}
    <line
      x1={x}
      x2={x}
      y1={0}
      y2={height}
      stroke="var(--theme-divider-color)"
      stroke-width={tick.level === 'major' ? 1.5 : 0.5}
    />
    <text
      x={x + 4}
      y={height - 8}
      class="tick-label tick-label-{tick.level}"
      fill="var(--theme-content-color)"
    >
      {tick.label}
    </text>
  {/each}
</svg>

<style lang="scss">
  .gantt-header {
    display: block;
    background: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .tick-label {
    font-family: var(--mono-font, monospace);
    font-size: 11px;
    user-select: none;
    pointer-events: none;
  }
  .tick-label-major {
    font-weight: 600;
  }
</style>
