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
  import { createEventDispatcher, onMount } from 'svelte'
  import { IntlString } from '@hcengineering/platform'
  import { Label, resizeObserver, CheckBox, MiniToggle } from '@hcengineering/ui'
  import type { FilterOptions, FilterItem, FilterIndex } from '..'

  export let filter: FilterOptions

  const dispatch = createEventDispatcher()

  let arrFilter: Array<{ index: FilterIndex; value: FilterItem }>
  $: if (filter) {
    arrFilter = []
    filter.forEach((value, index) => arrFilter.push({ index, value }))
  }

  const checking = (fi: FilterIndex, val: boolean) => {
    dispatch('update', {
      filter: fi,
      label: filter?.get(fi)?.label,
      visible: val
    })
  }

  let popup: HTMLElement
  $: popup?.focus()
  const noString: IntlString = '' as IntlString

  const btns: HTMLElement[] = []
  let activeElement: HTMLElement
  const keyDown = (ev: KeyboardEvent): void => {
    console.log('[KEY]', ev.key)
    const n = btns.indexOf(activeElement) ?? 0
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault()
      ev.stopPropagation()
      btns[n].focus()
      btns[n].click()
    }
    if (filter?.get('All')?.visible) activeElement = btns[0]
    else {
      if (ev.key === 'ArrowDown') {
        if (n < btns.length - 1) {
          activeElement = btns[n + 1]
        }
        ev.preventDefault()
        ev.stopPropagation()
      }
      if (ev.key === 'ArrowUp') {
        if (n > 0) {
          activeElement = btns[n - 1]
        }
        ev.preventDefault()
        ev.stopPropagation()
      }
    }
  }

  onMount(() => {
    if (btns[0]) {
      btns[0].focus()
    }
  })
</script>

<div
  class="antiPopup"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  on:keydown={keyDown}
>
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box" bind:this={popup}>
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      {#each arrFilter as f, i}
        <button
          bind:this={btns[i]}
          class="ap-menuItem flex-row-center withIcon"
          class:hover={btns[i] === activeElement}
          disabled={f.index !== 'All' && filter?.get('All')?.visible}
          on:mousemove={() => {
            if (btns[i] !== activeElement) activeElement = btns[i]
          }}
          on:click={() => {
            checking(f.index, !f.value.visible)
            filter?.set(f.index, {
              label: filter.get(f.index)?.label ?? noString,
              visible: !f.value.visible
            })
            filter = filter
          }}
        >
          <div class="flex-center min-w-8 justify-end mr-3 pointer-events-none">
            {#if f.index === 'All'}
              <MiniToggle bind:on={f.value.visible} />
            {:else}
              <CheckBox checked={f.value.visible} readonly={f.index !== 'All' && filter?.get('All')?.visible} />
            {/if}
          </div>
          <span
            class="overflow-label mr-2{(f.index !== 'All' && filter?.get('All')?.visible) ||
            (f.index === 'All' && !filter?.get('All')?.visible)
              ? ' dark-color'
              : ''}"
          >
            <Label label={f.value.label} />
          </span>
        </button>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>
