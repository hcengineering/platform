<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { type TimeScale } from './lib/time-scale'

  export let timeScale: TimeScale
  export let canvasHeight: number
  // Viewport accepted for API compatibility but no longer used for clipping
  // (the SVG itself spans the whole canvas so the browser handles overflow).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let viewport: { left: number; right: number } = { left: 0, right: 0 }
  $: void viewport

  $: today = Date.now()
  $: x = timeScale.toX(today)
  $: dateLabel = new Date(today).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
</script>

<line
  x1={x}
  x2={x}
  y1={0}
  y2={canvasHeight}
  stroke="var(--theme-state-warning-color, #dc2626)"
  stroke-width={1}
  stroke-dasharray="0"
  class="today-line"
/>
<!-- Date-pill label at the top of the today line -->
<g transform="translate({x},0)" class="today-label">
  <rect x={-22} y={2} width={44} height={16} rx={8} ry={8}
    fill="var(--theme-state-warning-color, #dc2626)" />
  <text x={0} y={13} text-anchor="middle"
    fill="white" class="today-label-text">{dateLabel}</text>
</g>

<style lang="scss">
  .today-line {
    pointer-events: none;
  }
  .today-label {
    pointer-events: none;
  }
  .today-label-text {
    font-size: 10px;
    font-weight: 600;
    user-select: none;
  }
</style>
