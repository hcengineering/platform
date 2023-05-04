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
  import { IntlString } from '@hcengineering/platform'
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import ui from '../../plugin'
  import ActionIcon from '../ActionIcon.svelte'
  import Button from '../Button.svelte'
  import Icon from '../Icon.svelte'
  import Label from '../Label.svelte'
  import IconClose from '../icons/Close.svelte'
  import MonthSquare from './MonthSquare.svelte'
  import { daysInMonth } from './internal/DateUtils'
  import Shifts from './Shifts.svelte'
  import { DateRangeMode } from '@hcengineering/core'

  export let currentDate: Date | null
  export let withTime: boolean = false
  export let mondayStart: boolean = true
  export let label = currentDate != null ? ui.string.EditDueDate : ui.string.AddDueDate
  export let detail: IntlString | undefined = undefined
  export let noShift: boolean = false

  const dispatch = createEventDispatcher()

  type TEdits = 'day' | 'month' | 'year' | 'hour' | 'min'
  interface IEdits {
    id: TEdits
    value: number
    el?: HTMLElement
  }
  const editsType: TEdits[] = ['day', 'month', 'year', 'hour', 'min']
  const getIndex = (id: TEdits): number => editsType.indexOf(id)
  const today: Date = new Date(Date.now())
  let selected: TEdits | null = 'day'
  let startTyping: boolean = false
  let edits: IEdits[] = editsType.map((edit) => {
    return { id: edit, value: -1 }
  })
  let viewDate: Date = currentDate ?? today
  let viewDateSec: Date

  const getValue = (date: Date | null | undefined, id: TEdits): number => {
    if (date == null) date = today
    switch (id) {
      case 'day':
        return date.getDate()
      case 'month':
        return date.getMonth() + 1
      case 'year':
        return date.getFullYear()
      case 'hour':
        return date.getHours()
      case 'min':
        return date.getMinutes()
    }
  }
  const setValue = (val: number, date: Date, id: TEdits): Date => {
    switch (id) {
      case 'day':
        date.setDate(val)
        break
      case 'month':
        date.setMonth(val - 1)
        break
      case 'year':
        date.setFullYear(val)
        break
      case 'hour':
        date.setHours(val)
        break
      case 'min':
        date.setMinutes(val)
        break
    }
    return date
  }
  const getMaxValue = (date: Date, id: TEdits): number => {
    switch (id) {
      case 'day':
        return daysInMonth(date)
      case 'month':
        return 12
      case 'year':
        return 3000
      case 'hour':
        return 23
      case 'min':
        return 59
    }
  }

  const dateToEdits = (): void => {
    edits.forEach((edit) => {
      edit.value = getValue(currentDate, edit.id)
    })
    edits = edits
  }
  const clearEdits = (): void => {
    edits.forEach((edit) => (edit.value = -1))
    if (edits[0].el) edits[0].el.focus()
  }
  const fixEdits = (): void => {
    const h: number = edits[3].value === -1 ? 0 : edits[3].value
    const m: number = edits[4].value === -1 ? 0 : edits[4].value
    viewDate = currentDate = new Date(edits[2].value, edits[1].value - 1, edits[0].value, h, m)
  }
  const isNull = (full: boolean = false): boolean => {
    let result: boolean = false
    edits.forEach((edit, i) => {
      if (edit.value === -1 && full && i > 2) result = true
      if (edit.value === -1 && !full && i < 3) result = true
      if (i === 0 && edit.value === 0) result = true
      if (i === 2 && (edit.value < 1970 || edit.value > 3000)) result = true
    })
    return result
  }

  const saveDate = (withTime: boolean = false): void => {
    if (currentDate) {
      if (!withTime) {
        currentDate.setHours(edits[3].value > 0 ? edits[3].value : 0)
        currentDate.setMinutes(edits[4].value > 0 ? edits[4].value : 0)
      }
      currentDate.setSeconds(0, 0)
      viewDate = currentDate = currentDate
      dateToEdits()
      dispatch('update', currentDate)
    }
  }
  const closeDP = (withTime: boolean = false): void => {
    if (!isNull()) saveDate(withTime)
    else {
      currentDate = null
      dispatch('update', null)
    }
    dispatch('close')
  }

  const keyDown = (ev: KeyboardEvent, ed: TEdits): void => {
    if (selected === ed) {
      const index = getIndex(ed)
      if (ev.key >= '0' && ev.key <= '9') {
        const num: number = parseInt(ev.key, 10)
        if (startTyping) {
          if (num === 0) edits[index].value = 0
          else {
            edits[index].value = num
            startTyping = false
          }
        } else if (edits[index].value * 10 + num > getMaxValue(viewDate, ed)) {
          edits[index].value = getMaxValue(viewDate, ed)
        } else {
          edits[index].value = edits[index].value * 10 + num
        }
        if (!isNull(false) && !startTyping) {
          fixEdits()
          currentDate = setValue(edits[index].value, viewDate, ed)
          dateToEdits()
        }
        edits = edits

        if (selected === 'day' && edits[0].value > getMaxValue(viewDate, 'day') / 10) selected = 'month'
        else if (selected === 'month' && edits[1].value > 1) selected = 'year'
        else if (selected === 'year' && withTime && edits[2].value > 999) selected = 'hour'
        else if (selected === 'hour' && edits[3].value > 2) selected = 'min'
      }
      if (ev.code === 'Enter') {
        if (!isNull(false)) closeDP()
      }
      if (ev.code === 'Backspace') {
        edits[index].value = -1
        startTyping = true
      }
      if (ev.code === 'ArrowUp' || (ev.code === 'ArrowDown' && edits[index].el)) {
        if (edits[index].value !== -1) {
          const val = ev.code === 'ArrowUp' ? edits[index].value + 1 : edits[index].value - 1
          if (currentDate) {
            currentDate = setValue(val, currentDate, ed)
            dateToEdits()
          }
        }
      }
      if (ev.code === 'ArrowLeft' && edits[index].el) {
        selected = index === 0 ? edits[withTime ? 4 : 2].id : edits[index - 1].id
      }
      if (ev.code === 'ArrowRight' && edits[index].el) {
        selected = index === (withTime ? 4 : 2) ? edits[0].id : edits[index + 1].id
      }
      if (ev.code === 'Tab') {
        if ((ed === 'year' && !withTime) || (ed === 'min' && withTime)) saveDate()
      }
    }
  }
  const focused = (ed: TEdits): void => {
    selected = ed
    startTyping = true
  }
  const updateDate = (date: Date | null): void => {
    if (date) {
      currentDate = date
      dateToEdits()
      closeDP()
    }
  }
  const navigateMonth = (result: any): void => {
    if (result) {
      if (result.charAt(1) === 'm') viewDate.setMonth(viewDate.getMonth() + (result === '-m' ? -1 : 1))
      viewDate = viewDate
    }
  }
  const changeMonth = (date: Date, up: boolean): Date => {
    return new Date(date.getFullYear(), date.getMonth() + (up ? 1 : -1), date.getDate())
  }

  if (currentDate) dateToEdits()
  $: if (selected && edits[getIndex(selected)].el) edits[getIndex(selected)].el?.focus()
  $: if (viewDate) viewDateSec = changeMonth(viewDate, true)

  afterUpdate(() => {
    if (selected) edits[getIndex(selected)].el?.focus()
  })
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

    <div class="datetime-input">
      <div class="flex-row-center">
        <span
          bind:this={edits[0].el}
          class="digit"
          tabindex="0"
          on:keydown={(ev) => keyDown(ev, edits[0].id)}
          on:focus={() => focused(edits[0].id)}
          on:blur={() => (selected = null)}
        >
          {#if edits[0].value > -1}
            {edits[0].value.toString().padStart(2, '0')}
          {:else}<Label label={ui.string.DD} />{/if}
        </span>
        <span class="separator">.</span>
        <span
          bind:this={edits[1].el}
          class="digit"
          tabindex="0"
          on:keydown={(ev) => keyDown(ev, edits[1].id)}
          on:focus={() => focused(edits[1].id)}
          on:blur={() => (selected = null)}
        >
          {#if edits[1].value > -1}
            {edits[1].value.toString().padStart(2, '0')}
          {:else}<Label label={ui.string.MM} />{/if}
        </span>
        <span class="separator">.</span>
        <span
          bind:this={edits[2].el}
          class="digit"
          tabindex="0"
          on:keydown={(ev) => keyDown(ev, edits[2].id)}
          on:focus={() => focused(edits[2].id)}
          on:blur={() => (selected = null)}
        >
          {#if edits[2].value > -1}
            {edits[2].value.toString().padStart(4, '0')}
          {:else}<Label label={ui.string.YYYY} />{/if}
        </span>
        {#if withTime}
          <div class="time-divider" />
          <span
            bind:this={edits[3].el}
            class="digit"
            tabindex="0"
            on:keydown={(ev) => keyDown(ev, edits[3].id)}
            on:focus={() => focused(edits[3].id)}
            on:blur={() => (selected = null)}
          >
            {#if edits[3].value > -1}
              {edits[3].value.toString().padStart(2, '0')}
            {:else}<Label label={ui.string.HH} />{/if}
          </span>
          <span class="separator">:</span>
          <span
            bind:this={edits[4].el}
            class="digit"
            tabindex="0"
            on:keydown={(ev) => keyDown(ev, edits[4].id)}
            on:focus={() => focused(edits[4].id)}
            on:blur={() => (selected = null)}
          >
            {#if edits[4].value > -1}
              {edits[4].value.toString().padStart(2, '0')}
            {:else}<Label label={ui.string.MM} />{/if}
          </span>
        {/if}
      </div>
      {#if currentDate}
        <div
          class="close-btn"
          tabindex="0"
          on:click={() => {
            selected = 'day'
            startTyping = true
            currentDate = null
            clearEdits()
          }}
          on:blur={() => (selected = null)}
        >
          <Icon icon={IconClose} size={'x-small'} />
        </div>
      {/if}
    </div>

    <div class="month-group">
      <MonthSquare
        bind:currentDate
        {viewDate}
        {mondayStart}
        viewUpdate={false}
        hideNavigator
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
      kind={'primary'}
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
    background: var(--board-card-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem;
    box-shadow: var(--card-shadow);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem 1rem 2rem;
      border-bottom: 1px solid var(--divider-color);
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
        color: var(--content-color);

        .bold {
          font-weight: 500;
          color: var(--accent-color);
        }
        .divider {
          margin: 0 0.25rem;
          line-height: 1.4375rem;
          color: var(--dark-color);
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
      border-top: 1px solid var(--divider-color);
    }
  }

  .datetime-input {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    margin: 0;
    padding: 0.75rem;
    height: 3rem;
    font-family: inherit;
    font-size: 1rem;
    color: var(--content-color);
    background-color: var(--body-color);
    border: 1px solid var(--button-border-color);
    border-radius: 0.25rem;
    transition: border-color 0.15s ease;

    &:hover {
      border-color: var(--button-border-hover);
    }
    &:focus-within {
      color: var(--caption-color);
      border-color: var(--primary-edit-border-color);
    }

    .close-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 0.25rem;
      width: 0.75rem;
      height: 0.75rem;
      color: var(--content-color);
      background-color: var(--button-bg-color);
      outline: none;
      border-radius: 50%;
      cursor: pointer;

      &:hover {
        color: var(--accent-color);
        background-color: var(--button-bg-hover);
      }
    }

    .digit {
      position: relative;
      padding: 0 0.125rem;
      height: 1.5rem;
      line-height: 1.5rem;
      color: var(--accent-color);
      outline: none;
      border-radius: 0.125rem;

      &:focus {
        background-color: var(--primary-bg-color);
      }
      &::after {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 11000;
        cursor: pointer;
      }
    }
    .time-divider {
      flex-shrink: 0;
      margin: 0 0.25rem;
      width: 1px;
      min-width: 1px;
      height: 0.75rem;
      background-color: var(--button-border-color);
    }
    .separator {
      margin: 0 0.1rem;
    }
  }
</style>
