<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<!--
  The Gantt toolbar's controls, grouped into the tiers the overflow logic
  collapses (see `lib/toolbar-overflow.ts`).

  Two consumers render this component:
    * GanttToolbarBar — the inline cluster in the SpaceHeader's second row,
      passing the tiers that currently fit.
    * GanttToolbarOverflowPopup — the "…" popover, passing the tiers that do
      not, stacked vertically.

  Extracting the markup here is what keeps the two renderings from drifting
  apart, and it avoids a circular import between the bar and its popup.

  Unlike the old inline markup this component renders in NATURAL visual order
  (left to right). The bar wraps it in its own flex row, so the `row-reverse`
  of the surrounding `.hulyHeader-buttonsGroup.search` no longer leaks into
  the toolbar's own markup order.
-->
<script lang="ts">
  import {
    DropdownLabelsIntl,
    EditBox,
    Icon,
    IconCalendar,
    IconJumpToEnd,
    IconJumpToStart,
    IconNavNext,
    IconNavPrev,
    IconRedo,
    IconUndo,
    Label,
    tooltip
  } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { GROUP_BY_KEYS } from './lib/group-by'
  import type { ToolbarTier } from '@hcengineering/gantt'
  import type { GanttToolbarSnapshot } from './ganttToolbarStore'

  const COLOR_BY_KEYS = ['status', 'priority', 'assignee', 'component', 'milestone', 'none'] as const

  export let snap: GanttToolbarSnapshot
  /** Tiers to render, in visual order. */
  export let tiers: readonly ToolbarTier[] = []
  /** Stack the tiers vertically — used by the "…" popover. */
  export let vertical: boolean = false

  // Constants — kept identical to GanttView so the input widget validates
  // the same range whether the user types in the toolbar or hits D/W/M/Q.
  const MIN_VISIBLE_DAYS = 1
  const MAX_VISIBLE_DAYS = 365

  // Wrapper handlers so template expressions stay assignment-free (Svelte 4
  // does not parse TS casts inside attribute expressions).
  function onDateInput (e: Event): void {
    const v = (e.currentTarget as HTMLInputElement).value
    snap.setDatePickerValue(v)
  }
  function onDateChange (e: Event): void {
    const v = (e.currentTarget as HTMLInputElement).value
    snap.jumpToDate(v)
  }
</script>

{#each tiers as tier (tier)}
  <!-- `data-tier` is the measurement hook GanttToolbarBar reads to cache each
       tier's natural width; do not remove it. -->
  <div class="gantt-tb-tier" class:vertical data-tier={tier}>
    {#if tier === 'group'}
      <!-- Compact dropdowns: visible labels removed, intent surfaced via
           tooltip on the wrap. Each dropdown shows only the current value
           (e.g. "Status") plus a small icon prefix so users can distinguish
           the two at a glance without reading. -->
      <div class="gantt-tb-colorby-wrap" use:tooltip={{ label: tracker.string.GanttColorBy }}>
        <span class="gantt-tb-dd-icon" aria-hidden="true">●</span>
        <!-- svelte-ignore a11y-no-onchange -->
        <select
          class="gantt-tb-colorby-select"
          value={snap.ganttBarColorBy}
          on:change={snap.onColorBySelectChange}
          aria-label={snap.ariaLabels?.[tracker.string.GanttColorBy] ?? ''}
        >
          {#each COLOR_BY_KEYS as key (key)}
            <option value={key}>
              {#if key === 'status'}<Label label={tracker.string.GanttColorByStatus} />
              {:else if key === 'priority'}<Label label={tracker.string.GanttColorByPriority} />
              {:else if key === 'assignee'}<Label label={tracker.string.GanttColorByAssignee} />
              {:else if key === 'component'}<Label label={tracker.string.GanttColorByComponent} />
              {:else if key === 'milestone'}<Label label={tracker.string.GanttColorByMilestone} />
              {:else if key === 'none'}<Label label={tracker.string.GanttColorByNone} />
              {/if}
            </option>
          {/each}
        </select>
      </div>
      <div class="gantt-tb-groupby-wrap" use:tooltip={{ label: tracker.string.GanttGroupBy }}>
        <span class="gantt-tb-dd-icon" aria-hidden="true">▤</span>
        <!-- svelte-ignore a11y-no-onchange -->
        <select
          class="gantt-tb-groupby-select"
          value={snap.ganttGroupBy}
          on:change={snap.onGroupBySelectChange}
          aria-label={snap.ariaLabels?.[tracker.string.GanttGroupBy] ?? ''}
        >
          {#each GROUP_BY_KEYS as key (key)}
            <option value={key}>
              {#if key === 'none'}<Label label={tracker.string.GanttGroupByNone} />
              {:else if key === 'status'}<Label label={tracker.string.GanttGroupByStatus} />
              {:else if key === 'priority'}<Label label={tracker.string.GanttGroupByPriority} />
              {:else if key === 'assignee'}<Label label={tracker.string.GanttGroupByAssignee} />
              {:else if key === 'component'}<Label label={tracker.string.GanttGroupByComponent} />
              {:else if key === 'milestone'}<Label label={tracker.string.GanttGroupByMilestone} />
              {:else if key === 'label'}<Label label={tracker.string.GanttGroupByLabel} />
              {/if}
            </option>
          {/each}
        </select>
      </div>
    {:else if tier === 'nav'}
      <button
        class="gantt-tb-icon-btn"
        type="button"
        use:tooltip={{ label: tracker.string.GanttJumpToStart }}
        on:click={snap.jumpToStart}
        aria-label={snap.ariaLabels[tracker.string.GanttJumpToStart] ?? ''}
      >
        <Icon icon={IconJumpToStart} size="small" />
      </button>
      <button
        class="gantt-tb-icon-btn"
        type="button"
        use:tooltip={{ label: tracker.string.GanttPreviousPeriod }}
        on:click={snap.pageScrollPrev}
        aria-label={snap.ariaLabels[tracker.string.GanttPreviousPeriod] ?? ''}
      >
        <Icon icon={IconNavPrev} size="small" />
      </button>
      <button class="gantt-tb-today-btn" type="button" on:click={snap.jumpToToday}>
        <Label label={tracker.string.GanttToday} />
      </button>
      <button
        class="gantt-tb-icon-btn"
        type="button"
        use:tooltip={{ label: tracker.string.GanttNextPeriod }}
        on:click={snap.pageScrollNext}
        aria-label={snap.ariaLabels[tracker.string.GanttNextPeriod] ?? ''}
      >
        <Icon icon={IconNavNext} size="small" />
      </button>
      <button
        class="gantt-tb-icon-btn"
        type="button"
        use:tooltip={{ label: tracker.string.GanttJumpToEnd }}
        on:click={snap.jumpToEnd}
        aria-label={snap.ariaLabels[tracker.string.GanttJumpToEnd] ?? ''}
      >
        <Icon icon={IconJumpToEnd} size="small" />
      </button>
    {:else if tier === 'date'}
      <label class="gantt-tb-date-wrap" use:tooltip={{ label: tracker.string.GanttJumpToDate }}>
        <Icon icon={IconCalendar} size="small" />
        <input
          type="date"
          class="gantt-tb-date-input"
          value={snap.datePickerValue}
          on:input={onDateInput}
          on:change={onDateChange}
          aria-label={snap.ariaLabels[tracker.string.GanttJumpToDate] ?? ''}
        />
      </label>
    {:else if tier === 'zoom'}
      <DropdownLabelsIntl
        kind={'regular'}
        size={'small'}
        justify={'left'}
        label={tracker.string.GanttZoomLabel}
        items={snap.zoomDropdownItems}
        selected={snap.zoomDropdownSelection}
        shouldUpdateUndefined={false}
        on:selected={snap.onZoomDropdownSelected}
      />
      <div
        class="gantt-tb-days-wrap"
        use:tooltip={{ label: tracker.string.GanttZoomVisibleDays, props: { days: snap.visibleDays } }}
      >
        <EditBox
          value={snap.visibleDaysInput}
          format={'number'}
          minValue={MIN_VISIBLE_DAYS}
          maxValue={MAX_VISIBLE_DAYS}
          kind={'editbox'}
          on:value={(e) => {
            snap.setVisibleDaysInput(Number(e.detail))
          }}
          on:blur={snap.applyVisibleDaysInput}
          on:keydown={snap.onVisibleDaysKeyDown}
        />
        <span class="gantt-tb-days-suffix"><Label label={tracker.string.GanttZoomDaysSuffix} /></span>
      </div>
    {:else if tier === 'undo'}
      <button
        type="button"
        class="gantt-tb-icon-btn"
        disabled={!snap.canUndo}
        use:tooltip={{ label: tracker.string.GanttUndo }}
        on:click={snap.handleUndo}
        aria-label={snap.nextUndoDescription ?? snap.ariaLabels[tracker.string.GanttUndo] ?? ''}
      >
        <Icon icon={IconUndo} size="small" />
      </button>
      <button
        type="button"
        class="gantt-tb-icon-btn"
        disabled={!snap.canRedo}
        use:tooltip={{ label: tracker.string.GanttRedo }}
        on:click={snap.handleRedo}
        aria-label={snap.nextRedoDescription ?? snap.ariaLabels[tracker.string.GanttRedo] ?? ''}
      >
        <Icon icon={IconRedo} size="small" />
      </button>
    {:else if tier === 'savedview'}
      <div class="gantt-tb-savedview-wrap" use:tooltip={{ label: tracker.string.GanttSavedView }}>
        <span class="gantt-tb-savedview-name">{snap.savedViewName}</span>
        <span class="gantt-tb-savedview-modified">
          <Label label={tracker.string.GanttSavedViewModified} />
        </span>
        <button
          type="button"
          class="gantt-tb-icon-btn"
          use:tooltip={{ label: tracker.string.GanttSavedViewUpdate }}
          on:click={snap.onUpdateSavedViewClick}
          aria-label={snap.ariaLabels[tracker.string.GanttSavedViewUpdate] ?? ''}
        >
          <span class="gantt-tb-text-glyph" aria-hidden="true">↻</span>
        </button>
      </div>
    {/if}
  </div>
{/each}

<style lang="scss">
  .gantt-tb-tier {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-shrink: 0;
  }
  /* Popover rendering: one full-width row per tier so the controls stay
     comfortably tappable instead of being squeezed side by side. */
  .gantt-tb-tier.vertical {
    display: flex;
    width: 100%;
    min-height: 2rem;
  }

  .gantt-tb-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    cursor: pointer;
    flex-shrink: 0;

    &:hover:not([disabled]) {
      background: var(--theme-button-hovered);
      color: var(--theme-caption-color);
    }
    &[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .gantt-tb-today-btn {
    height: 1.75rem;
    padding: 0 0.625rem;
    background: transparent;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    font-size: 0.8125rem;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: var(--theme-button-hovered);
      color: var(--theme-caption-color);
    }
  }

  .gantt-tb-date-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 1.75rem;
    padding: 0 0.375rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    flex-shrink: 0;
  }

  .gantt-tb-date-input {
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    outline: none;
    width: 7.5rem;
  }

  .gantt-tb-days-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 1.75rem;
    padding: 0 0.5rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    flex-shrink: 0;
  }

  .gantt-tb-days-suffix {
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }

  /* Compact icon-only dropdowns: visible "Group by"/"Color by" label
     removed (lives on the tooltip), small text glyph as prefix so the
     two dropdowns stay distinguishable at a glance. */
  .gantt-tb-groupby-wrap,
  .gantt-tb-colorby-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    height: 1.75rem;
    padding: 0 0.25rem 0 0.375rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .gantt-tb-dd-icon {
    font-size: 0.85rem;
    line-height: 1;
    opacity: 0.55;
    color: var(--theme-content-color);
    pointer-events: none;
  }

  .gantt-tb-groupby-select,
  .gantt-tb-colorby-select {
    background: transparent;
    border: none;
    color: var(--theme-content-color);
    font: inherit;
    cursor: pointer;
    outline: none;
    padding: 0 0.125rem;
    /* Cap intrinsic width — native <select> sizes itself to the longest
       option which can blow up if a label gets long; clipping here keeps
       the toolbar predictable. The selected value still renders cleanly
       because options open in a native dropdown that ignores this cap. */
    max-width: 8rem;
    text-overflow: ellipsis;
    /* Trim native chevron padding so the value text + chevron sit snug. */
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    padding-right: 0.875rem;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--theme-content-color) 50%),
      linear-gradient(135deg, var(--theme-content-color) 50%, transparent 50%);
    background-position:
      calc(100% - 6px) 50%,
      calc(100% - 2px) 50%;
    background-size: 4px 4px;
    background-repeat: no-repeat;
  }

  .gantt-tb-savedview-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0 0.5rem;
    font-size: 0.75rem;
    color: var(--theme-dark-color);
    flex-shrink: 0;
  }

  .gantt-tb-savedview-name {
    font-weight: 500;
    color: var(--theme-content-color);
  }

  .gantt-tb-savedview-modified {
    font-style: italic;
  }

  .gantt-tb-text-glyph {
    font-size: 1rem;
    line-height: 1;
  }
</style>
