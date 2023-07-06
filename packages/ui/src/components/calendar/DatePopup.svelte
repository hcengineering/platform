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
  import { DateRangeMode } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import ui from '../../plugin'
  import ActionIcon from '../ActionIcon.svelte'
  import Button from '../Button.svelte'
  import Label from '../Label.svelte'
  import IconClose from '../icons/Close.svelte'
  import DateInputBox from './DateInputBox.svelte'
  import MonthSquare from './MonthSquare.svelte'
  import Shifts from './Shifts.svelte'

  export let currentDate: Date | null
  export let withTime: boolean = false
  export let mondayStart: boolean = true
  export let label = currentDate != null ? ui.string.EditDueDate : ui.string.AddDueDate
  export let detail: IntlString | undefined = undefined
  export let noShift: boolean = false

  const dispatch = createEventDispatcher()

  const today: Date = new Date(Date.now())

  let viewDate: Date = currentDate ?? today
  let viewDateSec: Date
  let dateInput: DateInputBox

  const saveDate = (withTime: boolean = false): void => {
    if (currentDate) {
      if (!withTime) {
        currentDate.setHours(0)
        currentDate.setMinutes(0)
      }
      currentDate.setSeconds(0, 0)
      viewDate = currentDate = currentDate
      dispatch('update', currentDate)
    }
  }
  const closeDP = (withTime: boolean = false): void => {
    if (!dateInput.isNull(currentDate, withTime)) saveDate(withTime)
    else {
      currentDate = null
      dispatch('update', null)
    }
    dispatch('close', { value: currentDate })
  }

  const updateDate = (date: Date | null): void => {
    if (date) {
      currentDate = date
      closeDP()
    }
  }
  const navigateMonth = (result: any): void => {
    if (result) {
      viewDate.setMonth(viewDate.getMonth() + result)
      viewDate = viewDate
    }
  }
  const changeMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1)
  }

  $: if (viewDate) viewDateSec = changeMonth(viewDate)
</script>

<div class="date-popup-container">
  <div class="header">
    <span class="fs-title overflow-label"><Label {label} /></span>
    <ActionIcon
      icon={IconClose}
      size={'small'}
      action={() => {
        dispatch('close')
      }}
    />
  </div>
  <div class="content">
    <div class="label">
      <span class="bold"><Label {label} /></span>
      {#if detail}
        <span class="divider">-</span>
        <Label label={detail} />
      {/if}
    </div>

    <DateInputBox
      bind:this={dateInput}
      bind:currentDate
      {withTime}
      on:close={() => closeDP(withTime)}
      on:save={() => saveDate(withTime)}
    />

    <div class="month-group">
      <MonthSquare
        bind:currentDate
        {viewDate}
        {mondayStart}
        viewUpdate={false}
        hideNavigator="all"
        on:update={(result) => updateDate(result.detail)}
      />
      <MonthSquare
        bind:currentDate
        viewDate={viewDateSec}
        {mondayStart}
        viewUpdate={false}
        on:update={(result) => updateDate(result.detail)}
        on:navigation={(result) => navigateMonth(result.detail)}
      />
    </div>
  </div>
  <div class="footer">
    <Button
      kind={'accented'}
      label={ui.string.Save}
      size={'x-large'}
      width={'100%'}
      on:click={() => closeDP(withTime)}
    />
  </div>
</div>
<Shifts
  {currentDate}
  on:change={(evt) => {
    currentDate = evt.detail
    closeDP(withTime)
  }}
  shift={!noShift}
  mode={withTime ? DateRangeMode.DATETIME : DateRangeMode.DATE}
/>

<style lang="scss">
  .date-popup-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
    width: max-content;
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
      padding: 1.5rem 2rem;
      min-height: 0;

      .label {
        padding-left: 2px;
        margin-bottom: 0.25rem;
        font-size: 0.8125rem;
        color: var(--theme-content-color);

        .bold {
          font-weight: 500;
          color: var(--theme-caption-color);
        }
        .divider {
          margin: 0 0.25rem;
          line-height: 1.4375rem;
          color: var(--theme-darker-color);
        }
      }

      .month-group {
        display: flex;
        flex-wrap: nowrap;
        margin: 0.5rem -0.5rem 0;
      }
    }

    .footer {
      padding: 1rem 2rem;
      border-top: 1px solid var(--theme-popup-divider);
    }
  }
</style>
