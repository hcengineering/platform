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

  export let selectedFiltersRefs: Ref<Doc>[] | 'All' = 'All'
  export let filters: ActivityFilter[] = []

  const dispatch = createEventDispatcher()

  interface ActionMenu {
    label: IntlString
    checked: boolean
    value: Ref<Doc> | 'All'
  }
  let menu: ActionMenu[] = [
    {
      label: activity.string.All,
      checked: true,
      value: 'All'
    }
  ]
  filters.map((fl) => menu.push({ label: fl.label, checked: false, value: fl._id }))
  if (selectedFiltersRefs !== 'All') {
    selectedFiltersRefs.forEach((fl) => {
      const index = menu.findIndex((el) => el.value === fl)
      if (index !== -1) menu[index].checked = true
    })
  }

  let popup: HTMLElement
  $: popup?.focus()

  const btns: HTMLElement[] = []
  let activeElement: HTMLElement
  const keyDown = (ev: KeyboardEvent): void => {
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

  const checkAll = () => {
    menu.forEach((el, i) => (el.checked = i === 0))
    selectedFiltersRefs = 'All'
  }
  const uncheckAll = () => {
    menu.forEach((el) => (el.checked = true))
    const temp = filters.map((fl) => fl._id as Ref<Doc>)
    selectedFiltersRefs = temp
  }

  const selectRow = (n: number) => {
    if (n === 0) {
      if (selectedFiltersRefs === 'All') uncheckAll()
      else checkAll()
    } else {
      if (selectedFiltersRefs === 'All') {
        menu[n].checked = true
        selectedFiltersRefs = [menu[n].value as Ref<Doc>]
      } else if (menu[n].checked) {
        if (menu.filter((el) => el.checked).length === 2) checkAll()
        else {
          menu[n].checked = false
          selectedFiltersRefs = selectedFiltersRefs.filter((fl) => fl !== menu[n].value)
        }
      } else {
        menu[n].checked = true
        selectedFiltersRefs.push(menu[n].value as Ref<Doc>)
      }
    }
    menu = menu
    dispatch('update', { action: 'select', value: selectedFiltersRefs })
    setTimeout(() => dispatch('changeContent'), 0)
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
          on:click={() => selectRow(i)}
        >
          <div class="flex-center justify-end mr-3 pointer-events-none">
            <CheckBox checked={item.checked} symbol={selectedFiltersRefs !== 'All' && i === 0 ? 'minus' : 'check'} />
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
