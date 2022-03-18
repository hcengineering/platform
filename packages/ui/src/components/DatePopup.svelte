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
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import Back from './icons/Back.svelte'
  import Forward from './icons/Forward.svelte'
  import { createEventDispatcher } from 'svelte'
  import ui, { Label, Button } from '..'
  import type { TSelectDate, TCellStyle, ICell } from '../types'

  export let title: IntlString
  export let value: TSelectDate
  export let withTime: boolean = false

  const dispatch = createEventDispatcher()

  const getNow = (): Date => {
    let tempDate = new Date(Date.now())
    return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate())
  }
  let today: Date = getNow()
  let todayString: string
  async function todayStr() {
    todayString = await translate(ui.string.Today, {})
  }
  todayStr()

  let view: Date = (value === null || value === undefined) ? today : new Date(value)
  const months: Array<string> = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  let monthYear: string
  let days: Array<ICell> = []
  let result: TSelectDate = value
  const str: IntlString = '' as IntlString
  let prevDiv: HTMLElement
  let nextDiv: HTMLElement
  let hourDiv: HTMLElement
  let minDiv: HTMLElement
  let okDiv: HTMLButtonElement

  const daysInMonth = (date: Date): number => {
    return 33 - new Date(date.getFullYear(), date.getMonth(), 33).getDate()
  }

  const compareDates = (d1: Date, d2: Date): boolean => {
    if (d1.getFullYear() == d2.getFullYear() &&
        d1.getMonth() == d2.getMonth() &&
        d1.getDate() == d2.getDate()) return true
    return false
  }
  const getDateStyle = (date: Date): TCellStyle => {
    if (value !== undefined && value !== null && compareDates(value, date)) return 'selected'
    return 'not-selected'
  }
  
  const renderCellStyles = (): void => {
    days = []
    for (let i = 1; i <= daysInMonth(view); i++) {
      const tempDate = new Date(view.getFullYear(), view.getMonth(), i)
      days.push({
        dayOfWeek: (tempDate.getDay() === 0) ? 7 : tempDate.getDay(),
        style: getDateStyle(tempDate),
        today: compareDates(tempDate, today)
      })
    }
    days = days
  }
  renderCellStyles()

  $: monthYear = months[view.getMonth()] + ' ' + view.getFullYear()
  $: if (value) renderCellStyles()

  const zeroLead = (n: number): string => {
    if (n < 10) return '0' + n.toString()
    return n.toString()
  }

  const keyPress = (ev: KeyboardEvent, isHour: boolean): void => {
    if (ev.key >= '0' && ev.key <= '9') {
      const keyNumber: number = parseInt(ev.key, 10)
      let number: number = isHour ? view.getHours() : view.getMinutes()
      let newNumber: number = ((isHour && number > 2) || (!isHour && number > 5))
                                ? keyNumber
                                : number * 10 + keyNumber
      // console.log('keyN:', keyNumber, ' - N:', number, ' - newN:', newNumber)
      
      if (isHour) {
        if (newNumber > 23) newNumber = 23
        view.setHours(newNumber)
      } else {
        if (newNumber > 59) newNumber = 59
        view.setMinutes(newNumber)
      }
      view = view
      value = view
      if (isHour && newNumber > 9) minDiv.focus()
      if (!isHour && newNumber > 9) okDiv.focus()
    }
  }

  const keyDown = (ev: KeyboardEvent, isHour: boolean): void => {
    if (ev.key === 'Backspace') {
      console.log('BACKSPACE')
      if (isHour) view.setHours(0)
      else view.setMinutes(0)
      view = view
      value = view
    }
  }
  const navKey = (ev: KeyboardEvent): void => {
    if (ev.code === 'ArrowLeft') prevDiv.click()
    if (ev.code === 'ArrowRight') nextDiv.click()
  }
</script>

<svelte:window on:keydown={navKey} />
<div class="popup">
  <div class="flex-col caption-color">
    <div class="title"><Label label={title} /></div>
    <div class="flex-between nav">
      <button
        bind:this={prevDiv}
        class="focused-button arrow"
        on:click|preventDefault={() => {
          view.setMonth(view.getMonth() - 1)
          view = view
          renderCellStyles()
        }}><div class="icon"><Back size={'small'} /></div></button>
      <div class="monthYear">
        {monthYear}
      </div>
      <button
        bind:this={nextDiv}
        class="focused-button arrow"
        on:click|preventDefault={() => {
          view.setMonth(view.getMonth() + 1)
          view = view
          renderCellStyles()
        }}><div class="icon"><Forward size={'small'} /></div></button>
    </div>
  </div>

  <div class="calendar">
    <div class="caption">Mo</div>
    <div class="caption">Tu</div>
    <div class="caption">We</div>
    <div class="caption">Th</div>
    <div class="caption">Fr</div>
    <div class="caption">Sa</div>
    <div class="caption">Su</div>
    {#each days as day, i}
      <div
        class="day {day.style}"
        class:today={day.today}
        data-today={day.today ? todayString : ''}
        style="grid-column: {day.dayOfWeek}/{day.dayOfWeek + 1};"
        on:click={() => {
          result = new Date(view.getFullYear(), view.getMonth(), i + 1, view.getHours(), view.getMinutes())
          view = value = result
          if (withTime) {
            dispatch('update', result)
            hourDiv.focus()
          } else dispatch('close', result)
        }}
      >
        {i + 1}
      </div>
    {/each}
  </div>
  {#if withTime}
    <div class="calendar-divider" />
    <div class="flex-row-center flex-reverse">
      <div class="ml-2">
        <Button bind:input={okDiv} label={ui.string.Ok} size={'small'} primary on:click={() => { dispatch('close', view) }} />
      </div>
      <div class="time-container">
        <button
          bind:this={hourDiv}
          class="time-digit antiWrapper focus hours"
          on:keypress={(ev) => { keyPress(ev, true) }}
          on:keydown={(ev) => { keyDown(ev, true) }}
        >
          {zeroLead(view.getHours())}
        </button>
        <div class="time-divider">:</div>
        <button
          bind:this={minDiv}
          class="time-digit antiWrapper focus minutes"
          on:keypress={(ev) => { keyPress(ev, false) }}
          on:keydown={(ev) => { keyDown(ev, false) }}
        >
          {zeroLead(view.getMinutes())}
        </button>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    min-height: 0;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, .2);
    user-select: none;
  }

  .arrow {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .25rem;
  }

  .title {
    margin-bottom: .75rem;
    font-weight: 500;
    text-align: left;
  }
  .nav {
    min-width: 16.5rem;

    .monthYear {
      margin: 0 1rem;
      line-height: 150%;
      white-space: nowrap;
    }
  }

  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: .125rem;
    margin-top: .5rem;

    .caption, .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--theme-content-dark-color);
    }
    .caption { font-size: .75rem; }
    .day {
      border-radius: .5rem;
      border: 1px solid transparent;
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
    }
  }

  .calendar-divider {
    flex-shrink: 0;
    margin: .5rem 0;
    height: 1px;
    background-color: var(--theme-menu-divider);
  }
  .time-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    min-width: 0;
    height: 100%;
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
  }
  .time-digit, .time-divider {
    font-weight: 500;
    font-size: 1.25rem;
    cursor: pointer;
  }
  .time-divider {
    margin: 0 .5rem;
    font-size: 1rem;
    color: var(--theme-content-dark-color);
  }
  .time-digit {
    padding: 0;
    font-weight: 600;
    color: var(--theme-caption-color);
  }
</style>
