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
  import MonthCalendar from './MonthCalendar.svelte'
  import Scroller from '../Scroller.svelte'
  import { defaultSP } from '../..'

  /**
   * If passed, calendars will use monday as first day
   */
  export let mondayStart = true
  export let selectedDate: Date = new Date()
  export let currentDate: Date = selectedDate
  export let cellHeight: string | undefined = undefined
  export let minWidth = '18rem'

  function getMonthName (date: Date): string {
    return new Intl.DateTimeFormat('default', { month: 'long' }).format(date)
  }
  function month (date: Date, m: number): Date {
    date = new Date(date)
    date.setDate(1)
    date.setMonth(m)
    return date
  }
</script>

<Scroller padding={'0 2.25rem'} fade={defaultSP}>
  <div class="year-erp-calendar">
    {#each [...Array(12).keys()] as m}
      <div class="antiComponentBox flex-col flex-grow flex-wrap" style:min-width={minWidth}>
        <span class="month-caption">{getMonthName(month(currentDate, m))}</span>
        <MonthCalendar
          {cellHeight}
          weekFormat="narrow"
          bind:selectedDate
          currentDate={month(currentDate, m)}
          {mondayStart}
          on:change
        >
          <svelte:fragment slot="cell" let:date let:today let:selected let:wrongMonth>
            <slot name="cell" {date} {today} {selected} {wrongMonth} />
          </svelte:fragment>
        </MonthCalendar>
      </div>
    {/each}
  </div>
</Scroller>

<style lang="scss">
  .year-erp-calendar {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(max(20rem, calc(100% / 5)), 1fr));
    grid-auto-rows: 18.5rem;
    row-gap: 1rem;
    column-gap: 1rem;
    border-collapse: collapse;
  }
  .month-caption {
    margin: 0.5rem 0.75rem 0.75rem;
    font-weight: 500;
    font-size: 0.8125rem;
    text-transform: uppercase;
    color: var(--theme-dark-color);
  }
</style>
