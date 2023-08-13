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
  import { createEventDispatcher } from 'svelte'
  import type { DropdownIntlItem } from '../types'
  import IconCheck from './icons/Check.svelte'
  import Label from './Label.svelte'
  import { resizeObserver } from '..'

  export let items: DropdownIntlItem[]
  export let selected: DropdownIntlItem['id'] | undefined = undefined
  export let params: Record<string, any> = {}

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
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#each items as item, i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="menu-item flex-between"
          on:mouseover={(ev) => ev.currentTarget.focus()}
          on:keydown={(ev) => keyDown(ev, i)}
          on:click={() => {
            dispatch('close', item.id)
          }}
        >
          <div class="flex-grow caption-color nowrap"><Label label={item.label} params={item.params ?? params} /></div>
          <div class="check">
            {#if item.id === selected}<IconCheck size={'small'} />{/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
  <div class="menu-space" />
</div>
