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
  import MonthCalendar from './MonthCalendar.svelte'

  /**
   * If passed, calendars will use monday as first day
   */
  export let mondayStart = true
  export let value: Date = new Date()
  export let currentDate: Date = new Date()
  export let cellHeight: string | undefined = undefined
  export let minWidth = '18rem'

  function getMonthName (date: Date): string {
    const locale = new Intl.NumberFormat().resolvedOptions().locale
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
  }
  function month (date: Date, m: number): Date {
    date = new Date(date)
    date.setMonth(m)
    return date
  }
</script>

<div class="year-erp-calendar">
  {#each [...Array(12).keys()] as m}
    <div class="antiComponentBox mt-2 mb-2 ml-2 mr-2 flex-grow" style={`min-width: ${minWidth};`}>
      {getMonthName(month(value, m))}
      <MonthCalendar {cellHeight} weekFormat="narrow" bind:value currentDate={month(currentDate, m)} {mondayStart} on:change>
        <!----> eslint-disable-next-line no-undef -->
        <svelte:fragment slot="cell" let:date={date}>
          <slot name="cell" date={date} />
        </svelte:fragment>
      </MonthCalendar>
    </div>
  {/each}
</div>

<style lang="scss">
  .year-erp-calendar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-collapse: collapse;
    .row {
      display: table-row;
    }
    .th {
      display: table-cell;
    }
    .calendar {
      display: table-cell;
      padding: 0.3em;
    }
  }
</style>
