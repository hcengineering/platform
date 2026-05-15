<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { Icon, tooltip } from '@hcengineering/ui'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import ArrowLeft from '../icons/ArrowLeft.svelte'
  import ArrowRight from '../icons/ArrowRight.svelte'
  import NavPrev from '../icons/NavPrev.svelte'
  import NavNext from '../icons/NavNext.svelte'
  import Calendar from '../icons/Calendar.svelte'
  import { ganttToolbarApi } from './lib/gantt-toolbar-bus'
  import type { ZoomLevel } from './lib/types'

  // Phase 2 — Gantt toolbar consolidation.
  // Pure UI component. All state + handlers come from the
  // ganttToolbarApi store, which GanttView populates on mount.
  // Renders nothing if no GanttView is currently mounted ($api === null).

  const ZOOM_LEVELS: readonly ZoomLevel[] = ['day', 'week', 'month', 'quarter']

  $: api = $ganttToolbarApi

  function onDateChange (e: Event): void {
    const input = e.currentTarget as HTMLInputElement | null
    if (input != null) api?.jumpToDate(input.value)
  }
</script>

{#if api}
  <div class="gantt-header-controls">
    <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttJumpToStart }} on:click={api.jumpToStart}>
      <Icon icon={ArrowLeft} size="small" />
    </button>
    <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttPreviousPeriod }} on:click={() => api?.pageScroll(-1)}>
      <Icon icon={NavPrev} size="small" />
    </button>
    <button class="nav-btn today-btn" type="button" on:click={api.jumpToToday}>
      <Label label={tracker.string.GanttToday} />
    </button>
    <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttNextPeriod }} on:click={() => api?.pageScroll(1)}>
      <Icon icon={NavNext} size="small" />
    </button>
    <button class="nav-btn icon-btn" type="button" use:tooltip={{ label: tracker.string.GanttJumpToEnd }} on:click={api.jumpToEnd}>
      <Icon icon={ArrowRight} size="small" />
    </button>
    <label class="date-input-wrap" use:tooltip={{ label: tracker.string.GanttJumpToDate }}>
      <Icon icon={Calendar} size="small" />
      <input
        type="date"
        class="date-input"
        value={api.datePickerValue}
        on:change={onDateChange}
      />
    </label>

    <span class="divider" aria-hidden="true" />

    <!-- Zoom segmented control -->
    {#each ZOOM_LEVELS as z (z)}
      <button
        type="button"
        class="zoom-btn"
        class:active={api.zoom === z}
        on:click={() => api?.setZoom(z)}
      >{z[0].toUpperCase() + z.slice(1)}</button>
    {/each}
  </div>
{/if}

<style lang="scss">
  .gantt-header-controls {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .divider {
    width: 1px;
    height: 18px;
    background: var(--theme-divider-color);
    margin: 0 4px;
  }
  .nav-btn {
    height: 26px;
    min-width: 28px;
    padding: 0 10px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
  }
  .nav-btn:hover { background: var(--theme-button-hovered); }
  .today-btn { font-weight: 600; }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .date-input-wrap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    margin-left: 4px;
    padding: 0 6px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    border-radius: 4px;
    cursor: pointer;
  }
  .date-input {
    height: 22px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--theme-content-color);
    font-size: 12px;
    cursor: pointer;
    outline: none;
  }
  .zoom-btn {
    height: 26px;
    padding: 0 12px;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    font-size: 12px;
    cursor: pointer;
  }
  .zoom-btn:first-of-type { border-radius: 4px 0 0 4px; }
  .zoom-btn:last-of-type  { border-radius: 0 4px 4px 0; }
  .zoom-btn:not(:first-of-type) { border-left: none; }
  .zoom-btn:hover { background: var(--theme-button-hovered); }
  .zoom-btn.active {
    background: var(--theme-button-pressed);
    font-weight: 600;
  }
</style>
