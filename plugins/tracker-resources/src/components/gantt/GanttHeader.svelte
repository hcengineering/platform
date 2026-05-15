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

<!--
  Two-row header: primary tick label (day / week / month / quarter) on the
  bottom row, supra-label (month / year) on the top row. The supra-label
  appears only on ticks where the segment changes (1st of month for day-zoom,
  first week of year for week-zoom, January for month-zoom, Q1 for
  quarter-zoom) — set by time-scale.ts. User feedback 2026-05-11.
-->
<svg
  class="gantt-header"
  width={totalWidth}
  {height}
  viewBox="0 0 {totalWidth} {height}"
  preserveAspectRatio="none"
>
  <!-- Divider line between supra row and primary row. -->
  <line
    x1={0}
    x2={totalWidth}
    y1={height / 2}
    y2={height / 2}
    stroke="var(--theme-divider-color)"
    stroke-width={0.5}
  />
  {#each ticks as tick (tick.date)}
    {@const x = timeScale.toX(tick.date)}
    <!-- Vertical gridline: short tick on the primary row by default; full
         height on segment-boundaries (when there's a secondary label) to
         visually anchor the supra-label to its column. -->
    <line
      x1={x}
      x2={x}
      y1={tick.secondaryLabel !== undefined ? 0 : height / 2}
      y2={height}
      stroke="var(--theme-divider-color)"
      stroke-width={tick.level === 'major' ? 1.5 : 0.5}
    />
    {#if tick.secondaryLabel !== undefined}
      <text
        x={x + 4}
        y={height / 2 - 4}
        class="tick-label tick-label-secondary"
        fill="var(--theme-content-color)"
      >
        {tick.secondaryLabel}
      </text>
    {/if}
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
    font-size: 12px;
    user-select: none;
    pointer-events: none;
  }
  .tick-label-major {
    font-weight: 600;
  }
  .tick-label-secondary {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.7;
  }
</style>
