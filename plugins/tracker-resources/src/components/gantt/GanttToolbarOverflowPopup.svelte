<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<!--
  "…" popover holding the Gantt-toolbar tiers that did not fit into the
  SpaceHeader row. Reads the live snapshot store directly (rather than taking
  the tiers' state as props) so the controls keep working — and keep showing
  current values — while the popup is open.
-->
<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import GanttToolbarTiers from './GanttToolbarTiers.svelte'
  import { ganttToolbarSnapshot } from './ganttToolbarStore'
  import type { ToolbarTier } from '@hcengineering/gantt'

  export let tiers: readonly ToolbarTier[] = []
</script>

<div class="gantt-tb-overflow-popup">
  <div class="gantt-tb-overflow-title"><Label label={tracker.string.GanttToolbarMore} /></div>
  {#if $ganttToolbarSnapshot != null}
    <GanttToolbarTiers snap={$ganttToolbarSnapshot} {tiers} vertical />
  {/if}
</div>

<style lang="scss">
  .gantt-tb-overflow-popup {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-1);
    padding: var(--spacing-2);
    min-width: 14rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
  }
  .gantt-tb-overflow-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-dark-color);
  }
</style>
