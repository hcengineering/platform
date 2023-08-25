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
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import ui from '../../plugin'
  import Label from '../Label.svelte'

  export let currentDate: Date
  export let size: 'small' | 'medium' = 'medium'
  export let noBorder: boolean = false
  export let disabled: boolean = false

  type TEdits = 'hour' | 'min'
  interface IEdits {
    id: TEdits
    value: number
    el?: HTMLElement
  }
  const editsType: TEdits[] = ['hour', 'min']
  const getIndex = (id: TEdits): number => editsType.indexOf(id)
  let edits: IEdits[] = editsType.map((edit) => {
    return { id: edit, value: -1 }
  })
  let selected: TEdits | null = 'hour'
  let startTyping: boolean = false

  const dispatch = createEventDispatcher()

  const setValue = (val: number, date: Date | null, id: TEdits): Date => {
    if (date == null) date = new Date()
    switch (id) {
      case 'hour':
        date.setHours(val)
        break
      case 'min':
        date.setMinutes(val)
        break
    }
    return date
  }

  const getMaxValue = (date: Date | null, id: TEdits): number => {
    if (date == null) date = new Date()
    switch (id) {
      case 'hour':
        return 23
      case 'min':
        return 59
    }
  }

  const getValue = (date: Date, id: TEdits): number => {
    switch (id) {
      case 'hour':
        return date.getHours()
      case 'min':
        return date.getMinutes()
    }
  }

  const dateToEdits = (currentDate: Date | null): void => {
    if (currentDate == null) {
      edits.forEach((edit) => {
        edit.value = -1
      })
    } else {
      for (const edit of edits) {
        edit.value = getValue(currentDate, edit.id)
      }
    }
    edits = edits
  }

  export const isNull = (currentDate?: Date): boolean => {
    if (currentDate !== undefined) {
      dateToEdits(currentDate)
    }
    let result: boolean = false
    edits.forEach((edit, i) => {
      if (edit.value === -1) result = true
    })
    return result
  }

  const keyDown = (ev: KeyboardEvent, ed: TEdits): void => {
    if (selected === ed && !disabled) {
      const index = getIndex(ed)
      if (ev.key >= '0' && ev.key <= '9') {
        const shouldNext = !startTyping
        const num: number = parseInt(ev.key, 10)
        if (startTyping) {
          if (num === 0) edits[index].value = 0
          else {
            edits[index].value = num
          }
          startTyping = false
        } else if (edits[index].value * 10 + num > getMaxValue(currentDate, ed)) {
          edits[index].value = getMaxValue(currentDate, ed)
        } else {
          edits[index].value = edits[index].value * 10 + num
        }
        if (!isNull() && !startTyping) {
          fixEdits()
          currentDate = setValue(edits[index].value, currentDate, ed)
          dateToEdits(currentDate)
        }
        edits = edits
        dispatch('update', currentDate)

        if (selected === 'hour' && (shouldNext || edits[0].value > 2)) selected = 'min'
      }
      if (ev.code === 'Enter') {
        dispatch('close', currentDate)
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
            dateToEdits(currentDate)
            dispatch('update', currentDate)
          }
        }
      }
      if (ev.code === 'ArrowLeft' && edits[index].el) {
        selected = index === 0 ? edits[1].id : edits[index - 1].id
      }
      if (ev.code === 'ArrowRight' && edits[index].el) {
        selected = index === 1 ? edits[0].id : edits[index + 1].id
      }
      if (ev.code === 'Tab') {
        if (ed === 'min') dispatch('save')
      }
    }
  }
  const focused = (ed: TEdits): void => {
    selected = ed
    startTyping = true
  }
  const fixEdits = (): void => {
    const h: number = edits[0].value === -1 ? 0 : edits[0].value
    const m: number = edits[1].value === -1 ? 0 : edits[1].value
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), h, m)
    dispatch('save')
  }

  $: dateToEdits(currentDate)
  $: if (selected && edits[getIndex(selected)].el) edits[getIndex(selected)].el?.focus()

  afterUpdate(() => {
    if (selected) edits[getIndex(selected)].el?.focus()
  })
</script>

<div class="datetime-input {size}" class:noBorder class:disabled>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
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
    {:else}<Label label={ui.string.HH} />{/if}
  </span>
  <span class="separator">:</span>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
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
</div>

<style lang="scss">
  .datetime-input {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin: 0;
    min-width: 0;
    font-family: inherit;
    color: var(--theme-content-color);
    border-radius: 0.25rem;
    transition: border-color 0.15s ease;

    &.small {
      font-size: 0.8125rem;
    }
    &.medium {
      height: 3rem;
      font-size: 1rem;
    }
    &:not(.noBorder) {
      padding: 0.75rem;
      background-color: var(--theme-bg-color);
      border: 1px solid var(--theme-button-border);
      &:hover {
        border-color: var(--theme-button-default);
      }
      &:focus-within {
        border-color: var(--primary-edit-border-color);
      }
    }
    &.noBorder {
      padding: 0.125rem;
    }
    &:focus-within {
      color: var(--theme-caption-color);
    }

    .close-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 0.25rem;
      width: 0.75rem;
      height: 0.75rem;
      color: var(--theme-content-color);
      background-color: var(--theme-button-default);
      outline: none;
      border-radius: 50%;
      cursor: pointer;

      &:hover {
        color: var(--theme-caption-color);
        background-color: var(--theme-button-hovered);
      }
    }

    .digit {
      position: relative;
      padding: 0 0.125rem;
      height: 1.5rem;
      line-height: 1.5rem;
      color: var(--theme-caption-color);
      outline: none;
      border-radius: 0.125rem;

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
    &:not(.disabled) .digit:focus {
      color: var(--accented-button-color);
      background-color: var(--accented-button-default);
    }
    .time-divider {
      flex-shrink: 0;
      margin: 0 0.25rem;
      width: 1px;
      min-width: 1px;
      height: 0.75rem;
      background-color: var(--theme-button-border);
    }
    .separator {
      margin: 0 0.1rem;
    }
  }
</style>
