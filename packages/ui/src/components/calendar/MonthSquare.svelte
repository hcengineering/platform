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
  import IconNavPrev from '../icons/NavPrev.svelte'
  import IconNavNext from '../icons/NavNext.svelte'
  import Icon from '../Icon.svelte'
  import { firstDay, day, getWeekDayName, areDatesEqual, getMonthName, weekday, isWeekend } from './internal/DateUtils'

  export let currentDate: Date | null
  export let viewDate: Date
  export let mondayStart: boolean = true
  export let hideNavigator: boolean = false
  export let viewUpdate: boolean = true
  export let displayedWeeksCount = 6

  const dispatch = createEventDispatcher()

  $: firstDayOfCurrentMonth = firstDay(viewDate, mondayStart)
  let monthYear: string
  const today: Date = new Date(Date.now())
  const capitalizeFirstLetter = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)

  if (viewDate === undefined) viewDate = currentDate ?? today
  afterUpdate(() => {
    if (currentDate && viewUpdate) viewDate = currentDate
    if (viewDate) {
      monthYear = capitalizeFirstLetter(getMonthName(viewDate)) + ' ' + viewDate.getFullYear()
      firstDayOfCurrentMonth = firstDay(viewDate, mondayStart)
    }
  })
</script>

<div class="month-container">
  <div class="header">
    {#if viewDate}
      <div class="monthYear">{monthYear}</div>
      <div class="group" class:hideNavigator>
        <div
          class="btn"
          on:click={() => {
            if (viewUpdate) viewDate.setMonth(viewDate.getMonth() - 1)
            dispatch('navigation', '-m')
          }}
        >
          <div class="icon-btn"><Icon icon={IconNavPrev} size={'full'} /></div>
        </div>
        <div
          class="btn"
          on:click={() => {
            if (viewUpdate) viewDate.setMonth(viewDate.getMonth() + 1)
            dispatch('navigation', '+m')
          }}
        >
          <div class="icon-btn"><Icon icon={IconNavNext} size={'full'} /></div>
        </div>
      </div>
    {/if}
  </div>

  {#if viewDate}
    <div class="calendar">
      {#each [...Array(7).keys()] as dayOfWeek}
        <span class="caption"
          >{capitalizeFirstLetter(getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), 'short'))}</span
        >
      {/each}

      {#each [...Array(displayedWeeksCount).keys()] as weekIndex}
        {#each [...Array(7).keys()] as dayOfWeek}
          {@const wrongM = weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek).getMonth() !== viewDate.getMonth()}
          <div
            class="day"
            class:weekend={isWeekend(weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek))}
            class:today={areDatesEqual(today, weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek))}
            class:selected={currentDate &&
              weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek).getMonth() === currentDate.getMonth() &&
              areDatesEqual(currentDate, weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek))}
            class:wrongMonth={wrongM}
            style={`grid-column-start: ${dayOfWeek + 1}; grid-row-start: ${weekIndex + 2};`}
            on:click|stopPropagation={(ev) => {
              if (wrongM) {
                ev.preventDefault()
                return
              }
              viewDate = weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek)
              if (currentDate) {
                viewDate.setHours(currentDate.getHours())
                viewDate.setMinutes(currentDate.getMinutes())
              }
              dispatch('update', viewDate)
            }}
          >
            {weekday(firstDayOfCurrentMonth, weekIndex, dayOfWeek).getDate()}
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
    width: 100%;
    height: 100%;
    color: var(--caption-color);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1rem 0.75rem;
      color: var(--caption-color);

      .monthYear {
        font-weight: 500;
        font-size: 1rem;
        &::first-letter {
          text-transform: capitalize;
        }
      }
      .group {
        display: flex;
        align-items: center;

        &.hideNavigator {
          visibility: hidden;
        }
        .btn {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 1.25rem;
          height: 1.75rem;
          color: var(--dark-color);
          cursor: pointer;

          .icon-btn {
            height: 0.75rem;
          }
          &:hover {
            color: var(--accent-color);
          }
        }
      }
    }
  }

  .calendar {
    position: relative;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.5rem;
    padding: 0 1rem 1rem;

    .caption,
    .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 1.625rem;
      height: 1.625rem;
      font-size: 1rem;
      color: var(--content-color);
    }
    .caption {
      align-items: start;
      height: 2rem;
      color: var(--dark-color);
      &::first-letter {
        text-transform: capitalize;
      }
    }
    .day {
      position: relative;
      color: var(--accent-color);
      background-color: rgba(var(--accent-color), 0.05);
      border: 1px solid transparent;
      border-radius: 50%;
      cursor: pointer;

      &.weekend {
        color: var(--content-color);
      }
      &.wrongMonth {
        color: var(--dark-color);
        cursor: default;
      }
      &.today {
        font-weight: 500;
        color: var(--caption-color);
        background-color: var(--button-bg-color);
        border-color: var(--dark-color);
      }
      &.selected:not(.wrongMonth),
      &:not(.wrongMonth):hover {
        color: var(--caption-color);
        background-color: var(--primary-bg-color);
      }

      &:before {
        content: '';
        position: absolute;
        inset: -0.625rem;
      }
    }

    &::before {
      position: absolute;
      content: '';
      top: 2rem;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--button-bg-color);
    }
  }
</style>
