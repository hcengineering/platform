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
  import { DateRangeMode } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import ui from '../../plugin'
  import { showPopup } from '../../popups'
  import Icon from '../Icon.svelte'
  import Label from '../Label.svelte'
  import IconClose from '../icons/Close.svelte'
  import DatePopup from './DatePopup.svelte'
  import DPCalendar from './icons/DPCalendar.svelte'
  import DPCalendarOver from './icons/DPCalendarOver.svelte'
  import { daysInMonth, getMonthName } from './internal/DateUtils'

  export let value: number | null | undefined = null
  export let mode: DateRangeMode = DateRangeMode.DATE
  export let editable: boolean = false
  export let iconModifier: 'overdue' | 'critical' | 'warning' | 'normal' = 'normal'
  export let shouldIgnoreOverdue: boolean = false
  export let labelNull: IntlString = ui.string.NoDate
  export let kind: 'default' | 'no-border' | 'link' | 'regular' = 'default'
  export let size: 'small' | 'medium' | 'large' = 'small'
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
  const today = new Date()
  const startDate = new Date(0)
  const defaultSelected: TEdits = mode === DateRangeMode.TIME ? 'hour' : 'day'

  let currentDate: Date | null = null
  let selected: TEdits = defaultSelected

  let edit: boolean = false
  let opened: boolean = false
  let startTyping: boolean = false
  let datePresenter: HTMLElement
  let closeBtn: HTMLElement

  let edits: IEdits[] = editsType.map((edit) => {
    return { id: edit, value: -1 }
  })

  $: withTime = mode !== DateRangeMode.DATE
  $: withDate = mode !== DateRangeMode.TIME

  const getValue = (date: Date | null | undefined = today, id: TEdits): number => {
    switch (id) {
      case 'day':
        return date ? date.getDate() : today.getDate()
      case 'month':
        return date ? date.getMonth() + 1 : today.getMonth() + 1
      case 'year':
        return date ? date.getFullYear() : today.getFullYear()
      case 'hour':
        return date ? date.getHours() : today.getHours()
      case 'min':
        return date ? date.getMinutes() : today.getMinutes()
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
  export const saveDate = (): void => {
    if (currentDate === null) {
      value = null
      setEmptyEdits()
    } else {
      currentDate.setSeconds(0, 0)
      value = currentDate.getTime()
      dateToEdits()
    }
    dispatch('change', value)
  }

  const fixEdits = (): void => {
    const tempValues: number[] = []
    edits.forEach((edit, i) => {
      tempValues[i] = edit.value > 0 || i > 2 ? edit.value : getValue(currentDate, edit.id)
    })
    setCurrentDate(new Date(tempValues[2], tempValues[1] - 1, tempValues[0], tempValues[3], tempValues[4]))
  }
  const isNull = (full: boolean = false): boolean => {
    let result: boolean = false
    edits.forEach((edit, i) => {
      if ((edit.value < 1 || i > 2) && full) result = true
      if (i < 3 && !full && edit.value < 1) result = true
    })
    return result
  }
  const closeDP = (): void => {
    edit = opened = false
  }

  const keyDown = (ev: KeyboardEvent, ed: TEdits): void => {
    const index = getIndex(ed)

    if (ev.key >= '0' && ev.key <= '9') {
      const num: number = parseInt(ev.key, 10)
      const date = currentDate ?? new Date()

      if (startTyping) {
        edits[index].value = num
      } else if (edits[index].value * 10 + num > getMaxValue(date, ed)) {
        edits[index].value = getMaxValue(date, ed)
      } else {
        edits[index].value = edits[index].value * 10 + num
      }

      if (!isNull() && edits[2].value > 999) {
        fixEdits()
        setCurrentDate(setValue(edits[index].value, date, ed))
        dateToEdits()
      }
      edits = edits

      if (selected === 'day' && edits[0].value > getMaxValue(date, 'day') / 10) selected = 'month'
      else if (selected === 'month' && edits[1].value > 1) selected = 'year'
      else if (selected === 'year' && withTime && edits[2].value > 999) selected = 'hour'
      else if (selected === 'hour' && (edits[3].value > 2 || !startTyping)) selected = 'min'
      startTyping = false
    }
    if (ev.code === 'Enter') saveDate()
    if (ev.code === 'Backspace') {
      edits[index].value = -1
      startTyping = true
    }
    if (ev.code === 'ArrowUp' || (ev.code === 'ArrowDown' && edits[index].el)) {
      if (edits[index].value !== -1) {
        const val = ev.code === 'ArrowUp' ? edits[index].value + 1 : edits[index].value - 1
        if (currentDate) {
          setCurrentDate(setValue(val, currentDate, ed))
          dateToEdits()
        }
      }
    }
    if (ev.code === 'ArrowLeft' && edits[index].el) {
      if (mode === DateRangeMode.TIME) {
        selected = index === 3 ? edits[4].id : edits[index - 1].id
      } else if (mode === DateRangeMode.DATETIME) {
        selected = index === 0 ? edits[4].id : edits[index - 1].id
      } else {
        selected = index === 0 ? edits[2].id : edits[index - 1].id
      }
    }
    if (ev.code === 'ArrowRight' && edits[index].el) {
      if (mode === DateRangeMode.TIME) {
        selected = index === 4 ? edits[3].id : edits[index + 1].id
      } else if (mode === DateRangeMode.DATETIME) {
        selected = index === 4 ? edits[0].id : edits[index + 1].id
      } else {
        selected = index === 2 ? edits[0].id : edits[index + 1].id
      }
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
    edits.forEach((edit) => {
      if (edit.el === target) kl = true
    })
    if (target === closeBtn) kl = true
    if (!kl || target === null) closeDP()
  }

  $: if (selected && edits[getIndex(selected)].el) edits[getIndex(selected)].el?.focus()
  afterUpdate(() => {
    const tempEl = edits[getIndex(selected)].el
    if (tempEl) tempEl.focus()
  })

  const setEmptyEdits = () => {
    edits.forEach((edit, index) => {
      if (mode !== DateRangeMode.TIME || index > 2) {
        edit.value = -1
      } else {
        edit.value = getValue(startDate, edit.id)
      }
    })
    edits = edits
  }

  const setCurrentDate = (date: Date) => {
    if (mode === DateRangeMode.TIME) {
      const resultDate = new Date(startDate)
      resultDate.setHours(date.getHours())
      resultDate.setMinutes(date.getMinutes())

      currentDate = resultDate
    } else {
      currentDate = date
    }
  }

  const openPopup = (): void => {
    showPopup(
      DatePopup,
      {
        currentDate,
        withTime,
        noShift,
        label: labelNull
      },
      undefined,
      (result) => (!result ? closeDP() : saveDate()),
      (result) => {
        if (result !== undefined) {
          currentDate = result
          if (result === null) {
            setEmptyEdits()
          }
        }
      }
    )
  }

  export const adaptValue = () => {
    setCurrentDate(new Date(value ?? Date.now()))
    currentDate?.setSeconds(0, 0)
    if (value !== null && value !== undefined) {
      dateToEdits()
    } else if (value === null) {
      setEmptyEdits()
    }
  }

  adaptValue()
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<button
  bind:this={datePresenter}
  class="datetime-button {kind} {size}"
  class:notSelected={!value}
  class:editable
  class:edit
  on:click={() => {
    if (editable && !opened && withDate) openPopup()
    else if (editable && !opened && mode === DateRangeMode.TIME) edit = true
  }}
>
  {#if edit}
    {#if withDate}
      <span
        bind:this={edits[0].el}
        class="digit"
        tabindex="0"
        on:keydown={(ev) => keyDown(ev, edits[0].id)}
        on:focus={() => focused(edits[0].id)}
        on:blur={(ev) => unfocus(ev, edits[0].id)}
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
        on:blur={(ev) => unfocus(ev, edits[1].id)}
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
        on:blur={(ev) => unfocus(ev, edits[2].id)}
      >
        {#if edits[2].value > -1}
          {edits[2].value.toString().padStart(4, '0')}
        {:else}<Label label={ui.string.YYYY} />{/if}
      </span>
    {/if}
    {#if withTime}
      {#if mode === DateRangeMode.DATETIME}
        <div class="time-divider" />
      {/if}
      <span
        bind:this={edits[3].el}
        class="digit"
        tabindex="0"
        on:keydown={(ev) => keyDown(ev, edits[3].id)}
        on:focus={() => focused(edits[3].id)}
        on:blur={(ev) => unfocus(ev, edits[3].id)}
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
        on:blur={(ev) => unfocus(ev, edits[4].id)}
      >
        {#if edits[4].value > -1}
          {edits[4].value.toString().padStart(2, '0')}
        {:else}<Label label={ui.string.MM} />{/if}
      </span>
    {/if}
    {#if value}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        bind:this={closeBtn}
        class="close-btn"
        tabindex="0"
        on:click={() => {
          selected = defaultSelected
          startTyping = true
          value = null
          setEmptyEdits()
          const newFocusElement = edits[mode === DateRangeMode.TIME ? 2 : 0].el
          if (newFocusElement) newFocusElement.focus()
        }}
        on:blur={(ev) => unfocus(ev, closeBtn)}
      >
        <Icon icon={IconClose} size={'x-small'} />
      </div>
    {/if}
  {:else}
    <div class="btn-icon {iconModifier}">
      <Icon icon={iconModifier === 'overdue' && !shouldIgnoreOverdue ? DPCalendarOver : DPCalendar} size={'full'} />
    </div>
    {#if value !== undefined && value !== null && value.toString() !== ''}
      {#if withDate}
        {new Date(value).getDate()}
        {getMonthName(new Date(value), 'short')}
        {#if new Date(value).getFullYear() !== today.getFullYear()}
          {new Date(value).getFullYear()}
        {/if}
      {/if}
      {#if withTime}
        {#if withDate}
          <div class="time-divider" />
        {/if}
        {new Date(value).getHours().toString().padStart(2, '0')}
        <span class="separator">:</span>
        {new Date(value).getMinutes().toString().padStart(2, '0')}
      {/if}
    {:else}
      <div class="overflow-label">
        <Label label={labelNull} />
      </div>
    {/if}
  {/if}
</button>

<style lang="scss">
  .datetime-button {
    position: relative;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.5rem;
    font-weight: 400;
    min-width: 1.5rem;
    width: min-content;
    white-space: nowrap;
    line-height: 1.5rem;
    color: var(--theme-content-color);
    border: 1px solid transparent;
    border-radius: 0.25rem;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;
    cursor: pointer;

    &.small {
      height: 1.5rem;
    }
    &.medium {
      height: 2rem;
    }
    &.large {
      height: 2.25rem;
    }

    .btn-icon {
      margin-right: 0.375rem;
      width: 0.875rem;
      height: 0.875rem;
      transition: color 0.15s;
      pointer-events: none;

      &.normal {
        color: var(--theme-content-color);
      }
      &.warning {
        color: var(--theme-warning-color);
      }
      &.overdue {
        color: var(--theme-error-color);
      }
      &.critical {
        color: var(--theme-error-color);
      }
    }

    &.default {
      padding: 0;
      color: var(--theme-content-color);

      &:hover {
        color: var(--theme-caption-color);
      }
    }
    &.no-border {
      font-weight: 400;
      color: var(--theme-content-color);
      background-color: var(--theme-button-default);
      box-shadow: var(--button-shadow);

      &:hover {
        color: var(--theme-caption-color);
        background-color: var(--theme-button-hovered);
        transition-duration: 0;

        .btn-icon {
          color: var(--theme-caption-color);
        }
      }
      &:disabled {
        color: var(--theme-trans-color);
        background-color: var(--theme-button-disabled);
        cursor: default;

        .btn-icon {
          color: var(--theme-trans-color);
        }
        &:hover {
          color: var(--theme-trans-color);
          .btn-icon {
            color: var(--theme-trans-color);
          }
        }
      }

      &.editable {
        cursor: pointer;

        &:hover {
          background-color: var(--theme-button-hovered);
          .btn-icon {
            &.normal {
              color: var(--caption-color);
            }
            &.warning {
              color: var(--theme-warning-color);
            }
            &.overdue {
              color: var(--theme-error-color);
            }
            &.critical {
              color: var(--theme-error-color);
            }
          }
          .time-divider {
            background-color: var(--theme-divider-color);
          }
        }
        &:focus-within {
          background-color: var(--theme-button-focused);
          border-color: var(--primary-edit-border-color);
          &:hover {
            background-color: var(--theme-button-hovered);
          }
        }
      }

      &.edit {
        padding: 0 0.125rem;
        background-color: transparent;
        border-color: var(--primary-edit-border-color);
        &:hover {
          background-color: transparent;
        }
      }
    }

    &.link {
      padding: 0 0.875rem;
      width: 100%;
      color: var(--theme-caption-color);
      &:hover {
        background-color: var(--theme-bg-color);
        border-color: var(--theme-divider-color);
        .btn-icon {
          color: var(--theme-content-color);
        }
      }
      &.edit {
        padding: 0 0.5rem;
      }
    }

    &.regular {
      padding: 0 0.625rem;
      color: var(--theme-caption-color);
      background-color: var(--theme-button-default);
      border-color: var(--theme-button-border);

      .btn-icon {
        color: var(--theme-content-color);
      }
      &:hover {
        background-color: var(--theme-button-hovered);
        border-color: var(--theme-divider-color);
        .btn-icon {
          color: var(--theme-content-color);
        }
      }
      // &.edit {
      //   padding: 0 0.5rem;
      // }
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
        color: var(--accent-color);
        background-color: var(--theme-button-hovered);
      }
    }

    .digit {
      position: relative;
      padding: 0 0.125rem;
      height: 1.125rem;
      line-height: 1.125rem;
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
      background-color: var(--theme-divider-color);
    }
    .separator {
      margin: 0 0.1rem;
    }
    &.notSelected {
      color: var(--theme-dark-color);

      .btn-icon {
        color: var(--theme-darker-color);
      }
      &:hover,
      &:hover .btn-icon {
        color: var(--theme-content-color);
      }
    }
  }
</style>
