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
  import { createEventDispatcher } from 'svelte'
  import ui, { Button, ActionIcon, IconClose } from '../..'
  import { TCellStyle, ICell } from './internal/DateUtils'
  import { firstDay, day, getWeekDayName, areDatesEqual, getMonthName, daysInMonth } from './internal/DateUtils'
  import Month from './Month.svelte'

  export let currentDate: Date | null
  export let mondayStart: boolean = true

  const dispatch = createEventDispatcher()

  const changeMonth = (date: Date, up: boolean): Date => {
    return new Date(date.getFullYear(), date.getMonth() + (up ? 1 : -1), date.getDate())
  }
  const today: Date = new Date(Date.now())
  let viewDate: Date = (currentDate != undefined) ? changeMonth(currentDate, true) : changeMonth(today, true)

  const onChange = (ev: Event): void => {
    console.log('!!! onChange - ev', ev)
    const el: HTMLInputElement = ev.target as HTMLInputElement
    if (currentDate != undefined) {
      viewDate = changeMonth(currentDate ?? today, true)
    }
  }
  const updateDate = (result: any): void => {
    if (result.detail != undefined) {
      currentDate = result.detail
      currentDate = currentDate
    }
  }
</script>

<div class="date-popup-container">
  <div class="header">
    <span class="fs-title overflow-label">Add due date</span>
    <ActionIcon icon={IconClose} size={'small'} action={() => { dispatch('close') }} />
  </div>
  <div class="content">
    <div class="label">
      <span class="bold">Due Date</span><span class="divider">-</span>Issue needs to be completed by this date
    </div>
    <input class="datetime" autocomplete="off" type="datetime-local" value={currentDate} on:change={onChange} />
    <div class="month-group">
      <Month
        bind:currentDate={currentDate}
        viewDate={changeMonth(viewDate, false)}
        {mondayStart}
        viewUpdate={false}
        hideNavigator
        on:update={updateDate}
      />
      <Month
        bind:currentDate={currentDate}
        bind:viewDate
        {mondayStart}
        viewUpdate={false}
        on:update={updateDate}
      />
    </div>
  </div>
  <div class="footer">
    <Button kind={'primary'} label={ui.string.Ok} size={'x-large'} width={'100%'} />
  </div>
</div>

<style lang="scss">
  .date-popup-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
    width: max-content;
    height: max-content;
    color: var(--theme-caption-color);
    background: var(--board-card-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: .5rem;
    box-shadow: var(--card-shadow);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem 1rem 2rem;
      border-bottom: 1px solid var(--divider-color);
    }

    .content {
      display: flex;
      flex-direction: column;
      padding: 1.5rem 2rem;

      .label {
        padding-left: 2px;
        margin-bottom: .25rem;
        font-size: .8125rem;
        color: var(--content-color);

        .bold {
          font-weight: 500;
          color: var(--accent-color);
        }
        .divider {
          margin: 0 .5rem;
          line-height: 1.4375rem;
          color: var(--dark-color);
        }
      }

      .month-group {
        display: flex;
        flex-wrap: nowrap;
        margin: .5rem -.5rem 0;
      }
    }

    .footer {
      padding: 1rem 2rem;
      border-top: 1px solid var(--divider-color);
    }
  }

  .datetime {
    margin: 0;
    padding: .75rem;
    height: 3rem;
    font-family: inherit;
    font-size: .8125rem;
    color: var(--content-color);
    background-color: var(--body-color);
    border: 1px solid var(--button-border-color);
    border-radius: .25rem;
    background-clip: padding-box;
    text-transform: uppercase;
    appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button,
    &::-webkit-calendar-picker-indicator {
      display: none;
      -webkit-appearance: none;
      margin: 0;
    }
    &::-webkit-input-placeholder {  visibility: hidden !important; }
    &:hover { border-color: var(--button-border-hover); }
    &:focus {
      color: var(--caption-color);
      border-color: var(--primary-edit-border-color);
    }
  }
</style>
