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
  import { createEventDispatcher } from 'svelte'
  import { onMount } from 'svelte'
  import type { IntlString } from '@anticrm/platform'
  import Calendar from './icons/Calendar.svelte'
  import Close from './icons/Close.svelte'
  import ui, { Label, DatePopup, DatePresenter, showPopup } from '..'

  export let title: IntlString
  export let value: Date | null | undefined = null
  export let withTime: boolean = false
  export let bigDay: boolean = false
  export let show: boolean = false

  const dispatch = createEventDispatcher()

  let opened: boolean = false
  let container: HTMLElement
  let btn: HTMLElement

  const changeValue = (result: any): void => {
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

<div class="antiSelect"
  bind:this={container}
  on:click|preventDefault={() => {
    btn.focus()
    if (!opened) {
      opened = true
      showPopup(DatePopup, { title, value, withTime }, container, (ev) => {
        changeValue(ev)
        opened = false
      }, changeValue)
    }
  }}
>
  <button
    bind:this={btn}
    class="button round-2"
    class:selected={value}
  >
    <div class="icon">
      {#if show}<Close size={'small'} />{:else}<Calendar size={'medium'} />{/if}
    </div>
  </button>

  <div class="group">
    <span class="label"><Label label={title} /></span>
    {#if value !== undefined}
      <DatePresenter {value} withTime={withTime} {bigDay} wraped={opened} />
    {:else}
      <span class="result not-selected"><Label label={ui.string.NotSelected} /></span>
    {/if}
  </div>
</div>
