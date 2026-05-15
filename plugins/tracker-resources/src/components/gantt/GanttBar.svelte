<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import type { TimeScale } from './lib/time-scale'

  // Bar is rendered for both Issues and synthetic milestone summaries; the
  // structural subset below is all the bar geometry needs.
  export let issue: { title: string; startDate: number | null; dueDate: number | null }
  export let row: { y: number; height: number }
  export let timeScale: TimeScale
  export let isSummary: boolean = false
  export let summaryRange: { startDate: number | null; dueDate: number | null } | null = null

  $: effectiveStart = isSummary ? summaryRange?.startDate ?? issue.startDate : issue.startDate
  $: effectiveDue = isSummary ? summaryRange?.dueDate ?? issue.dueDate : issue.dueDate
  $: visible = effectiveStart !== null && effectiveDue !== null
  $: rawStart = (effectiveStart ?? 0) as number
  $: rawDue = (effectiveDue ?? 0) as number
  // Normalise reversed ranges (start > due): render the bar across [min, max]
  // rather than collapsing to a 2px sliver at the start. Tooltip mirrors the
  // visual order so the user sees the same range that's drawn.
  $: startVal = Math.min(rawStart, rawDue)
  $: dueVal = Math.max(rawStart, rawDue)
  $: x = visible ? timeScale.toX(startVal) : 0
  $: x2 = visible ? timeScale.toX(dueVal) : 0
  $: w = Math.max(2, x2 - x + timeScale.pxPerDay) // inclusive duration: see spec §8.0
  $: tooltipText = visible
    ? `${issue.title} (${new Date(startVal).toISOString().slice(0, 10)} → ${new Date(dueVal).toISOString().slice(0, 10)})`
    : ''
  // Heuristic: ~7.5px per character at 13px font — leave breathing room.
  const CHAR_PX = 7.5
  $: maxChars = Math.floor((w - 12) / CHAR_PX)
  $: barLabel = maxChars >= 4
    ? (issue.title.length > maxChars ? issue.title.slice(0, Math.max(1, maxChars - 1)) + '…' : issue.title)
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
    {#if barLabel !== ''}
      <text
        x={x + 10}
        y={barY + barH / 2 - 4}
        class="bar-label summary-label"
        fill="var(--theme-content-color)"
      >{barLabel}</text>
    {/if}
    <title>{tooltipText}</title>
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
    {#if barLabel !== ''}
      <text
        x={x + 6}
        y={barY + barH / 2 + 4}
        class="bar-label"
        fill="var(--theme-content-color)"
      >{barLabel}</text>
    {/if}
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
  .bar-label {
    font-size: 13px;
    user-select: none;
    pointer-events: none;
    dominant-baseline: alphabetic;
  }
  .summary-label {
    font-weight: 600;
  }
</style>
