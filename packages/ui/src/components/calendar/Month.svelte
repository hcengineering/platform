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
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import { capitalizeFirstLetter } from '../../utils'
  import ButtonIcon from '../ButtonIcon.svelte'
  import IconChevronLeft from '../icons/ChevronLeft.svelte'
  import IconChevronRight from '../icons/ChevronRight.svelte'
  import { deviceOptionsStore as deviceInfo } from '../..'
  import {
    ICell,
    TCellStyle,
    areDatesEqual,
    day,
    daysInMonth,
    firstDay,
    fromCurrentToTz,
    getMonthName,
    getUserTimezone,
    getWeekDayName
  } from './internal/DateUtils'

  export let currentDate: Date | null
  export let timeZone: string = getUserTimezone()
  export let hideNavigator: boolean = false
  export let replacementDay: boolean = false

  const dispatch = createEventDispatcher()

  let monthYear: string
  const today: Date = new Date()
  const viewDate: Date = new Date(currentDate ?? today)
  let selectedDate: Date = new Date(currentDate ?? today)
  $: firstDayOfCurrentMonth = firstDay(viewDate, $deviceInfo.firstDayOfWeek)
  const isToday = (n: number): boolean => {
    if (areDatesEqual(today, new Date(viewDate.getFullYear(), viewDate.getMonth(), n))) return true
    return false
  }

  const getDateStyle = (date: Date): TCellStyle => {
    if (selectedDate != null) {
      const zonedTime = fromCurrentToTz(selectedDate, timeZone)
      if (areDatesEqual(zonedTime, date)) {
        return 'selected'
      }
    }
    return 'not-selected'
  }
  const renderCellStyles = (date: Date, firstDay: number = 1): ICell[] => {
    const result: ICell[] = []
    for (let i = 1; i <= daysInMonth(date); i++) {
      const tempDate = new Date(date.getFullYear(), date.getMonth(), i)
      result.push({
        dayOfWeek: (tempDate.getDay() - firstDay + 7) % 7,
        classes: getDateStyle(tempDate)
      })
    }
    monthYear = capitalizeFirstLetter(getMonthName(viewDate)) + ' ' + viewDate.getFullYear()
    return result
  }
  $: days = renderCellStyles(viewDate, $deviceInfo.firstDayOfWeek)

  const changeMonth = (offset: number): void => {
    viewDate.setMonth(viewDate.getMonth() + offset)
    days = renderCellStyles(viewDate, $deviceInfo.firstDayOfWeek)
  }
</script>

<div class="month-container">
  <div class="header">
    {#if viewDate}
      <div class="monthYear font-medium-14">{monthYear}</div>
      <slot name="header" />
      {#if !hideNavigator}
        <div class="flex-row-center flex-no-shrink gap-2 tertiary-textColor">
          <ButtonIcon
            icon={IconChevronLeft}
            kind={'tertiary'}
            size={'extra-small'}
            inheritColor
            on:click={() => {
              viewDate.setDate(1)
              changeMonth(-1)
            }}
          />
          <ButtonIcon
            icon={IconChevronRight}
            kind={'tertiary'}
            size={'extra-small'}
            inheritColor
            on:click={() => {
              viewDate.setDate(1)
              changeMonth(1)
            }}
          />
        </div>
      {/if}
    {/if}
  </div>

  {#if viewDate}
    <div class="caption">
      {#each [...Array(7).keys()] as dayOfWeek}
        <span class="weekdays ui-regular-12">
          {capitalizeFirstLetter(getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), 'short'))}
        </span>
      {/each}
    </div>
    <div class="calendar">
      {#each days as day, i}
        <button
          class="day ui-regular-14 {day.classes}"
          class:today={isToday(i + 1)}
          class:day-off={day.dayOfWeek > 5}
          style="grid-column: {day.dayOfWeek + 1}/{day.dayOfWeek + 2};"
          on:click|stopPropagation={() => {
            viewDate.setDate(i + 1)
            selectedDate = new Date(viewDate)
            dispatch('update', viewDate)
          }}
        >
          <slot day={{ display: i + 1, date: new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1) }}>
            {i + 1}
          </slot>
          {#if $$slots.default && !replacementDay}{i + 1}{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .month-container {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    border-radius: var(--medium-BorderRadius);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-2) var(--spacing-2) var(--spacing-2) var(--spacing-2_75);

      .monthYear {
        white-space: nowrap;
        word-break: break-all;
        text-overflow: ellipsis;
        overflow: hidden;
        min-width: 0;
        color: var(--global-primary-TextColor);

        &::first-letter {
          text-transform: capitalize;
        }
      }
    }
  }

  .caption,
  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);

    .weekdays,
    .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 2rem;
      height: 2rem;
      margin: 0.125rem;
      color: var(--content-color);
    }
  }
  .caption {
    padding: 0 var(--spacing-2);

    .weekdays {
      height: 2rem;
      color: var(--dark-color);
      &::first-letter {
        text-transform: capitalize;
      }
    }
  }
  .calendar {
    padding: var(--spacing-1) var(--spacing-2) var(--spacing-2);

    .day {
      position: relative;
      margin: 0;
      padding: 0;
      color: var(--accent-color);
      background-color: rgba(var(--accent-color), 0.05);
      border: 1px solid transparent;
      border-radius: 0.25rem;
      outline: none;

      &.day-off {
        color: var(--content-color);
      }
      &.focused {
        box-shadow: 0 0 0 3px var(--primary-button-outline);
      }
      &:hover {
        color: var(--caption-color);
        background-color: var(--primary-button-transparent);
      }
      &.today:not(.selected) {
        font-weight: 700;
        color: var(--global-primary-LinkColor);
      }
      &.selected {
        font-weight: 700;
        color: var(--primary-button-color);
        background-color: var(--primary-button-default);
        cursor: default;
      }

      &:before {
        content: '';
        position: absolute;
        inset: -0.625rem;
      }
    }
  }
</style>
