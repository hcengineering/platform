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
  import ui, { Scroller, Label } from '../..'
  import { addZero, areDatesEqual, day as getDay, getMonday, getWeekDayName } from './internal/DateUtils'

  export let mondayStart = true
  export let cellHeight: string | undefined = undefined
  export let selectedDate: Date = new Date()
  export let currentDate: Date = selectedDate
  export let displayedDaysCount = 7
  export let displayedHours = 24
  export let startFromWeekStart = true
  // export let startHour = 0

  const dispatch = createEventDispatcher()

  const todayDate = new Date()

  $: weekMonday = startFromWeekStart
    ? getMonday(currentDate, mondayStart)
    : new Date(new Date(currentDate).setHours(0, 0, 0, 0))
</script>

<Scroller fade={{ multipler: { top: 3, bottom: 0 } }}>
  <table>
    <thead class="scroller-thead">
      <tr class="scroller-thead__tr">
        <th><Label label={ui.string.HoursLabel} /></th>
        {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
          {@const day = getDay(weekMonday, dayOfWeek)}
          <th>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="cursor-pointer uppercase flex-col-center"
              class:today={areDatesEqual(todayDate, day)}
              on:click={() => {
                dispatch('select', day)
              }}
            >
              <div class="flex-center">{getWeekDayName(day, 'short')}</div>
              <div class="flex-center">{day.getDate()}</div>
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each [...Array(displayedHours).keys()] as hourOfDay}
        <tr>
          <td style="width: 50px;" class="calendar-td first">
            {#if hourOfDay !== 0}
              {addZero(hourOfDay)}:00
            {/if}
          </td>
          {#each [...Array(displayedDaysCount).keys()] as dayIndex}
            <td class="calendar-td cell" style:height={cellHeight}>
              {#if $$slots.cell}
                <slot name="cell" date={getDay(weekMonday, dayIndex, hourOfDay * 60)} />
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</Scroller>

<style lang="scss">
  table {
    table-layout: fixed;
  }
  table tr th:nth-child(1) {
    width: 5rem;
  }
  .today {
    color: var(--theme-caption-color);
  }
  .calendar-td {
    &:not(.first) {
      border: 1px solid var(--theme-table-border-color);
    }
    padding: 0;
    margin: 0;
    &.first {
      display: flex;
      margin-top: -0.5rem;
    }
  }
  .cell {
    padding: 2px;
    width: calc(calc(100% - 50px) / 7);
  }
  .cell:hover {
    color: var(--accented-button-color);
    background-color: var(--highlight-hover);
  }
</style>
