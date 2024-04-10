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
  import ui, {
    ButtonBase,
    ButtonBaseKind,
    ButtonBaseSize,
    DatePopup,
    SimpleDatePopup,
    TimeInputBox,
    TimeShiftPresenter,
    eventToHTMLElement,
    getUserTimezone,
    showPopup
  } from '@hcengineering/ui'
  import { FixedColumn } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import DateLocalePresenter from './DateLocalePresenter.svelte'

  export let date: number
  export let difference: number = 0
  export let direction: 'vertical' | 'horizontal' = 'vertical'
  export let showDate: boolean = true
  export let withoutTime: boolean
  export let kind: ButtonBaseKind = 'tertiary'
  export let size: ButtonBaseSize = 'small'
  export let disabled: boolean = false
  export let focusIndex = -1
  export let timeZone: string = getUserTimezone()
  export let fixed: string | undefined = undefined

  const dispatch = createEventDispatcher()

  $: currentDate = new Date(date)

  function timeClick (e: MouseEvent) {
    if (!showDate) {
      showPopup(
        DatePopup,
        { currentDate, withTime: !withoutTime, timeZone, label: ui.string.SelectDate, noShift: true },
        undefined,
        (res) => {
          if (res) {
            date = res.value.getTime()
            dispatch('update', date)
          }
        }
      )
    }
  }

  function dateClick (e: MouseEvent) {
    showPopup(SimpleDatePopup, { currentDate, timeZone }, eventToHTMLElement(e), (res) => {
      if (res) {
        date = res.getTime()
        dispatch('update', date)
      }
    })
  }
  const updateTime = (d?: Date) => {
    const dat = d ?? currentDate
    date = dat.getTime()
    dispatch('update', dat)
  }
</script>

<div
  class="dateEditor-container {direction}"
  class:difference={difference > 0}
  class:flex-gap-2={direction === 'horizontal'}
>
  {#if showDate || withoutTime}
    {#if fixed === undefined}
      <div class="min-w-28">
        <ButtonBase type="type-button" {kind} {size} {disabled} {focusIndex} on:click={dateClick}>
          <span class="overflow-label"><DateLocalePresenter date={currentDate.getTime()} {timeZone} /></span>
        </ButtonBase>
      </div>
    {:else}
      <FixedColumn key={fixed + '-date'} addClass={'min-w-28'}>
        <ButtonBase type="type-button" {kind} {size} {disabled} {focusIndex} on:click={dateClick}>
          <span class="overflow-label"><DateLocalePresenter date={currentDate.getTime()} {timeZone} /></span>
        </ButtonBase>
      </FixedColumn>
    {/if}
  {/if}

  {#if showDate && !withoutTime && direction === 'horizontal'}
    <div class="divider" />
  {/if}

  {#if !withoutTime}
    {#if fixed === undefined}
      <ButtonBase
        type="type-button"
        {kind}
        {size}
        {disabled}
        focusIndex={focusIndex !== -1 ? focusIndex + 1 : focusIndex}
        on:click={timeClick}
      >
        <TimeInputBox
          bind:currentDate
          {timeZone}
          noBorder
          size={'small'}
          on:update={(date) => {
            updateTime(date.detail)
          }}
        />
      </ButtonBase>
    {:else}
      <FixedColumn key={fixed + '-time'} addClass={'min-w-28'}>
        <ButtonBase
          type="type-button"
          {kind}
          {size}
          {disabled}
          focusIndex={focusIndex !== -1 ? focusIndex + 1 : focusIndex}
          on:click={timeClick}
        >
          <TimeInputBox
            bind:currentDate
            {timeZone}
            noBorder
            size={'small'}
            on:update={(date) => {
              updateTime(date.detail)
            }}
          />
        </ButtonBase>
      </FixedColumn>
    {/if}
  {/if}
</div>

{#if !withoutTime && difference > 0}
  <div class="divider" />
  {#if fixed === undefined}
    <div class="p-2 font-regular-14 sunshine-text-color">
      <TimeShiftPresenter value={date - difference} exact />
    </div>
  {:else}
    <FixedColumn key={fixed + '-duration'} addClass={'p-2 font-regular-14 sunshine-text-color'}>
      <TimeShiftPresenter value={date - difference} exact />
    </FixedColumn>
  {/if}
{/if}

<style lang="scss">
  .dateEditor-container {
    display: flex;
    flex-wrap: nowrap;

    &.horizontal {
      align-items: center;
    }
    &.vertical {
      flex-direction: column;

      &.difference {
        align-items: start;
      }
      &:not(.difference) {
        align-items: start;
      }
    }
  }

  .divider {
    width: 0;
    height: 1.25rem;
    border-left: 1px solid var(--global-ui-BorderColor);
  }
</style>
