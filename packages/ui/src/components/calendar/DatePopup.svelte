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
  import { afterUpdate, createEventDispatcher, onDestroy, onMount } from 'svelte'
  import ui from '../..'
  import type { TCellStyle, ICell } from './internal/DateUtils'
  import { firstDay, day, getWeekDayName, areDatesEqual, getMonthName, daysInMonth } from './internal/DateUtils'

  export let value: number | null | undefined
  export let mondayStart: boolean = true
  export let editable: boolean = false

  const dispatch = createEventDispatcher()
  let currentDate: Date = new Date(value ?? Date.now())
  let days: Array<ICell> = []
  let scrollDiv: HTMLElement

  $: if (value) currentDate = new Date(value)
  $: firstDayOfCurrentMonth = firstDay(currentDate, mondayStart)

  const getNow = (): Date => {
    const tempDate = new Date(Date.now())
    return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate())
  }
  const today: Date = getNow()
  let todayString: string
  translate(ui.string.Today, {}).then(res => todayString = res)


  const getDateStyle = (date: Date): TCellStyle => {
    if (value !== undefined && value !== null && areDatesEqual(currentDate, date)) return 'selected'
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
  }
  $: if (currentDate) renderCellStyles()

  const scrolling = (ev: Event): void => {
    // console.log('!!! Scrolling:', ev)
  }

  afterUpdate(() => {
    if (value) currentDate = new Date(value)
  })
  onMount(() => {
    if (scrollDiv) scrollDiv.addEventListener('wheel', scrolling)
  })
  onDestroy(() => {
    if (scrollDiv) scrollDiv.removeEventListener('wheel', scrolling)
  })
</script>

<div bind:this={scrollDiv} class="convert-scroller">
  <div class="popup">
    <div class="flex-center monthYear">
      {#if currentDate}
        {getMonthName(currentDate)}
        <span class="ml-1">{currentDate.getFullYear()}</span>
      {/if}
    </div>

    {#if currentDate}
      <div class="calendar" class:no-editable={!editable}>
        {#each [...Array(7).keys()] as dayOfWeek}
          <div class="caption">{getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), 'short')}</div>
        {/each}
        {#each days as day, i}
          <div
            class="day {day.style}"
            class:today={day.today}
            class:focused={day.focused}
            data-today={day.today ? todayString : ''}
            style="grid-column: {day.dayOfWeek}/{day.dayOfWeek + 1};"
            on:click|stopPropagation={() => {
              if (currentDate) currentDate.setDate(i + 1)
              value = currentDate.getTime()
              dispatch('update', value)
            }}
          >
            {i + 1}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .convert-scroller {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    border-radius: .5rem;
    user-select: none;

    overflow-x: scroll;
    overflow-y: scroll;
    // width: calc(100% - 1px);
    // max-height: calc(100% - 1px);
    // mask-image: linear-gradient(0deg, rgba(0, 0, 0, 0) 0, rgba(0, 0, 0, 1) 2rem, rgba(0, 0, 0, 1) calc(100% - 2rem), rgba(0, 0, 0, 0) 100%);
    &::-webkit-scrollbar:vertical { width: 0; }
    &::-webkit-scrollbar:horizontal { height: 0; }
  }

  .popup {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    height: 100%;
    // width: calc(100% + 1px);
    // height: calc(100% + 1px);
    color: var(--theme-caption-color);
    border-radius: .5rem;
    // pointer-events: none;
  }

  .monthYear {
    margin: 0 1rem;
    // line-height: 150%;
    color: var(--theme-content-accent-color);
    white-space: nowrap;
  }

  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: .125rem;

    .caption, .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 1.75rem;
      height: 1.75rem;
      color: var(--theme-content-dark-color);
    }
    .caption {
      font-size: .75rem;
      color: var(--theme-content-trans-color);
    }
    .day {
      background-color: rgba(var(--theme-caption-color), .05);
      border: 1px solid transparent;
      border-radius: .25rem;
      cursor: pointer;

      &.selected {
        background-color: var(--primary-button-enabled);
        border-color: var(--primary-button-focused-border);
        color: var(--primary-button-color);
      }
      &.today {
        position: relative;
        border-color: var(--theme-content-color);
        font-weight: 500;
        color: var(--theme-caption-color);

        &::after {
          position: absolute;
          content: attr(data-today);
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          font-weight: 600;
          font-size: .35rem;
          text-transform: uppercase;
          color: var(--theme-content-dark-color);
        }
      }
      &.focused { box-shadow: 0 0 0 3px var(--primary-button-outline); }
    }

    // &.no-editable { pointer-events: none; }
  }
</style>
