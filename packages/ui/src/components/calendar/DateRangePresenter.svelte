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
  import { createEventDispatcher, afterUpdate } from 'svelte'
  import { daysInMonth, getMonthName } from './internal/DateUtils'
  import ui, { Label, Icon, IconClose } from '../..'
  import { dpstore, closeDatePopup } from '../../popups'
  import DPCalendar from './icons/DPCalendar.svelte'
  import DPCalendarOver from './icons/DPCalendarOver.svelte'
  import DateRangePopup from './DateRangePopup.svelte'

  export let value: number | null | undefined
  export let withTime: boolean = false
  export let mondayStart: boolean = true
  export let editable: boolean = false
  export let icon: 'normal' | 'warning' | 'overdue' = 'normal'
  export let labelOver: IntlString | undefined = undefined // label instead of date
  export let labelNull: IntlString = ui.string.NoDate

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
  let currentDate: Date = new Date(value ?? Date.now())
  currentDate.setSeconds(0, 0)
  let selected: TEdits = 'day'

  let edit: boolean = false
  let opened: boolean = false
  let startTyping: boolean = false
  let datePresenter: HTMLElement
  let closeBtn: HTMLElement

  let edits: IEdits[] = editsType.map(edit => { return { id: edit, value: -1 } })

  const getValue = (date: Date | null | undefined = today, id: TEdits): number => {
    switch (id) {
      case 'day': return date ? date.getDate() : today.getDate()
      case 'month': return date ? date.getMonth() + 1 : today.getMonth() + 1
      case 'year': return date ? date.getFullYear() : today.getFullYear()
      case 'hour': return date ? date.getHours() : today.getHours()
      case 'min': return date ? date.getMinutes() : today.getMinutes()
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
      case 'day': return daysInMonth(date)
      case 'month': return 12
      case 'year': return 3000
      case 'hour': return 23
      case 'min': return 59
    }
  }

  const dateToEdits = (): void => {
    edits.forEach(edit => {
      edit.value = getValue(currentDate, edit.id)
    })
    edits = edits
  }
  const saveDate = (): void => {
    currentDate.setHours(edits[3].value > 0 ? edits[3].value : 0)
    currentDate.setMinutes(edits[4].value > 0 ? edits[4].value : 0)
    currentDate.setSeconds(0, 0)
    value = currentDate.getTime()
    dateToEdits()
    $dpstore.currentDate = currentDate
    dispatch('change', value)
  }
  if (value !== null && value !== undefined) dateToEdits()
  else if (value === null) {
    edits.forEach((edit) => { edit.value = -1 })
    currentDate = today
  }

  const fixEdits = (): void => {
    const tempValues: number[] = []
    edits.forEach((edit, i) => {
      tempValues[i] = edit.value > 0 ? edit.value : getValue(currentDate, edit.id)
    })
    currentDate = new Date(tempValues[2], tempValues[1] - 1, tempValues[0], tempValues[3], tempValues[4])
  }
  const isNull = (full: boolean = false): boolean => {
    let result: boolean = false
    edits.forEach((edit, i) => {
      if (edit.value < 1 && full) result = true
      if (i < 3 && !full && edit.value < 1) result = true
    })
    return result
  }
  const closeDP = (): void => {
    if (!isNull()) saveDate()
    else {
      value = null
      dispatch('change', null)
    }
    closeDatePopup()
    edit = opened = false
  }

  const keyDown = (ev: KeyboardEvent, ed: TEdits): void => {
    const index = getIndex(ed)

    if (ev.key >= '0' && ev.key <= '9') {
      const num: number = parseInt(ev.key, 10)

      if (startTyping) {
        if (num === 0) edits[index].value = 0
        else {
          edits[index].value = num
          startTyping = false
        }
      } else if (edits[index].value * 10 + num > getMaxValue(currentDate, ed)) {
        edits[index].value = getMaxValue(currentDate, ed)
      } else {
        edits[index].value = edits[index].value * 10 + num
      }

      if (!isNull(false) && edits[2].value > 999 && !startTyping) {
        fixEdits()
        currentDate = setValue(edits[index].value, currentDate, ed)
        $dpstore.currentDate = currentDate
        dateToEdits()
      }
      edits = edits

      if (selected === 'day' && edits[0].value > getMaxValue(currentDate, 'day') / 10) selected = 'month'
      else if (selected === 'month' && edits[1].value > 1) selected = 'year'
      else if (selected === 'year' && withTime && edits[2].value > 999) selected = 'hour'
      else if (selected === 'hour' && edits[3].value > 2) selected = 'min'
    }
    if (ev.code === 'Enter') closeDP()
    if (ev.code === 'Backspace') {
      edits[index].value = -1
      startTyping = true
    }
    if (ev.code === 'ArrowUp' || (ev.code === 'ArrowDown' && edits[index].el)) {
      if (edits[index].value !== -1) {
        const val = (ev.code === 'ArrowUp')
          ? edits[index].value + 1
          : edits[index].value - 1
        if (currentDate) {
          currentDate = setValue(val, currentDate, ed)
          $dpstore.currentDate = currentDate
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
      if ((ed === 'year' && !withTime) || (ed === 'min' && withTime)) closeDP()
    }
  }

  const focused = (ed: TEdits): void => {
    selected = ed
    startTyping = true
  }
  const unfocus = (ev: FocusEvent, ed: TEdits | HTMLElement): void => {
    const target = ev.relatedTarget as HTMLElement
    let kl: boolean = false
    edits.forEach(edit => { if (edit.el === target) kl = true })
    if (target === popupComp || target === closeBtn) kl = true
    if (!kl || target === null) closeDP()
  }

  $: if (selected && edits[getIndex(selected)].el) edits[getIndex(selected)].el?.focus()
  afterUpdate(() => {
    const tempEl = edits[getIndex(selected)].el
    if (tempEl) tempEl.focus()
  })

  const _change = (result: any): void => {
    if (result !== undefined) {
      currentDate = result
      saveDate()
    }
  }
  const _close = (result: any): void => {
    if (result !== undefined) {
      if (result !== null) {
        currentDate = result
        saveDate()
      }
      closeDP()
    }
  }

  const openPopup = (): void => {
    opened = edit = true
    $dpstore.currentDate = currentDate
    $dpstore.anchor = datePresenter
    $dpstore.onChange = _change
    $dpstore.onClose = _close
    $dpstore.component = DateRangePopup
  }
  let popupComp: HTMLElement
  $: if (opened && $dpstore.popup) popupComp = $dpstore.popup
  $: if (opened && edits[0].el && $dpstore.frendlyFocus === undefined) {
    const frendlyFocus: HTMLElement[] = []
    edits.forEach((edit, i) => {
      if (edit.el) frendlyFocus[i] = edit.el
    })
    frendlyFocus.push(closeBtn)
    $dpstore.frendlyFocus = frendlyFocus
  }
</script>

<button
  bind:this={datePresenter}
  class="datetime-button"
  class:editable
  class:edit
  on:click={() => { if (editable && !opened) openPopup() }}
>
  {#if edit}
    <span bind:this={edits[0].el} class="digit" tabindex="0"
      on:keydown={(ev) => keyDown(ev, edits[0].id)}
      on:focus={() => focused(edits[0].id)}
      on:blur={(ev) => unfocus(ev, edits[0].id)}
    >
      {#if (edits[0].value > -1)}
        {edits[0].value.toString().padStart(2, '0')}
      {:else}ДД{/if}
    </span>
    <span class="separator">.</span>
    <span bind:this={edits[1].el} class="digit" tabindex="0"
      on:keydown={(ev) => keyDown(ev, edits[1].id)}
      on:focus={() => focused(edits[1].id)}
      on:blur={(ev) => unfocus(ev, edits[1].id)}
    >
      {#if (edits[1].value > -1)}
        {edits[1].value.toString().padStart(2, '0')}
      {:else}ММ{/if}
    </span>
    <span class="separator">.</span>
    <span bind:this={edits[2].el} class="digit" tabindex="0"
      on:keydown={(ev) => keyDown(ev, edits[2].id)}
      on:focus={() => focused(edits[2].id)}
      on:blur={(ev) => unfocus(ev, edits[2].id)}
    >
      {#if (edits[2].value > -1)}
        {edits[2].value.toString().padStart(4, '0')}
      {:else}ГГГГ{/if}
    </span>
    {#if withTime}
      <div class="time-divider" />
      <span bind:this={edits[3].el} class="digit" tabindex="0"
        on:keydown={(ev) => keyDown(ev, edits[3].id)}
        on:focus={() => focused(edits[3].id)}
        on:blur={(ev) => unfocus(ev, edits[3].id)}
      >
        {#if (edits[3].value > -1)}
          {edits[3].value.toString().padStart(2, '0')}
        {:else}ЧЧ{/if}
      </span>
      <span class="separator">:</span>
      <span bind:this={edits[4].el} class="digit" tabindex="0"
        on:keydown={(ev) => keyDown(ev, edits[4].id)}
        on:focus={() => focused(edits[4].id)}
        on:blur={(ev) => unfocus(ev, edits[4].id)}
      >
        {#if (edits[4].value > -1)}
          {edits[4].value.toString().padStart(2, '0')}
        {:else}ММ{/if}
      </span>
    {/if}
    {#if value}
      <div
        bind:this={closeBtn} class="close-btn" tabindex="0"
        on:click={() => {
          selected = 'day'
          startTyping = true
          value = null
          edits.forEach(edit => { edit.value = -1 })
          if (edits[0].el) edits[0].el.focus()
        }}
        on:blur={(ev) => unfocus(ev, closeBtn)}
      >
        <Icon icon={IconClose} size={'x-small'} />
      </div>
    {/if}
  {:else}
    <div class="btn-icon {icon}">
      <Icon icon={icon === 'overdue' ? DPCalendarOver : DPCalendar} size={'full'}/>
    </div>
    {#if value !== null && value !== undefined}
      {#if labelOver !== undefined}
        <Label label={labelOver} />
      {:else}
        {new Date(value).getDate()} {getMonthName(new Date(value), 'short')}
        {#if new Date(value).getFullYear() !== today.getFullYear()}
          {new Date(value).getFullYear()}
        {/if}
        {#if withTime}
          <div class="time-divider" />
          {new Date(value).getHours().toString().padStart(2, '0')}
          <span class="separator">:</span>
          {new Date(value).getMinutes().toString().padStart(2, '0')}
        {/if}
      {/if}
    {:else}
      <Label label={labelNull} />
    {/if}
  {/if}
</button>

<style lang="scss">
  .datetime-button {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 .5rem;
    font-weight: 400;
    min-width: 1.5rem;
    width: auto;
    height: 1.5rem;
    white-space: nowrap;
    line-height: 1.5rem;
    color: var(--accent-color);
    background-color: var(--button-bg-color);
    border: 1px solid transparent;
    border-radius: .25rem;
    box-shadow: var(--button-shadow);
    transition-property: border, background-color, color, box-shadow;
    transition-duration: .15s;
    cursor: default;

    .btn-icon {
      margin-right: .375rem;
      width: .875rem;
      height: .875rem;
      transition: color .15s;
      pointer-events: none;

      &.normal { color: var(--content-color); }
      &.warning { color: var(--warning-color); }
      &.overdue { color: var(--error-color); }
    }

    &:hover {
      color: var(--caption-color);
      transition-duration: 0;
    }
    &.editable {
      cursor: pointer;

      &:hover {
        background-color: var(--button-bg-hover);
        .btn-icon {
          &.normal { color: var(--caption-color); }
          &.warning { color: var(--warning-color); }
          &.overdue { color: var(--error-color); }
        }
        .time-divider { background-color: var(--button-border-hover); }
      }
      &:focus-within {
        background-color: var(--button-bg-color);
        border-color: var(--primary-edit-border-color);
        &:hover { background-color: var(--button-bg-color); }
      }
    }
    &:disabled {
      background-color: #30323655;
      cursor: default;

      &:hover {
        color: var(--content-color);
        .btn-icon { color: var(--content-color); }
      }
    }
    &.edit {
      padding: 0 .125rem;
      background-color: transparent;
      border-color: var(--primary-edit-border-color);
      &:hover { background-color: transparent; }
    }

    .close-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 .25rem;
      width: .75rem;
      height: .75rem;
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
      padding: 0 .125rem;
      height: 1.125rem;
      line-height: 1.125rem;
      color: var(--accent-color);
      outline: none;
      border-radius: .125rem;

      &:focus { background-color: var(--primary-bg-color); }
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
      margin: 0 .25rem;
      width: 1px;
      min-width: 1px;
      height: .75rem;
      background-color: var(--button-border-color);
    }
    .separator { margin: 0 .1rem; }
  }
</style>
