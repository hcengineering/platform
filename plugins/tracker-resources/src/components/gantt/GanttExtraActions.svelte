<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { Icon, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { ganttToolbarApi } from './lib/gantt-toolbar-bus'
  import Expand from '@hcengineering/ui/src/components/icons/Expand.svelte'

  // Phase 2.3b + 2.3c — extra actions rendered to the right of the
  // Gantt's date-nav/zoom buttons in IssuesView's header. Split into a
  // separate component so the buttons can be re-ordered or themed
  // independently of the navigation controls.
  $: api = $ganttToolbarApi
</script>

{#if api}
  <div class="gantt-extra-actions">
    <button
      type="button"
      class="action-btn text-btn"
      use:tooltip={{ label: tracker.string.GanttExportPng }}
      on:click={api.exportToPng}
    >
      PNG
    </button>
    <button
      type="button"
      class="action-btn text-btn"
      use:tooltip={{ label: tracker.string.GanttExportPdf }}
      on:click={api.exportToPdf}
    >
      PDF
    </button>
    <button
      type="button"
      class="action-btn icon-btn"
      use:tooltip={{ label: tracker.string.GanttFullscreen }}
      on:click={api.toggleFullscreen}
    >
      <Icon icon={Expand} size="small" />
    </button>
  </div>
{/if}

<style lang="scss">
  .gantt-extra-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 4px;
  }
  .action-btn {
    height: 26px;
    padding: 0;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .action-btn:hover { background: var(--theme-button-hovered); }
  .icon-btn { width: 28px; }
  .text-btn { width: 36px; }
</style>
