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
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { areDatesEqual, day, firstDay, getWeekDayName, isWeekend, weekday } from './internal/DateUtils'

  export let mondayStart = true
  export let weekFormat: 'narrow' | 'short' | 'long' | undefined = 'short'
  export let cellHeight: string | undefined = undefined
  export let selectedDate: Date = new Date()
  export let currentDate: Date = selectedDate
  export let displayedWeeksCount = 6

  const dispatch = createEventDispatcher()

  $: firstDayOfCurrentMonth = firstDay(currentDate, mondayStart)

  function onSelect (date: Date) {
    dispatch('change', date)
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
        {@const date = weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek)}
        <div style={`grid-column-start: ${dayOfWeek + 1}; grid-row-start: ${weekIndex + 1}`}>
          <div style={`display: flex; width: 100%; height: ${cellHeight ? `${cellHeight};` : '100%;'}`}>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="cell flex-center"
              class:weekend={isWeekend(date)}
              class:wrongMonth={date.getMonth() !== currentDate.getMonth()}
              on:click={() => onSelect(date)}
            >
              {#if !$$slots.cell}
                {date.getDate()}
              {:else}
                <slot
                  name="cell"
                  {date}
                  today={areDatesEqual(todayDate, date)}
                  selected={areDatesEqual(selectedDate, date)}
                  wrongMonth={date.getMonth() !== currentDate.getMonth()}
                />
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/each}
  </div>
</div>

<style lang="scss">
  .month-calendar {
    user-select: none;
    cursor: default;
  }
  .day-name {
    display: flex;
    justify-content: center;
  }
  .days-of-week-header,
  .days-of-month {
    display: grid;
    grid-auto-columns: max-content;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
  .cell {
    height: calc(100% - 5px);
    width: calc(100% - 5px);
    border-radius: 0.5rem;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .cell:hover {
    color: var(--accented-button-color);
    background-color: var(--highlight-hover);
  }
  .weekend {
    background-color: var(--highlight-select);
    &:hover {
      background-color: var(--highlight-select-hover);
    }
  }
  .wrongMonth {
    color: var(--theme-trans-color);
  }
</style>
