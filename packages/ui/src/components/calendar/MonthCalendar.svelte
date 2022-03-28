<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
<script type="ts">
  import { createEventDispatcher } from 'svelte'
  import { areDatesEqual, day, firstDay, getWeekDayName, isWeekend, weekday } from './internal/DateUtils'

  export let mondayStart = true
  export let weekFormat: 'narrow' | 'short' | 'long' | undefined = 'short'
  export let cellHeight: string | undefined = undefined
  export let value: Date = new Date()
  export let currentDate: Date = new Date()
  export let displayedWeeksCount = 6

  const dispatch = createEventDispatcher()

  $: firstDayOfCurrentMonth = firstDay(currentDate, mondayStart)

  function onSelect (date: Date) {
    value = date
    dispatch('change', value)
  }

  const todayDate = new Date()
</script>

<div class="month-calendar flex-grow">
  <div class="days-of-week-header">
    {#each [...Array(7).keys()] as dayOfWeek}
      <div class="day-name">{getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), weekFormat)}</div>
    {/each}
  </div>
  <div class="days-of-month">
    {#each [...Array(displayedWeeksCount).keys()] as weekIndex}
      {#each [...Array(7).keys()] as dayOfWeek}
        <div style={`grid-column-start: ${dayOfWeek + 1}; grid-row-start: ${weekIndex + 1}`}>
          <div style={`display: flex; width: 100%; height: ${cellHeight ? `${cellHeight};` : '100%;'}`}>
            <div
              class="cell flex-center"
              class:weekend={isWeekend(weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek))}
              class:today={areDatesEqual(todayDate, weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek))}
              class:selected={weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek).getMonth() ===
                currentDate.getMonth() && areDatesEqual(value, weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek))}
              class:wrongMonth={weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek).getMonth() !==
                currentDate.getMonth()}
              on:click={() => onSelect(weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek))}
            >
              {#if !$$slots.cell }
                {weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek).getDate()}
              {:else}
                <slot name="cell" date={weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek)} />
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/each}
  </div>
</div>

<style lang="scss">
  .day-name,
  .selected-month-controller {
    display: flex;
    justify-content: center;
  }
  .days-of-week-header,
  .days-of-month {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }
  .weekend {
    background-color: var(--theme-bg-accent-color);
  }
  .today {
    color: #a66600;
  }
  .selected {
    border-radius: 3px;
    background-color: var(--primary-button-enabled);
    border-color: var(--primary-button-focused-border);
    color: var(--primary-button-color);
  }
  .cell {
    height: calc(100% - 5px);
    width: calc(100% - 5px);
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }
  .cell:hover:not(.wrongMonth) {
    border: 1px solid var(--primary-button-focused-border);
    background-color: var(--primary-button-enabled);
    color: var(--primary-button-color);
  }
  .wrongMonth {
    color: var(--grayscale-grey-03);
  }
  .month-name {
    font-size: 14px;
    font-weight: bold;
    margin: 0 5px;
    color: var(--theme-content-dark-color);
  }
</style>
