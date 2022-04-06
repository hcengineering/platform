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
  import { translate } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import ui, { dpstore, IconNavPrev, IconNavNext, Icon } from '../..'
  import { TCellStyle, ICell } from './internal/DateUtils'
  import { firstDay, day, getWeekDayName, areDatesEqual, getMonthName, daysInMonth } from './internal/DateUtils'

  let currentDate: Date
  $: if ($dpstore.currentDate) currentDate = $dpstore.currentDate

  let mondayStart: boolean = true
  let monthYear: string
  const capitalizeFirstLetter = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)

  const dispatch = createEventDispatcher()

  $: firstDayOfCurrentMonth = firstDay(currentDate, mondayStart)
  let days: Array<ICell> = []

  const getNow = (): Date => {
    const tempDate = new Date(Date.now())
    return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate())
  }
  const today: Date = getNow()
  let todayString: string
  translate(ui.string.Today, {}).then(res => todayString = res)

  const getDateStyle = (date: Date): TCellStyle => {
    if (areDatesEqual(currentDate, date)) return 'selected'
    return 'not-selected'
  }
  
  const renderCellStyles = (): void => {
    days = []
    for (let i = 1; i <= daysInMonth(currentDate); i++) {
      const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      days.push({
        dayOfWeek: (tempDate.getDay() === 0) ? 7 : tempDate.getDay(),
        style: getDateStyle(tempDate),
        focused: false,
        today: areDatesEqual(tempDate, today)
      })
    }
    days = days
    monthYear = capitalizeFirstLetter(getMonthName(currentDate)) + ' ' + currentDate.getFullYear()
  }
  $: if (currentDate) renderCellStyles()
</script>

<div class="daterange-popup-container">
  <div class="header">
    {#if currentDate}
      <div class="monthYear">{monthYear}</div>
      <div class="group">
        <div class="btn" on:click={() => {
          currentDate.setMonth(currentDate.getMonth() - 1)
          renderCellStyles()
        }}>
          <div class="icon-btn"><Icon icon={IconNavPrev} size={'full'} /></div>
        </div>
        <div class="btn" on:click={() => {
          currentDate.setMonth(currentDate.getMonth() + 1)
          renderCellStyles()
        }}>
          <div class="icon-btn"><Icon icon={IconNavNext} size={'full'} /></div>
        </div>
      </div>
    {/if}
  </div>

  {#if currentDate}
    <div class="calendar">
      {#each [...Array(7).keys()] as dayOfWeek}
        <span class="caption">{capitalizeFirstLetter(getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), 'short'))}</span>
      {/each}
      {#each days as day, i}
        <div
          class="day {day.style}"
          class:today={day.today}
          class:focused={day.focused}
          class:day-off={day.dayOfWeek > 5}
          data-today={day.today ? todayString : ''}
          style="grid-column: {day.dayOfWeek}/{day.dayOfWeek + 1};"
          on:click|stopPropagation={() => {
            currentDate.setDate(i + 1)
            dispatch('close', currentDate)
          }}
        >
          {i + 1}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .daterange-popup-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    height: 100%;
    color: var(--theme-caption-color);
    background: var(--popup-bg-color);
    border-radius: .5rem;
    box-shadow: var(--popup-shadow);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1rem .75rem;
      color: var(--caption-color);

      .monthYear {
        font-weight: 500;
        font-size: 1rem;
        &::first-letter { text-transform: capitalize; }
      }
      .group {
        display: flex;
        align-items: center;
        .btn {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 1.25rem;
          height: 1.75rem;
          color: var(--dark-color);
          cursor: pointer;

          .icon-btn { height: .75rem; }
          &:hover { color: var(--accent-color); }
        }
      }
    }
  }

  .calendar {
    position: relative;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: .5rem;
    padding: 0 1rem 1rem;

    .caption, .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 1.625rem;
      height: 1.625rem;
      font-size: 1rem;
      color: var(--content-color);
    }
    .caption {
      align-items: start;
      height: 2rem;
      color: var(--dark-color);
      &::first-letter { text-transform: capitalize; }
    }
    .day {
      position: relative;
      color: var(--accent-color);
      background-color: rgba(var(--accent-color), .05);
      border: 1px solid transparent;
      border-radius: 50%;
      cursor: pointer;

      &.day-off { color: var(--content-color); }
      &.today {
        position: relative;
        font-weight: 500;
        color: var(--caption-color);
        background-color: var(--button-bg-color);
        border-color: var(--dark-color);
      }
      &.focused { box-shadow: 0 0 0 3px var(--primary-button-outline); }
      &.selected, &:hover {
        color: var(--caption-color);
        background-color: var(--primary-bg-color);
      }

      &:before {
        content: '';
        position: absolute;
        inset: -.625rem;
      }
    }

    &::before {
      position: absolute;
      content: '';
      top: 2rem;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--button-bg-color);
    }
  }
</style>
