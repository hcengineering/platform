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
    Button,
    ButtonKind,
    ButtonSize,
    DatePopup,
    SimpleDatePopup,
    eventToHTMLElement,
    showPopup,
    TimeInputBox,
    TimeShiftPresenter
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import DateLocalePresenter from './DateLocalePresenter.svelte'

  export let date: number
  export let difference: number = 0
  export let direction: 'vertical' | 'horizontal' = 'vertical'
  export let showDate: boolean = true
  export let withoutTime: boolean
  export let kind: ButtonKind = 'ghost'
  export let size: ButtonSize = 'medium'
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()

  $: currentDate = new Date(date)

  function timeClick (e: MouseEvent) {
    if (!showDate) {
      showPopup(
        DatePopup,
        { currentDate, withTime: !withoutTime, label: ui.string.SelectDate, noShift: true },
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
    showPopup(SimpleDatePopup, { currentDate }, eventToHTMLElement(e), (res) => {
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
  class:gap-1-5={direction === 'horizontal'}
>
  {#if showDate || withoutTime}
    <Button {kind} {size} padding={'0 .5rem'} shape={'round-sm'} on:click={dateClick} {disabled}>
      <svelte:fragment slot="content">
        <DateLocalePresenter date={currentDate.getTime()} />
      </svelte:fragment>
    </Button>
  {/if}
  {#if !withoutTime}
    <Button {kind} {size} padding={'0 .5rem'} shape={'round-sm'} on:click={timeClick} {disabled}>
      <svelte:fragment slot="content">
        <TimeInputBox bind:currentDate noBorder size={'small'} on:update={(date) => updateTime(date.detail)} />
        {#if difference > 0}
          <div class="ml-2 flex-no-shrink content-darker-color overflow-label">
            <TimeShiftPresenter value={date - difference} exact />
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  {/if}
</div>

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
        align-items: stretch;
      }
    }
  }
</style>
