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
  import type { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  import ui from '../../plugin'
  import { showPopup } from '../../popups'
  import Icon from '../Icon.svelte'
  import Label from '../Label.svelte'
  import DPCalendar from './icons/DPCalendar.svelte'
  import DPCalendarOver from './icons/DPCalendarOver.svelte'
  import { getMonthName } from './internal/DateUtils'
  import DatePopup from './DatePopup.svelte'
  import { DateRangeMode } from '@hcengineering/core'

  export let value: number | null | undefined
  export let mode: DateRangeMode = DateRangeMode.DATE
  export let mondayStart: boolean = true
  export let editable: boolean = false
  export let icon: 'normal' | 'warning' | 'critical' | 'overdue' = 'normal'
  export let labelOver: IntlString | undefined = undefined // label instead of date
  export let labelNull: IntlString = ui.string.NoDate
  export let showIcon = true
  export let shouldShowLabel: boolean = true
  export let size: 'x-small' | 'small' = 'small'
  export let kind: 'transparent' | 'primary' | 'link' | 'list' = 'primary'
  export let label = ui.string.DueDate
  export let detail = ui.string.IssueNeedsToBeCompletedByThisDate

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
  class="datetime-button {kind}"
  class:editable
  class:dateTimeButtonNoLabel={!shouldShowLabel}
  class:h-6={size === 'small'}
  class:h-3={size === 'x-small'}
  class:text-xs={size === 'x-small'}
  on:click={() => {
    if (editable && !opened) {
      opened = true
      showPopup(
        DatePopup,
        { currentDate, mondayStart, withTime, label, detail },
        undefined,
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
    <div class="btn-icon {icon}" class:buttonIconNoLabel={!shouldShowLabel}>
      <Icon icon={icon === 'overdue' ? DPCalendarOver : DPCalendar} size="full" />
    </div>
  {/if}
  {#if value !== null && value !== undefined}
    {#if shouldShowLabel && labelOver !== undefined}
      <Label label={labelOver} />
    {:else if shouldShowLabel}
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
    white-space: nowrap;
    color: var(--accent-color);

    cursor: default;

    &.primary {
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
        color: var(--content-color);
      }
      &.warning {
        color: var(--warning-color);
      }
      &.critical {
        color: var(--error-color);
      }
      &.overdue {
        color: var(--error-color);
      }
    }
    .not-selected {
      color: var(--content-color);
    }

    &:hover {
      color: var(--caption-color);
      transition-duration: 0;

      .not-selected {
        color: var(--accent-color);
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
            color: var(--warning-color);
          }
          &.critical {
            color: var(--error-color);
          }
          &.overdue {
            color: var(--error-color);
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
        color: var(--content-color);
        .btn-icon {
          color: var(--content-color);
        }
      }
    }
    &.link {
      justify-content: flex-start;
      padding: 0 0.875rem;
      height: 2rem;
      border-radius: 0.25rem;

      .btn-icon {
        margin-right: 0.5rem;
      }
      &:hover {
        color: var(--caption-color);
        background-color: var(--body-color);
        border-color: var(--divider-color);
        .btn-icon {
          color: var(--content-color);
        }
      }
    }
    &.list {
      padding: 0 0.625em 0 0.5rem;
      min-height: 1.75rem;
      color: var(--content-color);
      background-color: var(--body-color);
      border: 1px solid var(--divider-color);
      border-radius: 3rem;
      transition-property: border, color, background-color;
      transition-duration: 0.15s;

      &:hover {
        color: var(--caption-color);
        background-color: var(--board-card-bg-color);
        border-color: var(--button-border-color);
      }
    }

    .time-divider {
      flex-shrink: 0;
      margin: 0 0.25rem;
      width: 1px;
      min-width: 1px;
      height: 0.75rem;
      background-color: var(--button-border-color);
    }
    .separator {
      margin: 0 0.1rem;
    }
  }
</style>
