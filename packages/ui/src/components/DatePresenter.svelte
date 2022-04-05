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
  import { onMount, createEventDispatcher, afterUpdate, onDestroy } from 'svelte'
  import { firstDay, daysInMonth, getWeekDayName, getMonthName, day, areDatesEqual } from './calendar/internal/DateUtils'
  import type { TCellStyle, ICell } from './calendar/internal/DateUtils'
  import ui, { TimePopup, tooltipstore as tooltip, showTooltip, Icon, IconClose } from '..'
  import Button from './Button.svelte'
  import DatePopup from './DatePopup.svelte'
  import DPClock from './calendar/icons/DPClock.svelte'
  import DPCalendar from './calendar/icons/DPCalendar.svelte'

  export let value: number | null | undefined
  export let withDate: boolean = true
  export let withTime: boolean = false
  export let mondayStart: boolean = true
  export let editable: boolean = false

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
  $: firstDayOfCurrentMonth = firstDay(currentDate, mondayStart)
  let currentDate: Date = new Date(value ?? Date.now())
  currentDate.setSeconds(0, 0)
  let selected: TEdits = 'day'
  let todayString: string
  translate(ui.string.Today, {}).then(res => todayString = res)

  let edit: boolean = false
  let startTyping: boolean = false
  let dateShow: boolean = false
  let datePresenter: HTMLElement
  let datePopup: HTMLElement
  let closeBtn: HTMLElement

  let days: Array<ICell> = []
  let edits: IEdits[] = [{ id: 'day', value: -1 }, { id: 'month', value: -1 }, { id: 'year', value: -1 },
                           { id: 'hour', value: -1 }, { id: 'min', value: -1 }]

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
    value = currentDate.getTime()
    dateToEdits()
    renderCellStyles()
    dispatch('change', value)
  }
  if (value !== null && value !== undefined) dateToEdits()
  else if (value === null) {
    edits.map(edit => edit.value = -1)
    currentDate = today
  }

  const fixEdits = (): void => {
    let tempValues: number[] = []
    edits.forEach((edit, i) => {
      tempValues[i] = edit.value > 0 ? edit.value : getValue(currentDate, edit.id)
    })
    console.log('!!!!!!!!! Check Edits: ', tempValues)
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
  const closeDatePopup = (): void => {
    if (!isNull(true)) {
      saveDate()
      console.log('!!!!!!!!!!!!!! SAVED !!!!!!!!!!!')
    } else value = null
    edit = false
    // selected = 'day'
  }

  const keyDown = (ev: KeyboardEvent, ed: TEdits): void => {
    const target = ev.target as HTMLElement
    const index = getIndex(ed)

    if (ev.key >= '0' && ev.key <= '9') {
      const num: number = parseInt(ev.key, 10)

      if (startTyping) {
        // edits.forEach(edit => { if (edit.id === ed) edit.value = num })
        if (num === 0) edits[index].value = 0
        else {
          edits[index].value = num
          startTyping = false
        }
        console.log('!!! First number', edits, ed)
      } else if (edits[index].value * 10 + num > getMaxValue(currentDate, ed)) {
        edits.forEach(edit => { if (edit.id === ed) edit.value = getMaxValue(currentDate, ed) })
      } else {
        edits.forEach(edit => { if (edit.id === ed) edit.value = edit.value * 10 + num })
      }

      if (!isNull(false) && edits[2].value > 999 && !startTyping) {
        fixEdits()
        currentDate = setValue(edits[index].value, currentDate, ed)
        dateToEdits()
      }
      edits = edits

      if (selected === 'day' && edits[0].value > getMaxValue(currentDate, 'day') / 10) selected = 'month'
      else if (selected === 'month' && edits[1].value > 1) selected = 'year'
      else if (selected === 'year' && withTime && edits[2].value > 999) selected = 'hour'
      else if (selected === 'hour' && edits[3].value > 2) selected = 'min'
      // console.log('!!!!!!!!!!!! Digit', edits)
    }
    if (ev.code === 'Enter') {
      fixEdits()
      saveDate()
      edit = false
    }
    if (ev.code === 'Backspace') {
      edits[index].value = -1
      startTyping = true
    }
    if (ev.code === 'ArrowUp' || ev.code === 'ArrowDown' && edits[index].el) {
      if (edits[index].value !== -1) {
        let val = (ev.code === 'ArrowUp')
                ? edits[index].value + 1
                : edits[index].value - 1
        if (currentDate) {
          currentDate = setValue(val, currentDate, ed)
          dateToEdits()
          // fixEdits()
          saveDate()
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
      if ((ed === 'year' && !withTime) || (ed === 'min' && withTime)) closeDatePopup()
    }
  }

  const focused = (ed: TEdits): void => {
    selected = ed
    startTyping = true
    console.log('!!!!!!!!!!!!! FOCUSED !!!!!!!!!!!!! -------- selected: ', selected)
  }
  const unfocus = (ev: FocusEvent, ed: TEdits | HTMLElement): void => {
    const target = ev.relatedTarget as HTMLElement
    let kl: boolean = false
    edits.forEach(edit => { if (edit.el === target) kl = true })
    if (target === datePopup || target === closeBtn) kl = true
    console.log('!!!!!!!!!!!!! UnFocus !!!!!!!!!!!!! -------- target: ', target, ' --- kl: ', kl, ' --- ed: ', ed, kl ? ' --- Not Closed Popup' : ' --- Closed Popup!!!')
    if (!kl || target === null) closeDatePopup()
  }

  $: if (selected && edits[getIndex(selected)].el) edits[getIndex(selected)].el?.focus()
  afterUpdate(() => {
    const tempEl = edits[getIndex(selected)].el
    if (tempEl) tempEl.focus()
  })

  const fitPopup = (): void => {
    if (datePresenter && datePopup) {
      const rect: DOMRect = datePresenter.getBoundingClientRect()
      if (document.body.clientHeight - rect.bottom < rect.top) { // Top
        datePopup.style.top = 'none'
        datePopup.style.bottom = rect.top - 4 + 'px'
      } else { // Bottom
        datePopup.style.bottom = 'none'
        datePopup.style.top = rect.bottom + 4 + 'px'
      }
      datePopup.style.left = (rect.left + rect.width / 2) - datePopup.clientWidth / 2 + 'px'
    }
  }
  $: if (edit) {
    if (datePopup) {
      fitPopup()
      datePopup.style.visibility = 'visible'
    }
  } else {
    if (datePopup) datePopup.style.visibility = 'hidden'
  }
  $: console.log('!!!!!!!! EDIT !!!!!!!!!! ------ ', edit)
</script>

<button
  bind:this={datePresenter}
  class="button normal"
  class:edit
  on:click={() => { if (editable) edit = true }}
>
  {#if edit}
    <span bind:this={edits[0].el} class="digit" tabindex="0"
      on:keydown={(ev) => keyDown(ev, edits[0].id)}
      on:focus={() => focused(edits[0].id)}
      on:blur={(ev) => unfocus(ev, edits[0].id)}
    >
      {#if (value !== null && value !== undefined) && (edits[0].value > 0)}
        {edits[0].value.toString().padStart(2, '0')}
      {:else}ДД{/if}
    </span>
    <span class="separator">.</span>
    <span bind:this={edits[1].el} class="digit" tabindex="0"
      on:keydown={(ev) => keyDown(ev, edits[1].id)}
      on:focus={() => focused(edits[1].id)}
      on:blur={(ev) => unfocus(ev, edits[1].id)}
    >
      {#if (value !== null && value !== undefined) && (edits[1].value > 0)}
        {edits[1].value.toString().padStart(2, '0')}
      {:else}ММ{/if}
    </span>
    <span class="separator">.</span>
    <span bind:this={edits[2].el} class="digit" tabindex="0"
      on:keydown={(ev) => keyDown(ev, edits[2].id)}
      on:focus={() => focused(edits[2].id)}
      on:blur={(ev) => unfocus(ev, edits[2].id)}
    >
      {#if (value !== null && value !== undefined) && (edits[2].value > 0)}
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
        {value ? edits[3].value.toString().padStart(2, '0') : 'ЧЧ'}
      </span>
      <span class="separator">:</span>
      <span bind:this={edits[4].el} class="digit" tabindex="0"
        on:keydown={(ev) => keyDown(ev, edits[4].id)}
        on:focus={() => focused(edits[4].id)}
        on:blur={(ev) => unfocus(ev, edits[4].id)}
      >
        {value ? edits[4].value.toString().padStart(2, '0') : 'ММ'}
      </span>
    {/if}
    {#if value}
      <div
        bind:this={closeBtn} class="close-btn" tabindex="0"
        on:click={() => {
          selected = 'day'
          startTyping = true
          value = null
          edits.forEach(edit => edit.value = -1)
          if (edits[0].el) edits[0].el.focus()
        }}
        on:blur={(ev) => unfocus(ev, closeBtn)}
      >
        <Icon icon={IconClose} size={'x-small'} />
      </div>
    {/if}
  {:else}
    <div class="btn-icon mr-1">
      <Icon icon={DPCalendar} size={'small'}/>
    </div>
    {#if value !== null && value !== undefined}
      <span class="digit">{new Date(value).getDate()}</span>
      <span class="digit">{getMonthName(new Date(value), 'short')}</span>
      <span class="digit">{new Date(value).getFullYear()}</span>
      {#if withTime}
        <div class="time-divider" />
        <span class="digit">{new Date(value).getHours().toString().padStart(2, '0')}</span>
        <span class="separator">:</span>
        <span class="digit">{new Date(value).getMinutes().toString().padStart(2, '0')}</span>
      {/if}
    {:else}
      No date
    {/if}
  {/if}
</button>

<div bind:this={datePopup} class="datetime-popup-container" tabindex="0" on:blur={(ev) => unfocus(ev, datePopup)}>
  <div class="popup antiCard">
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
              saveDate()
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
  .datetime-popup-container {
    visibility: hidden;
    position: fixed;
    outline: none;
    z-index: 10000;
  }

  .popup {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    height: 100%;
    color: var(--theme-caption-color);
  }

  .monthYear {
    margin: 0 1rem;
    color: var(--theme-content-accent-color);
    white-space: nowrap;
  }

  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1.75rem);
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
      border-radius: 50%;
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

  .button {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 .5rem;
    font-weight: 500;
    min-width: 1.5rem;
    width: auto;
    height: 1.5rem;
    white-space: nowrap;
    line-height: 1.5rem;
    color: var(--accent-color);
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: .25rem;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: .15s;

    .btn-icon {
      color: var(--content-color);
      transition: color .15s;
      pointer-events: none;
    }
    &:hover {
      color: var(--caption-color);
      transition-duration: 0;
      
      .btn-icon { color: var(--caption-color); }
    }
    &:focus-within .datepopup-container { visibility: visible; }

    &.normal {
      font-weight: 400;
      color: var(--content-color);
      background-color: var(--button-bg-color);
      box-shadow: var(--button-shadow);

      &:hover {
        color: var(--accent-color);
        background-color: var(--button-bg-hover);

        .btn-icon { color: var(--accent-color); }
      }
      &:disabled {
        background-color: #30323655;
        cursor: default;
        &:hover {
          color: var(--content-color);
          .btn-icon { color: var(--content-color); }
        }
      }

      .close-btn {
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
    }
    &.edit {
      padding: 0 .125rem;
      background-color: transparent;
      border-color: var(--primary-edit-border-color);
      &:hover { background-color: transparent; }
    }

    .digit {
      padding: 0 .125rem;
      height: 1.125rem;
      line-height: 1.125rem;
      color: var(--accent-color);
      outline: none;
      border-radius: .125rem;

      &:focus { background-color: var(--primary-bg-color); }
    }
    .time-divider {
      flex-shrink: 0;
      margin: 0 .125rem;
      width: 1px;
      min-width: 1px;
      height: .75rem;
      background-color: var(--divider-color);
    }

    .datepopup-container {
      visibility: hidden;
      position: absolute;
      top: calc(100% + .5rem);
      left: 50%;
      width: auto;
      height: auto;
      transform: translateX(-50%);
      z-index: 10000;
    }
  }
</style>
