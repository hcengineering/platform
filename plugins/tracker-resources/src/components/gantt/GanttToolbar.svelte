<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { Button } from '@hcengineering/ui'
  import { type IntlString } from '@hcengineering/platform'
  import tracker from '../../plugin'
  import { type ZoomLevel } from './lib/types'

  /** Two-way bound by the parent — Svelte's `bind:zoom` propagates updates. */
  export let zoom: ZoomLevel = 'week'

  const labels: Record<ZoomLevel, IntlString> = {
    day: tracker.string.Day,
    week: tracker.string.Week,
    month: tracker.string.Month,
    quarter: tracker.string.Quarter
  }

  const order: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
</script>

<div class="gantt-toolbar">
  {#each order as z}
    <Button
      kind={z === zoom ? 'primary' : 'ghost'}
      size="small"
      label={labels[z]}
      on:click={() => {
        zoom = z
      }}
    />
  {/each}
</div>

<style lang="scss">
  .gantt-toolbar {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 4px 8px;
    border-bottom: 1px solid var(--theme-divider-color);
    background: var(--theme-comp-header-color);
  }
</style>
