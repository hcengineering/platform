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
  import { Scroller, deviceOptionsStore as deviceInfo, checkAdaptiveMatching } from '../..'

  export let mondayStart = true
  export let weekFormat: 'narrow' | 'short' | 'long' | undefined = 'long'
  export let cellHeight: string | undefined = undefined
  export let selectedDate: Date = new Date()
  export let currentDate: Date = selectedDate
  export let displayedWeeksCount = 6

  const dispatch = createEventDispatcher()

  $: devSize = $deviceInfo.size
  $: shortName = checkAdaptiveMatching(devSize, 'lg')

  $: firstDayOfCurrentMonth = firstDay(currentDate, mondayStart)

  function onSelect (date: Date) {
    dispatch('change', date)
  }

  const todayDate = new Date()
</script>

<Scroller fade={{ multipler: { top: 2.25, bottom: 0 } }}>
  <div class="days-of-week-header scroller-header">
    {#each [...Array(7).keys()] as dayOfWeek}
      <div class="day-name">
        {getWeekDayName(
          day(firstDayOfCurrentMonth, dayOfWeek),
          shortName && weekFormat === 'long' ? 'short' : weekFormat
        )}
      </div>
    {/each}
  </div>
  <div
    class="days-of-month"
    style:grid-template-rows={`repeat(${displayedWeeksCount}, ${cellHeight || 'minmax(0, 1fr)'})`}
  >
    {#each [...Array(displayedWeeksCount).keys()] as weekIndex}
      {#each [...Array(7).keys()] as dayOfWeek}
        {@const date = weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="cell"
          class:weekend={isWeekend(date)}
          class:wrongMonth={date.getMonth() !== currentDate.getMonth()}
          class:left-border={dayOfWeek !== 0}
          class:right-border={dayOfWeek === 6}
          style:grid-column-start={dayOfWeek + 1}
          style:grid-row-start={weekIndex + 1}
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
      {/each}
    {/each}
  </div>
</Scroller>

<style lang="scss">
  .days-of-week-header,
  .days-of-month {
    display: grid;
    grid-auto-columns: max-content;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    width: 100%;
  }
  .days-of-week-header {
    justify-content: center;
    align-items: center;
    width: 100%;
    min-width: 0;
    min-height: 2.25rem;
    color: var(--theme-darker-color);
    background-color: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);

    .day-name {
      text-align: center;
      &::first-letter {
        text-transform: uppercase;
      }
    }
  }
  .days-of-month {
    justify-items: stretch;
    align-items: stretch;
  }
  .cell {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-width: 0;
    border-bottom: 1px solid var(--theme-divider-color);
    cursor: pointer;

    &.weekend {
      background-color: var(--theme-button-default);
    }
    &.wrongMonth {
      color: var(--theme-trans-color);
    }

    &.left-border {
      border-left: 1px solid var(--theme-divider-color);
    }
  }
</style>
