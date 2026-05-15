<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type Issue } from '@hcengineering/tracker'
  import { type TimeScale } from './lib/time-scale'

  export let issue: Issue
  export let row: { y: number; height: number }
  export let timeScale: TimeScale
  export let isSummary: boolean = false
  export let summaryRange: { startDate: number | null; dueDate: number | null } | null = null

  $: effectiveStart = isSummary ? summaryRange?.startDate ?? issue.startDate : issue.startDate
  $: effectiveDue = isSummary ? summaryRange?.dueDate ?? issue.dueDate : issue.dueDate
  $: visible = effectiveStart !== null && effectiveDue !== null
  $: startVal = (effectiveStart ?? 0) as number
  $: dueVal = (effectiveDue ?? 0) as number
  $: x = visible ? timeScale.toX(startVal) : 0
  $: x2 = visible ? timeScale.toX(dueVal) : 0
  $: w = Math.max(2, x2 - x + timeScale.pxPerDay) // inclusive duration: see spec §8.0
  $: tooltipText = visible
    ? `${issue.title} (${new Date(startVal).toISOString().slice(0, 10)} → ${new Date(dueVal).toISOString().slice(0, 10)})`
    : ''
</script>

{#if visible}
  {@const barY = row.y + 6}
  {@const barH = row.height - 12}
  {#if isSummary}
    <!-- MS-Project-style claw: thin black bar with downward triangles at both ends -->
    <line
      x1={x + 1}
      x2={x + w - 1}
      y1={barY + barH / 2}
      y2={barY + barH / 2}
      stroke="var(--theme-content-color)"
      stroke-width={3}
    />
    <polygon
      points="{x},{barY + barH / 2 - 1} {x + 6},{barY + barH / 2 - 1} {x + 3},{barY + barH / 2 + 5}"
      fill="var(--theme-content-color)"
    />
    <polygon
      points="{x + w - 6},{barY + barH / 2 - 1} {x + w},{barY + barH / 2 - 1} {x + w - 3},{barY + barH / 2 + 5}"
      fill="var(--theme-content-color)"
    />
  {:else}
    <rect
      x={x}
      y={barY}
      width={w}
      height={barH}
      rx={3}
      ry={3}
      fill="var(--theme-button-default)"
      stroke="var(--theme-button-border)"
      stroke-width={1}
      class="bar"
    />
    <title>{tooltipText}</title>
  {/if}
{/if}

<style lang="scss">
  .bar {
    transition: filter 120ms ease;
  }
  .bar:hover {
    filter: brightness(1.1);
  }
</style>
