<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type TimeScale } from './lib/time-scale'

  export let timeScale: TimeScale
  export let canvasHeight: number
  // Viewport accepted for API compatibility but no longer needed for visibility
  // (the SVG itself spans the whole canvas, scrollbar clips off-viewport).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let viewport: { left: number; right: number } = { left: 0, right: 0 }
  $: void viewport

  $: today = Date.now()
  $: x = timeScale.toX(today)
  $: visible = true
</script>

{#if visible}
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
{/if}

<style lang="scss">
  .today-line {
    pointer-events: none;
  }
</style>
