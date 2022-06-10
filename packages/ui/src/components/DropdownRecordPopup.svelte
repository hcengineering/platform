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
  import { IntlString } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import CheckBox from './CheckBox.svelte'
  import { Label } from '..'

  export let items: Record<any, IntlString>
  export let selected: any | undefined = undefined

  const dispatch = createEventDispatcher()
  const btns: HTMLButtonElement[] = []

  const keyDown = (ev: KeyboardEvent, n: number): void => {
    if (ev.key === 'ArrowDown') {
      if (n === btns.length - 1) btns[0].focus()
      else btns[n + 1].focus()
    } else if (ev.key === 'ArrowUp') {
      if (n === 0) btns[btns.length - 1].focus()
      else btns[n - 1].focus()
    }
  }
  $: dropdownItems = Object.entries(items)
</script>

<div class="selectPopup">
  <div class="scroll">
    <div class="box">
      {#each dropdownItems as [key, value], i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="menu-item flex-between"
          on:mouseover={(ev) => ev.currentTarget.focus()}
          on:keydown={(ev) => keyDown(ev, i)}
          on:click={() => {
            dispatch('close', key)
          }}
        >
          <div class="flex-grow caption-color overflow-label"><Label label={value} /></div>
          {#if key === selected}
            <div class="check-right"><CheckBox checked primary /></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
