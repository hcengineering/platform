<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { createEventDispatcher, onMount } from 'svelte'
  import { showPopup } from '../popups'
  import { DateOrShift } from '../types'
  import DateRangePresenter from './calendar/DateRangePresenter.svelte'
  import Calendar from './icons/Calendar.svelte'
  import Close from './icons/Close.svelte'
  import Label from './Label.svelte'
  import TimeShiftPopup from './TimeShiftPopup.svelte'
  import TimeShiftPresenter from './TimeShiftPresenter.svelte'

  export let title: IntlString
  export let value: DateOrShift | undefined
  export let show: boolean = false
  export let direction: 'before' | 'after' = 'before'

  const dispatch = createEventDispatcher()

  let opened: boolean = false
  let container: HTMLElement
  let btn: HTMLElement

  const changeValue = (result: DateOrShift): void => {
    if (result !== undefined) {
      value = result
      dispatch('change', result)
    }
  }

  onMount(() => {
    if (btn && show) {
      btn.click()
      show = false
    }
  })
</script>

<div
  class="antiSelect"
  bind:this={container}
  on:click|preventDefault={() => {
    btn.focus()
    if (!opened) {
      opened = true
      showPopup(TimeShiftPopup, { title, value, direction }, container, (ev) => {
        changeValue(ev)
        opened = false
      })
    }
  }}
>
  <button bind:this={btn} class="button round-2" class:selected={value?.shift}>
    <div class="icon">
      {#if show}<Close size={'small'} />{:else}<Calendar size={'medium'} />{/if}
    </div>
  </button>

  <div class="group">
    <span class="label"><Label label={title} /></span>
    {#if value?.shift !== undefined}
      <TimeShiftPresenter value={value.shift} />
    {:else}
      <DateRangePresenter value={value?.date} mode={DateRangeMode.DATETIME} editable={false} />
    {/if}
  </div>
</div>
