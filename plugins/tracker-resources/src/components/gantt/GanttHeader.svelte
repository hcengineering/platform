<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { type TimeScale } from './lib/time-scale'

  export let timeScale: TimeScale
  export let viewport: { left: number; right: number }   // px
  export let totalWidth: number
  export let height: number = 36

  // Filter ticks to viewport for performance, but render the SVG at full
  // canvas width so the sticky-header lives in the same coordinate system
  // as the canvas-stack (review note: SVG must extend across the whole
  // scroll content, not just the visible viewport).
  $: visibleRange = [
    timeScale.fromX(Math.max(0, viewport.left - 100)),
    timeScale.fromX(viewport.right + 100)
  ] as [number, number]
  $: ticks = timeScale.ticks(visibleRange)
</script>

<svg
  class="gantt-header"
  width={totalWidth}
  {height}
  viewBox="0 0 {totalWidth} {height}"
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
      y={height - 10}
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
    font-size: 12px;
    user-select: none;
    pointer-events: none;
  }
  .tick-label-major {
    font-weight: 600;
  }
</style>
