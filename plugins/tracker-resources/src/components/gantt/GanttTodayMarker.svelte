<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type TimeScale } from './lib/time-scale'

  export let timeScale: TimeScale
  export let canvasHeight: number
  export let viewport: { left: number; right: number }

  $: today = Date.now()
  $: x = timeScale.toX(today)
  $: visible = x >= viewport.left && x <= viewport.right
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
