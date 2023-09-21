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
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import IconArrowLeft from '../icons/ArrowLeft.svelte'
  import IconArrowRight from '../icons/ArrowRight.svelte'
  import Button from '../Button.svelte'
  import { firstDay, day, getWeekDayName, areDatesEqual, getMonthName, weekday, isWeekend } from './internal/DateUtils'
  import { capitalizeFirstLetter } from '../../utils'

  export let currentDate: Date | null
  export let viewDate: Date
  export let mondayStart: boolean = true
  export let hideNavigator: 'all' | 'left' | 'right' | 'none' = 'none'
  export let viewUpdate: boolean = true
  export let noPadding: boolean = false
  export let displayedWeeksCount = 6
  export let selectedTo: Date | null | undefined = undefined

  const dispatch = createEventDispatcher()

  $: firstDayOfCurrentMonth = firstDay(viewDate, mondayStart)
  let monthYear: string
  const today: Date = new Date(Date.now())

  afterUpdate(() => {
    monthYear = capitalizeFirstLetter(getMonthName(viewDate)) + ' ' + viewDate.getFullYear()
    firstDayOfCurrentMonth = firstDay(viewDate, mondayStart)
  })

  function inRange (currentDate: Date | null, selectedTo: Date | null | undefined, target: Date): boolean {
    if (currentDate == null || selectedTo == null) return false
    if (areDatesEqual(currentDate, selectedTo)) return false
    const startDate = currentDate < selectedTo ? currentDate : selectedTo
    const endDate = currentDate > selectedTo ? currentDate : selectedTo
    return target > startDate && target < endDate
  }

  function isSelected (currentDate: Date | null, selectedTo: Date | null | undefined, target: Date): boolean {
    if (currentDate != null && areDatesEqual(currentDate, target)) return true
    if (selectedTo != null && areDatesEqual(selectedTo, target)) return true
    return false
  }

  function getNextDate (date: Date, shift: 1 | -1): Date {
    return new Date(new Date(date).setDate(date.getDate() + shift))
  }

  function isPreviosDateWrong (date: Date): boolean {
    return getNextDate(date, -1).getMonth() !== viewDate.getMonth()
  }

  function isNextDateWrong (date: Date): boolean {
    return getNextDate(date, 1).getMonth() !== viewDate.getMonth()
  }

  function isStart (currentDate: Date | null, selectedTo: Date | null | undefined, target: Date): boolean {
    if (currentDate == null || selectedTo == null) return false
    const startDate = currentDate < selectedTo ? currentDate : selectedTo
    return areDatesEqual(startDate, target)
  }

  function isEnd (currentDate: Date | null, selectedTo: Date | null | undefined, target: Date): boolean {
    if (currentDate == null || selectedTo == null) return false
    const endDate = currentDate > selectedTo ? currentDate : selectedTo
    return areDatesEqual(endDate, target)
  }
</script>

<div class="month-container">
  <div class="header">
    {#if viewDate}
      <div class="monthYear">{monthYear}</div>
      <div class="flex-row-center gap-1-5 mr-1">
        {#if !(hideNavigator === 'left' || hideNavigator === 'all')}
          <Button
            kind={'ghost'}
            size={'medium'}
            icon={IconArrowLeft}
            on:click={() => {
              if (viewUpdate) viewDate.setMonth(viewDate.getMonth() - 1)
              dispatch('navigation', -1)
            }}
          />
        {/if}
        {#if !(hideNavigator === 'right' || hideNavigator === 'all')}
          <Button
            kind={'ghost'}
            size={'medium'}
            icon={IconArrowRight}
            on:click={() => {
              if (viewUpdate) viewDate.setMonth(viewDate.getMonth() + 1)
              dispatch('navigation', 1)
            }}
          />
        {/if}
      </div>
    {/if}
  </div>

  {#if viewDate}
    <div class="calendar" class:noPadding>
      {#each [...Array(7).keys()] as dayOfWeek}
        <span class="caption"
          >{capitalizeFirstLetter(getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), 'short'))}</span
        >
      {/each}

      {#each [...Array(displayedWeeksCount).keys()] as weekIndex}
        {#each [...Array(7).keys()] as dayOfWeek}
          {@const date = weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek)}
          {@const wrongM = date.getMonth() !== viewDate.getMonth()}
          <div
            class="container"
            class:range={inRange(currentDate, selectedTo, date)}
            class:selected={isSelected(currentDate, selectedTo, date)}
            class:startRow={dayOfWeek === 0 || isPreviosDateWrong(date) || isStart(currentDate, selectedTo, date)}
            class:endRow={dayOfWeek === 6 || isNextDateWrong(date) || isEnd(currentDate, selectedTo, date)}
            class:wrongMonth={wrongM}
          >
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="day"
              class:weekend={isWeekend(date)}
              class:today={areDatesEqual(today, date)}
              class:range={inRange(currentDate, selectedTo, date)}
              class:selected={isSelected(currentDate, selectedTo, date)}
              class:wrongMonth={wrongM}
              style={`grid-column-start: ${dayOfWeek + 1}; grid-row-start: ${weekIndex + 2};`}
              on:click|stopPropagation={(ev) => {
                if (wrongM) {
                  ev.preventDefault()
                  return
                }
                viewDate = new Date(date)
                if (currentDate) {
                  viewDate.setHours(currentDate.getHours())
                  viewDate.setMinutes(currentDate.getMinutes())
                }
                dispatch('update', viewDate)
              }}
            >
              {date.getDate()}
            </div>
          </div>
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .month-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    color: var(--theme-caption-color);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      margin-bottom: 0.25rem;
      height: 2.25rem;
      color: var(--theme-caption-color);

      .monthYear {
        font-weight: 500;
        font-size: 1rem;
        &::first-letter {
          text-transform: capitalize;
        }
      }
    }
  }

  .calendar {
    position: relative;
    display: grid;
    grid-template-columns: repeat(7, 1fr);

    .caption,
    .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 2rem;
      height: 2rem;
      font-size: 1rem;
      color: var(--theme-content-color);
    }
    .caption {
      margin-bottom: 0.5rem;
      height: 2.25rem;
      color: var(--theme-dark-color);
      &::first-letter {
        text-transform: capitalize;
      }
    }
    &:not(.noPadding) {
      padding: 0 1rem 1rem;

      .caption {
        padding: 0.25rem;
      }
    }

    .container {
      border: 0px solid transparent;
      margin: 0.125rem 0;
      padding: 0 0.125rem;

      &.range:not(.wrongMonth),
      &.selected:not(.wrongMonth) {
        color: var(--theme-caption-color);
      }
      &.startRow:not(.wrongMonth) {
        border-top-left-radius: 0.25rem;
        border-bottom-left-radius: 0.25rem;
        padding-left: 0;
        margin-left: 0.125rem;
      }
      &.endRow:not(.wrongMonth) {
        border-top-right-radius: 0.25rem;
        border-bottom-right-radius: 0.25rem;
        padding-right: 0;
        margin-right: 0.125rem;
      }
    }

    .day {
      position: relative;
      color: var(--theme-content-color);
      // background-color: rgba(var(--theme-content-color), 0.05);
      border: 1px solid transparent;
      border-radius: 0.25rem;

      cursor: pointer;

      &.weekend {
        color: var(--theme-content-color);
      }
      &.wrongMonth {
        color: var(--theme-trans-color);
        cursor: default;
      }
      &.today:not(.worngMonth, .selected, .range) {
        font-weight: 500;
        background-color: var(--theme-button-focused);
        border-color: var(--theme-button-border);
      }
      &.selected:not(.wrongMonth) {
        color: var(--accented-button-color);
        background-color: var(--accented-button-default);
      }

      &:not(.wrongMonth):hover {
        color: var(--theme-caption-color);
        background-color: var(--accented-button-transparent);
      }
    }

    &::before {
      position: absolute;
      content: '';
      top: 2.25rem;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--theme-divider-color);
    }
  }
</style>
