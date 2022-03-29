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
  import { onMount, createEventDispatcher, afterUpdate, onDestroy } from 'svelte'
  import { daysInMonth } from './internal/DateUtils'
  import { TimePopup, tooltipstore as tooltip, showTooltip } from '../..'
  import DatePopup from './DatePopup.svelte'
  import DPClock from './icons/DPClock.svelte'
  import DPCalendar from './icons/DPCalendar.svelte'

  export let value: number | null | undefined
  export let withDate: boolean = true
  export let withTime: boolean = false
  export let editable: boolean = false

  const INPUT_WIDTH_INCREMENT = 2
  const dispatch = createEventDispatcher()

  type TEdits = 'day' | 'month' | 'year' | 'hour' | 'min'
  interface IEdits {
    id: TEdits
    numeric: number
    value: string
    el?: HTMLInputElement
  }
  const editsType: TEdits[] = ['day', 'month', 'year', 'hour', 'min']
  const getIndex = (id: TEdits): number => editsType.indexOf(id)
  const today: Date = new Date(Date.now())
  let currentDate: Date = new Date(value ?? Date.now())

  let selected: TEdits = 'day'
  let dateDiv: HTMLElement
  let timeDiv: HTMLElement
  let dateBox: HTMLElement
  let timeBox: HTMLElement
  let dateContainer: HTMLElement
  let text: HTMLElement

  let dateShow: boolean = false
  $: dateShow = !!($tooltip.label || $tooltip.component)

  function computeSize (t: HTMLInputElement | EventTarget | null, ed: TEdits) {
    const target = t as HTMLInputElement
    const val = (target.value === '' || target.value.length < 2) ? '00' : target.value
    text.innerHTML = val.replaceAll(' ', '&nbsp;')
    target.style.width = text.clientWidth + INPUT_WIDTH_INCREMENT + 'px'
  }

  const edits: IEdits[] = [{ id: 'day', numeric: 0, value: '0' }, { id: 'month', numeric: 0, value: '0' },
                           { id: 'year', numeric: 0, value: '0' }, { id: 'hour', numeric: 0, value: '0' },
                           { id: 'min', numeric: 0, value: '0' }]

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
      edit.numeric = getValue(currentDate, edit.id)
      if (value !== undefined && value !== null) edit.value = edit.numeric.toString().padStart(edit.id === 'year' ? 4 : 2, '0')
      else edit.value = (edit.id === 'year') ? '----' : '--'
      if (edit.el) {
        edit.el.value = edit.value
        computeSize(edit.el, edit.id)
      }
    })
  }
  const saveDate = (): void => {
    value = currentDate.getTime()
    dateToEdits()
    $tooltip.props = { value }
    dispatch('change', value)
  }
  $: if (value) dateToEdits()
  
  const onInput = (t: HTMLInputElement | EventTarget | null, ed: TEdits) => {
    const target = t as HTMLInputElement
    const val: number = Number(target.value)
    if (isNaN(val)) {
      target.classList.add('wrong-input')
      edits[getIndex(ed)].el?.select()
    } else {
      target.classList.remove('wrong-input')
      if (val > getMaxValue(currentDate ?? today, ed)) {
        setValue(getMaxValue(currentDate ?? today, ed), currentDate ?? today, ed)
        target.classList.add('wrong-input')
        edits[getIndex(ed)].el?.select()
      } else {
        currentDate = setValue(val, currentDate ?? today, ed)
        saveDate()
        if (ed === 'day' && val > daysInMonth(currentDate ?? today) / 10) edits[1].el?.select()
        else if (ed === 'month' && val > 1) edits[2].el?.select()
        else if (ed === 'year' && val > 1900 && withTime) edits[3].el?.select()
        else if (ed === 'hour' && val > 2) edits[4].el?.select()
      }
      dateToEdits()
    }
    computeSize(t, ed)
  }
  
  const keyDown = (ev: KeyboardEvent, ed: TEdits): void => {
    const target = ev.target as HTMLInputElement
    const index = getIndex(ed)

    if (ev.code === 'Backspace') {
      target.value = ''
      target.classList.remove('wrong-input')
    }
    if (ev.code === 'ArrowUp' || ev.code === 'ArrowDown' && target.value !== '') {
      let val = (ev.code === 'ArrowUp')
              ? edits[index].numeric + 1
              : edits[index].numeric - 1
      if (currentDate) {
        target.classList.remove('wrong-input')
        currentDate = setValue(val, currentDate, ed)
        saveDate()
      }
    }
  }

  const updateFromTooltip = (result: any): void => {
    if (result.detail !== undefined) {
      currentDate = new Date(result.detail)
      saveDate()
    }
  }
  const hoverEdits = (ev: MouseEvent, t: 'date' | 'time'): void => {
    if (!dateShow) showTooltip(undefined,
                               t === 'date' ? dateBox : timeBox,
                               undefined, t === 'date' ? DatePopup : TimePopup,
                               { value: currentDate ?? today },
                               undefined,
                               updateFromTooltip)
    // $tooltip.props = { value }
  }

  const editClick = (ev: MouseEvent, el: TEdits): void => {
    ev.stopPropagation()
    const target = ev.target as HTMLInputElement
    target.select()
  }

  onMount(() => { dateToEdits() })
  // onDestroy(() => { closeTooltip() })
</script>

{#if currentDate !== undefined}
  <div bind:this={dateContainer} class="datetime-presenter-container">
    {#if editable}
      <div bind:this={dateDiv} class="flex-row-center flex-no-shrink flex-nowrap">
        <div class="datetime-icon" class:selected={withDate} on:click|stopPropagation={() => { withDate = !withDate }}>
          <div class="icon"><DPCalendar size={'full'} /></div>
        </div>
        <div class="hidden-text" bind:this={text} />
        <div
          bind:this={dateBox}
          class="datetime-presenter antiWrapper conners focusWI dateBox"
          class:zero={!withDate}
          on:mousemove={(ev) => hoverEdits(ev, 'date')}
        >
          <input
            type="text" placeholder={'00'} class="zone" class:selected={selected === edits[0].id}
            bind:this={edits[0].el} bind:value={edits[0].value}
            on:click|stopPropagation={ev => editClick(ev, edits[0].id)}
            on:input={ev => onInput(ev.target, edits[0].id)}
            on:keydown={ev => keyDown(ev, edits[0].id)}
          />
          <div class="symbol">.</div>
          <input
            type="text" placeholder={'00'} class="zone" class:selected={selected === edits[1].id}
            bind:this={edits[1].el} bind:value={edits[1].value}
            on:click|stopPropagation={ev => editClick(ev, edits[1].id)}
            on:input={ev => onInput(ev.target, edits[1].id)}
            on:keydown={ev => keyDown(ev, edits[1].id)}
          />
          <div class="symbol">.</div>
          <input
            type="text" placeholder={'0000'} class="zone" class:selected={selected === edits[2].id}
            bind:this={edits[2].el} bind:value={edits[2].value}
            on:click|stopPropagation={ev => editClick(ev, edits[2].id)}
            on:input={ev => onInput(ev.target, edits[2].id)}
            on:keydown={ev => keyDown(ev, edits[2].id)}
          />
        </div>
      </div>
      <div class="datetime-icon" class:selected={withTime} on:click|stopPropagation={() => { withTime = !withTime }}>
        <div class="icon"><DPClock size={'full'} /></div>
      </div>
      <div
        bind:this={timeBox}
        class="datetime-presenter antiWrapper conners focusWI timeBox"
        class:zero={!withTime}
        on:mousemove={(ev) => hoverEdits(ev, 'time')}
      >
        <input
          type="text" placeholder={'00'} class="zone" class:selected={selected === edits[3].id}
          bind:this={edits[3].el} bind:value={edits[3].value}
          on:click|stopPropagation={ev => editClick(ev, edits[3].id)}
          on:input={ev => onInput(ev.target, edits[3].id)}
          on:keydown={ev => keyDown(ev, edits[3].id)}
        />
        <div class="symbol">:</div>
        <input
          type="text" placeholder={'00'} class="zone" class:selected={selected === edits[4].id}
          bind:this={edits[4].el} bind:value={edits[4].value}
          on:click|stopPropagation={ev => editClick(ev, edits[4].id)}
          on:input={ev => onInput(ev.target, edits[4].id)}
          on:blur={ev => onInput(ev.target, edits[4].id)}
          on:keydown={ev => keyDown(ev, edits[4].id)}
        />
      </div>
    {:else}
      <div class="flex-col">
        <div bind:this={dateDiv} class="datetime-presenter readable">
          <div class="preview-icon"><DPCalendar size={'full'} /></div>
          {currentDate.getDate().toString().padStart(2, '0')}
          <div class="symbol">.</div>
          {currentDate.getMonth().toString().padStart(2, '0')}
          <div class="symbol">.</div>
          {currentDate.getFullYear()}
        </div>
        {#if withTime}
          <div bind:this={timeDiv} class="datetime-presenter readable">
            <div class="preview-icon"><DPClock size={'full'} /></div>
            {currentDate.getHours().toString().padStart(2, '0')}
            <div class="symbol">:</div>
            {currentDate.getMinutes().toString().padStart(2, '0')}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .datetime-presenter-container {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    flex-shrink: 0;
    min-width: 0;
    width: auto;
    border-radius: .75rem;
  }

  .datetime-presenter {
    flex-shrink: 0;
    border-radius: .5rem;

    &.readable {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      flex-shrink: 0;
      min-width: 0;
      color: var(--theme-content-accent-color);

      .symbol { margin: 0 .125rem; }
    }

    .zone {
      position: relative;
      display: flex;
      align-items: center;
      font-weight: 500;
      color: var(--theme-content-accent-color);
      cursor: pointer;
      z-index: 1;

      &::before, &::after {
        position: absolute;
        top: 0;
        left: -.125rem;
        width: calc(100% + .25rem);
        height: 100%;
        border-radius: .75rem;
        z-index: -1;
      }
      &::before { background-color: var(--primary-button-outline); }
      &::after { background-color: var(--theme-bg-accent-hover); }
      &:hover::after { content: ''; }
    }

    .symbol {
      font-weight: 500;
      color: var(--theme-content-dark-color);
    }
  }

  .datetime-icon {
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--theme-content-color);
    background-color: var(--theme-bg-accent-color);
    border-radius: .75rem;

    &:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-bg-accent-hover);
    }

    &.selected {
      margin-right: .25rem;
      color: var(--theme-content-accent-color);
      background-color: var(--theme-bg-accent-hover);

      &:hover {
        color: var(--theme-caption-color);
        background-color: var(--theme-bg-focused-color);
      }
    }

    .icon {
      overflow: hidden;
      width: .75rem;
      height: .75rem;
    }
  }

  .preview-icon {
    margin-right: .25rem;
    width: .75rem;
    height: .75rem;
    color: var(--theme-content-dark-color);
  }

  input {
    margin: 0;
    padding: 0;
    width: 1.5rem;
    height: 1.25rem;
    color: var(--theme-caption-color);
    border: transparent;
    border-radius: .25rem;
    text-align: center;
    transition: background-color .2s ease-out;

    &:hover { background-color: var(--theme-bg-accent-hover); }
    &:focus {
      color: var(--theme-bg-color);
      background-color: var(--primary-button-enabled);
    }
    &::placeholder { color: var(--theme-content-dark-color); }
  }

  .timeBox, .dateBox {
    visibility: visible;
    display: flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;
    width: auto;
    opacity: 1;

    &.zero {
      visibility: hidden;
      width: 0;
      max-width: 0;
      opacity: 0;
    }
  }
  .dateBox { margin-right: .25rem; }
</style>
