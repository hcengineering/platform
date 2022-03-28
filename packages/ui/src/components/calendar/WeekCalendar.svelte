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
  import { addZero, day, getMonday, getWeekDayName } from './internal/DateUtils'

  export let mondayStart = true
  export let cellHeight: string | undefined = undefined
  export let value: Date = new Date()
  export let currentDate: Date = new Date()
  export let displayedDaysCount = 7
  export let displayedHours = 24
  // export let startHour = 0

  const dispatch = createEventDispatcher()

  $: weekMonday = getMonday(currentDate, mondayStart)

  function onSelect (date: Date) {
    value = date
    dispatch('change', value)
  }
</script>

<table class="antiTable">
  <thead class="scroller-thead">
    <tr class="scroller-thead__tr">
      <th>Hours</th>
      {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
        <th>
          <div class="antiTable-cells">
            {getWeekDayName(day(weekMonday, dayOfWeek), 'short')}
            {day(weekMonday, dayOfWeek).getDate()}
          </div>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#if $$slots.cell}
      <slot name="header" date={day(weekMonday, 0)} days={displayedDaysCount} />
    {/if}
    {#each [...Array(displayedHours).keys()] as hourOfDay, row}
      <tr class="antiTable-body__row">
        <td style="width: 50px;" class="calendar-td">
          <div class="antiTable-cells__firstCell">
            {addZero(hourOfDay)}:00
          </div>
        </td>
        {#each [...Array(displayedDaysCount).keys()] as dayIndex}
          <td
            class="antiTable-body__border calendar-td cell"
            style={`height: ${cellHeight};`}
            on:click={(evt) => {
              onSelect(day(weekMonday, dayIndex))
            }}
          >
            {#if $$slots.cell}
              <slot name="cell" date={day(weekMonday, dayIndex, hourOfDay * 60)} />
            {/if}
          </td>
        {/each}        
      </tr>
    {/each}
  </tbody>
</table>

<style lang="scss">
  .calendar-td {
    padding: 0;
    margin: 0;
  }
  .selected {
    // border-radius: 3px;
    background-color: var(--primary-button-enabled);
    // border-color: var(--primary-button-focused-border);
    color: var(--primary-button-color);
    border-radius: 0.5rem;
    height: calc(100% - 5px);
    width: calc(100% - 5px);
  }
  .cell {
    width: 8rem;
    overflow: hidden;
  }
  .cell:hover:not(.wrongMonth) {
    // border: 1px solid var(--primary-button-focused-border);
    background-color: var(--primary-button-enabled);
    color: var(--primary-button-color);
  }
</style>
