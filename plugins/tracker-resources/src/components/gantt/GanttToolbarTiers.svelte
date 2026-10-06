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
    IconRedo,
    IconUndo,
    Label,
    SimpleDatePopup,
    eventToHTMLElement,
    showPopup,
    themeStore,
    tooltip
  } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { GROUP_BY_KEYS } from './lib/group-by'
  import type { DropdownIntlItem } from '@hcengineering/ui'
  import type { IntlString } from '@hcengineering/platform'
  import type { ToolbarTier } from '@hcengineering/gantt'
  import type { GanttToolbarSnapshot } from './ganttToolbarStore'

  const COLOR_BY_KEYS = ['status', 'priority', 'assignee', 'component', 'milestone', 'none'] as const

  export let snap: GanttToolbarSnapshot
  /** Tiers to render, in visual order. */
  export let tiers: readonly ToolbarTier[] = []
  /** Stack the tiers vertically — used by the "…" popover. */
  export let vertical: boolean = false

  const colorLabels: Record<(typeof COLOR_BY_KEYS)[number], IntlString> = {
    status: tracker.string.GanttColorByStatus,
    priority: tracker.string.GanttColorByPriority,
    assignee: tracker.string.GanttColorByAssignee,
    component: tracker.string.GanttColorByComponent,
    milestone: tracker.string.GanttColorByMilestone,
    none: tracker.string.GanttColorByNone
  }
  const groupLabels: Record<(typeof GROUP_BY_KEYS)[number], IntlString> = {
    none: tracker.string.GanttGroupByNone,
    status: tracker.string.GanttGroupByStatus,
    priority: tracker.string.GanttGroupByPriority,
    assignee: tracker.string.GanttGroupByAssignee,
    component: tracker.string.GanttGroupByComponent,
    milestone: tracker.string.GanttGroupByMilestone,
    label: tracker.string.GanttGroupByLabel
  }
  const colorItems: DropdownIntlItem[] = COLOR_BY_KEYS.map((id) => ({ id, label: colorLabels[id] }))
  const groupItems: DropdownIntlItem[] = GROUP_BY_KEYS.map((id) => ({ id, label: groupLabels[id] }))

  // Constants — kept identical to GanttView so the input widget validates
  // the same range whether the user types in the toolbar or hits D/W/M/Q.
  const MIN_VISIBLE_DAYS = 1
  const MAX_VISIBLE_DAYS = 365

  // Wrapper handlers so template expressions stay assignment-free (Svelte 4
  // does not parse TS casts inside attribute expressions).
  const zoomPresets = [
    { id: 'day', label: tracker.string.GanttZoomDay },
    { id: 'week', label: tracker.string.GanttZoomWeek },
    { id: 'month', label: tracker.string.GanttZoomMonth },
    { id: 'quarter', label: tracker.string.GanttZoomQuarter }
  ] as const
  function selectZoom (id: (typeof zoomPresets)[number]['id']): void {
    snap.onZoomDropdownSelected(new CustomEvent('selected', { detail: id }))
  }

  function dateLabel (value: string, locale: string): string {
    if (value === '') return ''
    return new Date(`${value}T00:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    })
  }
  function openDatePicker (e: MouseEvent): void {
    const currentDate = snap.datePickerValue === '' ? null : new Date(`${snap.datePickerValue}T00:00:00`)
    showPopup(SimpleDatePopup, { currentDate }, eventToHTMLElement(e), (result: Date | undefined) => {
      if (result === undefined) return
      const iso = [
        result.getFullYear(),
        String(result.getMonth() + 1).padStart(2, '0'),
        String(result.getDate()).padStart(2, '0')
      ].join('-')
      snap.setDatePickerValue(iso)
      snap.jumpToDate(iso)
    })
  }
</script>

{#each tiers as tier (tier)}
  <!-- `data-tier` is the measurement hook GanttToolbarBar reads to cache each
       tier's natural width; do not remove it. -->
  <div class="gantt-tb-tier" class:vertical data-tier={tier}>
    {#if tier === 'group'}
      <div class="gantt-tb-dropdown">
        <span class="gantt-tb-control-label"><Label label={tracker.string.GanttGroupBy} /></span>
        <DropdownLabelsIntl
          kind="regular"
          size="small"
          justify="left"
          width={vertical ? '100%' : '8rem'}
          label={tracker.string.GanttGroupBy}
          items={groupItems}
          selected={snap.ganttGroupBy}
          shouldUpdateUndefined={false}
          on:selected={snap.onGroupBySelectChange}
        />
      </div>
    {:else if tier === 'color'}
      <div class="gantt-tb-dropdown">
        <span class="gantt-tb-control-label"><Label label={tracker.string.GanttColorBy} /></span>
        <DropdownLabelsIntl
          kind="regular"
          size="small"
          justify="left"
          width={vertical ? '100%' : '8rem'}
          label={tracker.string.GanttColorBy}
          items={colorItems}
          selected={snap.ganttBarColorBy}
          shouldUpdateUndefined={false}
          on:selected={snap.onColorBySelectChange}
        />
      </div>
    {:else if tier === 'nav'}
      <div class="gantt-tb-segmented gantt-tb-navigation">
        <button
          class="gantt-tb-icon-btn"
          type="button"
          use:tooltip={{ label: tracker.string.GanttPreviousPeriod }}
          on:click={snap.pageScrollPrev}
          aria-label={snap.ariaLabels[tracker.string.GanttPreviousPeriod] ?? ''}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <button
          class="gantt-tb-today-btn"
          type="button"
          disabled={!snap.canJumpToToday}
          use:tooltip={{
            label: snap.canJumpToToday ? tracker.string.GanttToday : tracker.string.GanttTodayAlreadyVisible
          }}
          on:click={snap.jumpToToday}
        >
          <Label label={tracker.string.GanttToday} />
        </button>
        <button
          class="gantt-tb-icon-btn"
          type="button"
          use:tooltip={{ label: tracker.string.GanttNextPeriod }}
          on:click={snap.pageScrollNext}
          aria-label={snap.ariaLabels[tracker.string.GanttNextPeriod] ?? ''}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    {:else if tier === 'date'}
      <button
        type="button"
        class="gantt-tb-icon-btn"
        disabled={!snap.canJumpToStart}
        use:tooltip={{ label: tracker.string.GanttJumpToStart }}
        on:click={snap.jumpToStart}
        aria-label={snap.ariaLabels[tracker.string.GanttJumpToStart] ?? ''}
      >
        <Icon icon={IconJumpToStart} size="small" />
      </button>
      <button
        type="button"
        class="gantt-tb-date-wrap"
        use:tooltip={{ label: tracker.string.GanttJumpToDate }}
        on:click={openDatePicker}
        aria-label={snap.ariaLabels[tracker.string.GanttJumpToDate] ?? ''}
      >
        <Icon icon={IconCalendar} size="small" />
        {#if snap.datePickerValue === ''}<Label label={tracker.string.GanttJumpToDate} />
        {:else}{dateLabel(snap.datePickerValue, $themeStore.language)}{/if}
      </button>
      <button
        type="button"
        class="gantt-tb-icon-btn"
        disabled={!snap.canJumpToEnd}
        use:tooltip={{ label: tracker.string.GanttJumpToEnd }}
        on:click={snap.jumpToEnd}
        aria-label={snap.ariaLabels[tracker.string.GanttJumpToEnd] ?? ''}
      >
        <Icon icon={IconJumpToEnd} size="small" />
      </button>
      <div
        class="gantt-tb-days-wrap"
        use:tooltip={{ label: tracker.string.GanttZoomVisibleDays, props: { days: snap.visibleDays } }}
      >
        <span class="gantt-tb-control-label"><Label label={tracker.string.GanttVisibleRange} /></span>
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
    {:else if tier === 'zoom'}
      <div
        class="gantt-tb-segmented gantt-tb-zoom"
        role="group"
        aria-label={snap.ariaLabels[tracker.string.GanttZoomLabel] ?? ''}
      >
        {#each zoomPresets as preset (preset.id)}
          <button
            type="button"
            class:active={snap.zoomDropdownSelection === preset.id}
            aria-pressed={snap.zoomDropdownSelection === preset.id}
            on:click={() => {
              selectZoom(preset.id)
            }}><Label label={preset.label} /></button
          >
        {/each}
        {#if snap.zoomDropdownSelection === 'custom'}
          <span class="gantt-tb-custom"><Label label={tracker.string.GanttZoomCustom} /></span>
        {/if}
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
  .gantt-tb-segmented {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    border-radius: 0.5rem;
    background: var(--theme-button-hovered);
  }
  .gantt-tb-segmented button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 1.75rem;
    min-width: 2rem;
    padding: 0 0.55rem;
    border: 0;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--theme-dark-color);
    font: inherit;
    cursor: pointer;
  }
  .gantt-tb-zoom button {
    padding: 0 0.375rem;
  }
  .gantt-tb-segmented button:hover:not([disabled]) {
    color: var(--theme-content-color);
  }
  .gantt-tb-segmented button.active {
    background: var(--theme-comp-header-color);
    color: var(--theme-content-color);
    box-shadow: 0 1px 3px color-mix(in srgb, var(--theme-content-color) 18%, transparent);
  }
  .gantt-tb-segmented button[disabled] {
    opacity: 0.4;
    cursor: default;
  }
  .gantt-tb-custom {
    padding: 0 0.55rem;
    color: var(--theme-dark-color);
    font-size: 0.75rem;
  }
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
    width: 2rem;
    height: 2rem;
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
    height: 2rem;
    padding: 0 0.625rem;
    background: transparent;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    font-size: 0.8125rem;
    cursor: pointer;
    flex-shrink: 0;

    &:hover:not([disabled]) {
      background: var(--theme-button-hovered);
      color: var(--theme-caption-color);
    }
  }

  .gantt-tb-date-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 2rem;
    padding: 0 0.375rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    background: var(--theme-comp-header-color);
    font: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .gantt-tb-days-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 2rem;
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

  .gantt-tb-dropdown {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
  }
  .gantt-tb-control-label {
    color: var(--theme-dark-color);
    font-size: 0.75rem;
    white-space: nowrap;
  }
  .vertical[data-tier='group'],
  .vertical[data-tier='color'] {
    align-items: stretch;
  }
  .vertical[data-tier='date'] {
    flex-wrap: wrap;
  }
  .vertical .gantt-tb-dropdown {
    width: 100%;
    justify-content: space-between;
  }
  .vertical .gantt-tb-dropdown :global(.min-w-0) {
    flex: 1;
  }
  .vertical .gantt-tb-control-label {
    min-width: 5rem;
  }
  .gantt-tb-tier + .gantt-tb-tier {
    padding-left: 0.25rem;
  }
  .gantt-tb-tier.vertical + .gantt-tb-tier.vertical {
    padding-left: 0;
    padding-top: 0.5rem;
    border-left: none;
    border-top: 1px solid var(--theme-divider-color);
  }
  button:focus-visible,
  .gantt-tb-date-wrap:focus-within {
    outline: 2px solid var(--theme-content-accent-color);
    outline-offset: 2px;
  }
  .gantt-tb-today-btn[disabled] {
    opacity: 0.4;
    cursor: default;
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
