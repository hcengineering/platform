<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import ui from '../../plugin'
  import ActionIcon from '../ActionIcon.svelte'
  import Button from '../Button.svelte'
  import Label from '../Label.svelte'
  import IconClose from '../icons/Close.svelte'
  import DateInputBox from './DateInputBox.svelte'
  import MonthSquare from './MonthSquare.svelte'

  export let startDate: Date | null
  export let endDate: Date | null
  export let label: IntlString
  export let mondayStart: boolean = true

  const dispatch = createEventDispatcher()

  const today: Date = new Date(Date.now())

  let viewDate: Date = startDate ?? today
  let dateInput: DateInputBox
  let endDateInput: DateInputBox

  const saveDate = (): void => {
    if (startDate) {
      startDate.setHours(0, 0, 0, 0)
      if (endDate) {
        endDate.setHours(0, 0, 0, 0)
        if (endDate < startDate) {
          const swap = endDate
          endDate = startDate
          startDate = swap
        }
      }
      viewDate = startDate
      dispatch('update', {
        startDate,
        endDate
      })
    } else if (endDate) {
      startDate = endDate
      startDate.setHours(0, 0, 0, 0)
      endDate = null
      viewDate = startDate
      dispatch('update', {
        startDate,
        endDate
      })
    }
    viewDateSec = changeMonth(startDate, endDate)
  }
  const closeDP = (): void => {
    if (!dateInput.isNull(startDate, false)) saveDate()
    else {
      startDate = null
      endDate = null
      dispatch('update', {
        startDate,
        endDate
      })
    }
    dispatch('close', {
      startDate,
      endDate
    })
  }

  const updateDate = (date: Date | null): void => {
    if (date) {
      if (startDate == null) {
        startDate = date
      } else if (endDate == null) {
        if (date < startDate) {
          endDate = startDate
          startDate = date
        } else {
          endDate = date
        }
      } else {
        startDate = date
        endDate = null
      }
    }
  }
  const navigateMonth = (result: any): void => {
    if (result) {
      viewDate.setMonth(viewDate.getMonth() + result)
      viewDate = viewDate
      viewDateSec.setMonth(viewDateSec.getMonth() + result)
      viewDateSec = viewDateSec
    }
  }
  const changeMonth = (date: Date | null, endDate: Date | null): Date => {
    if (date == null) {
      date = new Date()
    }
    if (endDate == null || (date.getMonth() === endDate.getMonth() && date.getFullYear() === endDate.getFullYear())) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 1)
    }
    return new Date(endDate)
  }

  let viewDateSec: Date = changeMonth(startDate, endDate)
</script>

<div class="date-popup-container">
  <div class="header">
    <span class="fs-title overflow-label"><Label {label} /></span>
    <ActionIcon
      icon={IconClose}
      size={'small'}
      action={() => {
        dispatch('close', {})
      }}
    />
  </div>
  <div class="content">
    <div class="flex-between">
      <div class="input">
        <DateInputBox bind:this={dateInput} bind:currentDate={startDate} on:close={closeDP} on:save={saveDate} />
      </div>
      <div class="input">
        <DateInputBox bind:this={endDateInput} bind:currentDate={endDate} on:close={closeDP} on:save={saveDate} />
      </div>
    </div>

    <div class="month-group flex-between">
      <MonthSquare
        bind:currentDate={startDate}
        selectedTo={endDate}
        {viewDate}
        {mondayStart}
        viewUpdate={false}
        hideNavigator="right"
        on:update={(result) => updateDate(result.detail)}
        on:navigation={(result) => navigateMonth(result.detail)}
      />
      <MonthSquare
        bind:currentDate={endDate}
        selectedTo={startDate}
        viewDate={viewDateSec}
        {mondayStart}
        viewUpdate={false}
        hideNavigator="left"
        on:update={(result) => updateDate(result.detail)}
        on:navigation={(result) => navigateMonth(result.detail)}
      />
    </div>
  </div>
  <div class="footer">
    <Button kind={'accented'} label={ui.string.Save} size={'x-large'} on:click={() => closeDP()} />
  </div>
</div>

<style lang="scss">
  .date-popup-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
    width: 40rem;
    height: max-content;
    color: var(--caption-color);
    background: var(--theme-popup-color);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem 1rem 2rem;
      border-bottom: 1px solid var(--theme-popup-divider);
    }

    .content {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 1.75rem;
      min-height: 0;

      .input {
        width: 16.25rem;
      }

      .month-group {
        display: flex;
        flex-wrap: nowrap;
        margin: 0.5rem -0.5rem 0;
      }
    }

    .footer {
      padding: 1rem 1.75rem;
      display: flex;
      flex-direction: row-reverse;
      border-top: 1px solid var(--theme-popup-divider);
    }
  }
</style>
