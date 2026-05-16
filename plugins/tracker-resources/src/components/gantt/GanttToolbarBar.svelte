<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<!--
  Lifted Gantt toolbar. The controls render in IssuesView's SpaceHeader
  row 2 via slot overrides; their state lives in GanttView and is
  bridged here via `ganttToolbarSnapshot`. Two render sections share one
  component so the markup stays DRY:
    section="search"   → Group-by + Date-Nav + Zoom + days + Undo/Redo
                         (mounted between Filter-button and Lupe)
    section="trailing" → Hamburger + Fullscreen
                         (mounted after the All/Active/Backlog ModeSelector)
-->
<script lang="ts">
  import { DropdownLabelsIntl, EditBox, Icon, tooltip } from '@hcengineering/ui'
  import ArrowLeft from '@hcengineering/ui/src/components/icons/ArrowLeft.svelte'
  import ArrowRight from '@hcengineering/ui/src/components/icons/ArrowRight.svelte'
  import NavPrev from '@hcengineering/ui/src/components/icons/NavPrev.svelte'
  import NavNext from '@hcengineering/ui/src/components/icons/NavNext.svelte'
  import Calendar from '@hcengineering/ui/src/components/icons/Calendar.svelte'
  import IconUndo from '@hcengineering/ui/src/components/icons/Undo.svelte'
  import IconRedo from '@hcengineering/ui/src/components/icons/Redo.svelte'
  import { IconMoreV } from '@hcengineering/ui'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { GROUP_BY_KEYS } from './lib/group-by'
  import { ganttToolbarSnapshot } from './ganttToolbarStore'

  export let section: 'search' | 'trailing'

  // Constants — kept identical to GanttView so the input widget validates
  // the same range whether the user types in the toolbar or hits D/W/M/Q.
  const MIN_VISIBLE_DAYS = 1
  const MAX_VISIBLE_DAYS = 365

  // Wrapper handlers so template expressions stay assignment-free (Svelte 4
  // does not parse TS casts inside attribute expressions). They forward to
  // the snapshot's setters which delegate back into GanttView's state.
  function onDateInput (e: Event): void {
    const v = (e.currentTarget as HTMLInputElement).value
    $ganttToolbarSnapshot?.setDatePickerValue(v)
  }
  function onDateChange (e: Event): void {
    const v = (e.currentTarget as HTMLInputElement).value
    $ganttToolbarSnapshot?.jumpToDate(v)
  }
</script>

{#if $ganttToolbarSnapshot != null}
  {@const snap = $ganttToolbarSnapshot}
  {#if section === 'search'}
    <!-- Group-by select sits to the LEFT of the Lupe in the unified row.
         The user's spec puts it directly after the Filter button. -->
    <div class="gantt-tb-groupby-wrap" use:tooltip={{ label: tracker.string.GanttGroupOverridesHierarchy }}>
      <Label label={tracker.string.GanttGroupBy} />
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        class="gantt-tb-groupby-select"
        value={snap.ganttGroupBy}
        on:change={snap.onGroupBySelectChange}
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
  {/if}

  {#if section === 'search'}
    <!-- Date-Nav cluster: jump-start, prev-page, Today, next-page, jump-end,
         date-picker. Order matches the user's spec (Date-Nav → Week → days). -->
    <button
      class="gantt-tb-icon-btn"
      type="button"
      use:tooltip={{ label: tracker.string.GanttJumpToStart }}
      on:click={snap.jumpToStart}
      aria-label={snap.ariaLabels[tracker.string.GanttJumpToStart] ?? ''}
    >
      <Icon icon={ArrowLeft} size="small" />
    </button>
    <button
      class="gantt-tb-icon-btn"
      type="button"
      use:tooltip={{ label: tracker.string.GanttPreviousPeriod }}
      on:click={snap.pageScrollPrev}
      aria-label={snap.ariaLabels[tracker.string.GanttPreviousPeriod] ?? ''}
    >
      <Icon icon={NavPrev} size="small" />
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
      <Icon icon={NavNext} size="small" />
    </button>
    <button
      class="gantt-tb-icon-btn"
      type="button"
      use:tooltip={{ label: tracker.string.GanttJumpToEnd }}
      on:click={snap.jumpToEnd}
      aria-label={snap.ariaLabels[tracker.string.GanttJumpToEnd] ?? ''}
    >
      <Icon icon={ArrowRight} size="small" />
    </button>
    <label class="gantt-tb-date-wrap" use:tooltip={{ label: tracker.string.GanttJumpToDate }}>
      <Icon icon={Calendar} size="small" />
      <input
        type="date"
        class="gantt-tb-date-input"
        value={snap.datePickerValue}
        on:input={onDateInput}
        on:change={onDateChange}
        aria-label={snap.ariaLabels[tracker.string.GanttJumpToDate] ?? ''}
      />
    </label>

    <!-- Zoom preset dropdown + visible-days input. Kept tightly grouped
         (same spacing rules as the legacy toolbar-center cluster). -->
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
        on:value={(e) => snap.setVisibleDaysInput(Number(e.detail))}
        on:blur={snap.applyVisibleDaysInput}
        on:keydown={snap.onVisibleDaysKeyDown}
      />
      <span class="gantt-tb-days-suffix"><Label label={tracker.string.GanttZoomDaysSuffix} /></span>
    </div>

    <!-- Undo/Redo: mirror Cmd+Z / Cmd+Shift+Z keyboard shortcuts. Disabled
         state + descriptive aria label flow through the UndoManager stores
         registered in GanttView. -->
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

    <!-- Saved-view modified indicator stays in the search cluster so it sits
         next to the controls that mutate the view's state. -->
    {#if snap.savedViewModified}
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
  {/if}

  {#if section === 'trailing'}
    <!-- Trailing cluster sits AFTER the All/Active/Backlog ModeSelector.
         Hamburger comes BEFORE Fullscreen per the user's spec (swap from
         the legacy order). Hamburger renders on every layout — on desktop
         it acts as the More-Actions menu (Save / Load / Export); on phone
         it ALSO toggles the slide-out drawer. The store dispatches the
         right action via openMoreActionsMenu/toggleMobileDrawer. -->
    {#if snap.layoutMode === 'phone'}
      <button
        type="button"
        class="gantt-tb-icon-btn"
        use:tooltip={{ label: snap.mobileDrawerOpen ? tracker.string.GanttMobileCloseSidebar : tracker.string.GanttMobileOpenSidebar }}
        on:click={snap.toggleMobileDrawer}
        aria-label={snap.ariaLabels[snap.mobileDrawerOpen ? tracker.string.GanttMobileCloseSidebar : tracker.string.GanttMobileOpenSidebar] ?? ''}
        aria-expanded={snap.mobileDrawerOpen}
      >
        <span class="gantt-tb-text-glyph" aria-hidden="true">≡</span>
      </button>
    {:else}
      <button
        type="button"
        class="gantt-tb-icon-btn"
        use:tooltip={{ label: tracker.string.GanttMoreActions }}
        on:click={snap.openMoreActionsMenu}
        aria-label={snap.ariaLabels[tracker.string.GanttMoreActions] ?? ''}
      >
        <Icon icon={IconMoreV} size="small" />
      </button>
    {/if}
    <button
      type="button"
      class="gantt-tb-icon-btn"
      use:tooltip={{ label: tracker.string.GanttFullscreen }}
      on:click={snap.toggleFullscreen}
      aria-label={snap.ariaLabels[tracker.string.GanttFullscreen] ?? ''}
    >
      <span class="gantt-tb-text-glyph" aria-hidden="true">⛶</span>
    </button>
  {/if}
{/if}

<style lang="scss">
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

  .gantt-tb-groupby-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 1.75rem;
    padding: 0 0.5rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .gantt-tb-groupby-select {
    background: transparent;
    border: none;
    color: var(--theme-content-color);
    font: inherit;
    cursor: pointer;
    outline: none;
    padding-right: 0.5rem;
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
