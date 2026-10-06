<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import GanttToolbarTiers from './GanttToolbarTiers.svelte'
  import { ganttToolbarSnapshot } from './ganttToolbarStore'
</script>

<div class="gantt-view-settings-popup">
  <div class="gantt-view-settings-title"><Label label={view.string.View} /></div>
  {#if $ganttToolbarSnapshot != null}
    <GanttToolbarTiers snap={$ganttToolbarSnapshot} tiers={['group', 'color']} vertical />
  {/if}
</div>

<style lang="scss">
  .gantt-view-settings-popup {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
    min-width: 14rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
  }

  .gantt-view-settings-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-dark-color);
  }
</style>
