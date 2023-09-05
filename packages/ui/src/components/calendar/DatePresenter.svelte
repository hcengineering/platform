<!--
// Copyright © 2020 Anticrm Platform Contributors.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import type { IntlString, Asset } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  import { DateRangeMode } from '@hcengineering/core'
  import ui from '../../plugin'
  import { showPopup } from '../../popups'
  import { ButtonKind, ButtonSize, AnySvelteComponent } from '../../types'
  import Icon from '../Icon.svelte'
  import Label from '../Label.svelte'
  import DatePopup from './DatePopup.svelte'
  import DPCalendar from './icons/DPCalendar.svelte'
  import DPCalendarOver from './icons/DPCalendarOver.svelte'
  import { getMonthName } from './internal/DateUtils'
  import { ComponentType } from 'svelte'

  export let value: number | null | undefined
  export let mode: DateRangeMode = DateRangeMode.DATE
  export let mondayStart: boolean = true
  export let editable: boolean = false
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconModifier: 'normal' | 'warning' | 'critical' | 'overdue' = 'normal'
  export let shouldIgnoreOverdue: boolean = false
  export let labelNull: IntlString = ui.string.NoDate
  export let showIcon = true
  export let shouldShowLabel: boolean = true
  export let size: ButtonSize | 'x-small' = 'small'
  export let kind: ButtonKind = 'link'
  export let width: string | undefined = undefined
  export let label = ui.string.DueDate
  export let detail = ui.string.NeedsToBeCompletedByThisDate

  const dispatch = createEventDispatcher()

  const today: Date = new Date(Date.now())
  let currentDate: Date | null = null
  if (value != null) currentDate = new Date(value)
  let opened: boolean = false

  const onChange = (result: Date | null): void => {
    if (result === null) {
      currentDate = null
      value = null
    } else {
      currentDate = result
      value = currentDate.getTime()
    }
    value = value
    dispatch('change', value)
    opened = false
  }

  $: withTime = mode !== DateRangeMode.DATE
</script>

<button
  class="datetime-button {kind} {size}"
  class:editable
  class:dateTimeButtonNoLabel={!shouldShowLabel}
  class:text-xs={size === 'x-small'}
  class:noDate={!value}
  class:withIcon={showIcon}
  style:width
  on:click={(e) => {
    if (editable && !opened) {
      e.stopPropagation()
      e.preventDefault()
      opened = true
      showPopup(
        DatePopup,
        { currentDate, mondayStart, withTime, label, detail },
        'top',
        () => {
          opened = false
        },
        (result) => {
          if (result !== undefined) onChange(result)
        }
      )
    }
  }}
>
  {#if showIcon}
    <div class="btn-icon {iconModifier}" class:buttonIconNoLabel={!shouldShowLabel}>
      <Icon
        icon={icon ?? (iconModifier === 'overdue' && !shouldIgnoreOverdue) ? DPCalendarOver : DPCalendar}
        size={'full'}
      />
    </div>
  {/if}
  {#if value !== null && value !== undefined}
    {#if shouldShowLabel}
      {new Date(value).getDate()}
      {getMonthName(new Date(value), 'short')}
      {#if new Date(value).getFullYear() !== today.getFullYear()}
        {new Date(value).getFullYear()}
      {/if}
      {#if withTime}
        <div class="time-divider" />
        {new Date(value).getHours().toString().padStart(2, '0')}
        <span class="separator">:</span>
        {new Date(value).getMinutes().toString().padStart(2, '0')}
      {/if}
    {/if}
  {:else if shouldShowLabel}
    <span class="not-selected"><Label label={labelNull} /></span>
  {/if}
</button>

<style lang="scss">
  .datetime-button {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    font-weight: 400;
    width: auto;
    min-width: 0;
    white-space: nowrap;
    color: var(--theme-content-color);
    cursor: default;

    &.x-small {
      height: 0.75rem;
    }
    &.small {
      height: 1.5rem;
      padding: 0 0.25rem;
    }
    &.medium {
      height: 2rem;
    }
    &.large {
      height: 2.25rem;
    }

    &.accented {
      padding: 0 0.5rem;
      min-width: 1.5rem;
      background-color: var(--noborder-bg-color);
      border: 1px solid transparent;
      border-radius: 0.25rem;
      box-shadow: var(--button-shadow);
      transition-property: border, background-color, color, box-shadow;
      transition-duration: 0.15s;
    }

    &.dateTimeButtonNoLabel {
      padding: 0;
    }

    .btn-icon {
      margin-right: 0.375rem;
      width: 0.875rem;
      height: 0.875rem;
      transition: color 0.15s;
      pointer-events: none;

      &.buttonIconNoLabel {
        margin-right: 0;
      }
      &.normal {
        color: var(--theme-content-color);
      }
      &.warning {
        color: var(--theme-warning-color);
      }
      &.critical {
        color: var(--theme-error-color);
      }
      &.overdue {
        color: var(--theme-error-color);
      }
    }
    .not-selected {
      color: var(--theme-dark-color);
    }

    &:hover {
      color: var(--theme-caption-color);
      transition-duration: 0;

      .not-selected {
        color: var(--theme-content-color);
      }
    }
    &.editable {
      cursor: pointer;

      &:hover {
        background-color: var(--noborder-bg-hover);
        .btn-icon {
          &.normal {
            color: var(--caption-color);
          }
          &.warning {
            color: var(--theme-warning-color);
          }
          &.critical {
            color: var(--theme-error-color);
          }
          &.overdue {
            color: var(--theme-error-color);
          }
        }
        .time-divider {
          background-color: var(--button-border-hover);
        }
      }
      &:focus-within {
        border-color: var(--primary-edit-border-color);
        &:hover {
          background-color: transparent;
        }
      }
    }
    &:disabled {
      background-color: var(--button-disabled-color);
      cursor: default;

      &:hover {
        color: var(--theme-dark-color);
        .btn-icon {
          color: var(--theme-dark-color);
        }
      }
    }
    &.link {
      justify-content: flex-start;
      padding: 0 0.875rem;
      color: var(--theme-dark-color);
      border-radius: 0.25rem;

      &.small {
        padding: 0 0.25rem;
      }

      .btn-icon:not(.warning, .critical, .overdue) {
        color: var(--theme-darker-color);
      }
      &:hover {
        color: var(--theme-content-color);
        background-color: var(--theme-bg-color);
        border-color: var(--theme-divider-color);
        .btn-icon:not(.warning, .critical, .overdue) {
          color: var(--theme-content-color);
        }
      }
    }
    &.list {
      padding: 0 0.625em 0 0.5rem;
      min-height: 1.75rem;
      color: var(--theme-halfcontent-color);
      background-color: var(--theme-list-button-color);
      border: 1px solid var(--theme-divider-color);
      border-radius: 3rem;
      transition-property: border, color, background-color;
      transition-duration: 0.15s;

      &:hover {
        color: var(--theme-halfcontent-color);
        background-color: var(--theme-list-button-hover);
        border-color: var(--theme-divider-color);
      }
      .btn-icon:not(.warning, .critical, .overdue),
      &:hover .btn-icon:not(.warning, .critical, .overdue) {
        color: var(--theme-halfcontent-color) !important;
      }
      &.medium {
        height: 1.75rem;
      }
    }
    &.link-bordered {
      padding: 0 0.375rem;
      color: var(--theme-content-color);
      background-color: var(--theme-link-button-color);
      border-color: var(--theme-button-border);
      border-radius: 0.25rem;
      &:hover {
        color: var(--theme-caption-color);
        background-color: var(--theme-link-button-hover);
        border-color: var(--theme-list-divider-color);
        .btn-icon:not(.warning, .critical, .overdue) {
          color: var(--theme-caption-color);
        }
      }
      &.small .btn-icon {
        margin-right: 0.25rem;
      }
    }
    &.regular {
      color: var(--theme-caption-color);
      background-color: var(--theme-button-default);
      border-color: var(--theme-button-border);
      border-radius: 0.25rem;

      &.withIcon {
        padding: 0 1rem 0 0.75rem;
      }
      &:not(.withIcon) {
        padding: 0 0.75rem;
      }
      .btn-icon:not(.warning, .critical, .overdue) {
        color: var(--theme-content-color);
      }
      &:hover {
        background-color: var(--theme-button-hovered);
        border-color: var(--theme-divider-color);
        .btn-icon:not(.warning, .critical, .overdue) {
          color: var(--theme-content-color);
        }
      }
      // &.edit {
      //   padding: 0 0.5rem;
      // }
    }
    &.ghost {
      padding: 0 0.625rem;
      border-radius: 0.25rem;
      background-color: inherit;

      &:hover {
        background-color: var(--theme-button-hovered);
      }
      &.selected {
        background-color: var(--highlight-select);
      }
      &.selected:hover {
        background-color: var(--highlight-select-hover);
      }
    }

    &.noDate .btn-icon:not(.warning, .critical, .overdue) {
      color: var(--theme-dark-color);
    }
    &.noDate:hover .btn-icon:not(.warning, .critical, .overdue) {
      color: var(--theme-content-color);
    }

    .time-divider {
      flex-shrink: 0;
      margin: 0 0.25rem;
      width: 1px;
      min-width: 1px;
      height: 0.75rem;
      background-color: var(--theme-divider-color);
    }
    .separator {
      margin: 0 0.1rem;
    }
  }
</style>
