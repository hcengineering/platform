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
  import { Label, resizeObserver, CheckBox } from '@hcengineering/ui'
  import { Doc, Ref } from '@hcengineering/core'
  import { ActivityFilter } from '@hcengineering/activity'
  import activity from '../plugin'

  export let selectedFilter: Ref<Doc> | 'All' = 'All'
  export let filters: ActivityFilter[] = []

  const dispatch = createEventDispatcher()

  interface ActionMenu {
    label: IntlString
    checked: boolean
    value: Ref<Doc> | 'All'
  }
  const menu: ActionMenu[] = [
    {
      label: activity.string.All,
      checked: selectedFilter === 'All',
      value: 'All'
    }
  ]
  filters.map((fl) => menu.push({ label: fl.label, checked: selectedFilter === fl._id, value: fl._id }))

  let popup: HTMLElement
  $: popup?.focus()

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
      {#each menu as item, i}
        <button
          bind:this={btns[i]}
          class="ap-menuItem flex-row-center withIcon"
          class:hover={btns[i] === activeElement}
          on:mousemove={() => {
            if (btns[i] !== activeElement) activeElement = btns[i]
          }}
          on:click={() => {
            dispatch('close', { action: 'select', value: item.value })
          }}
        >
          <div class="flex-center justify-end mr-3 pointer-events-none">
            <CheckBox checked={item.checked} />
          </div>
          <span class="overflow-label">
            <Label label={item.label} />
          </span>
        </button>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>
