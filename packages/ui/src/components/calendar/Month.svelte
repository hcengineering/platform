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
  export let mondayStart: boolean = true
  export let timeZone: string = getUserTimezone()
  export let hideNavigator: boolean = false
  export let replacementDay: boolean = false

  const dispatch = createEventDispatcher()

  let monthYear: string
  const today: Date = new Date(Date.now())
  const viewDate: Date = new Date(currentDate ?? today)
  $: firstDayOfCurrentMonth = firstDay(viewDate, mondayStart)
  const isToday = (n: number): boolean => {
    if (areDatesEqual(today, new Date(viewDate.getFullYear(), viewDate.getMonth(), n))) return true
    return false
  }

  let days: ICell[] = []
  const getDateStyle = (date: Date): TCellStyle => {
    if (currentDate != null) {
      const zonedTime = fromCurrentToTz(currentDate, timeZone)
      if (areDatesEqual(zonedTime, date)) {
        return 'selected'
      }
    }
    return 'not-selected'
  }
  const renderCellStyles = (): void => {
    days = []
    for (let i = 1; i <= daysInMonth(viewDate); i++) {
      const tempDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), i)
      days.push({
        dayOfWeek: tempDate.getDay() === 0 ? 7 : tempDate.getDay(),
        style: getDateStyle(tempDate)
      })
    }
    days = days
    monthYear = capitalizeFirstLetter(getMonthName(viewDate)) + ' ' + viewDate.getFullYear()
  }

  afterUpdate(() => {
    if (viewDate) renderCellStyles()
  })
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
              viewDate.setMonth(viewDate.getMonth() - 1)
              renderCellStyles()
            }}
          />
          <ButtonIcon
            icon={IconChevronRight}
            kind={'tertiary'}
            size={'extra-small'}
            inheritColor
            on:click={() => {
              viewDate.setMonth(viewDate.getMonth() + 1)
              renderCellStyles()
            }}
          />
        </div>
      {/if}
    {/if}
  </div>

  {#if viewDate}
    <div class="caption">
      {#each [...Array(7).keys()] as dayOfWeek}
        <span class="weekdays ui-regular-12"
          >{capitalizeFirstLetter(getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), 'short'))}</span
        >
      {/each}
    </div>
    <div class="calendar">
      {#each days as day, i}
        <button
          class="day ui-regular-14 {day.style}"
          class:today={isToday(i + 1)}
          class:day-off={day.dayOfWeek > 5}
          style="grid-column: {mondayStart ? day.dayOfWeek : day.dayOfWeek === 7 ? 1 : day.dayOfWeek + 1}/{mondayStart
            ? day.dayOfWeek + 1
            : day.dayOfWeek === 7
              ? 2
              : day.dayOfWeek + 2};"
          on:click|stopPropagation={() => {
            viewDate.setDate(i + 1)
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
