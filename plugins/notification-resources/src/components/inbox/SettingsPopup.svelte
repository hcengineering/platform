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
  import { createEventDispatcher } from 'svelte'
  import { createFocusManager, FocusHandler, Label, ListView, ModernToggle, resizeObserver } from '@hcengineering/ui'
  import { SettingItem } from '../../types'

  export let items: SettingItem[] = []

  let popupElement: HTMLDivElement | undefined = undefined

  const dispatch = createEventDispatcher()

  let selection = 0
  let list: ListView

  export function onKeydown (key: KeyboardEvent): boolean {
    if (key.code === 'Tab') {
      dispatch('close')
      key.preventDefault()
      key.stopPropagation()
      return true
    }
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      selectIndex(selection - 1)
      return true
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      selectIndex(selection + 1)
      return true
    }
    if (key.code === 'Home') {
      key.stopPropagation()
      key.preventDefault()
      selectIndex(0)
      return true
    }
    if (key.code === 'End') {
      key.stopPropagation()
      key.preventDefault()
      selectIndex(items.length - 1)
      return true
    }
    if (key.code === 'Enter' || key.code === 'Space') {
      key.preventDefault()
      key.stopPropagation()
      toggleSelectedItem()
      return true
    }
    return false
  }

  const manager = createFocusManager()

  $: if (popupElement) {
    popupElement.focus()
  }

  function selectIndex (index: number): void {
    if (items.length === 0) return

    list.select(Math.max(0, Math.min(index, items.length - 1)))
  }

  function toggleSelectedItem (): void {
    const item = items[selection]
    if (item === undefined) return

    item.onToggle()
    items = items.map((settingItem, index) => {
      if (index === selection) {
        return { ...settingItem, on: !settingItem.on }
      }

      return settingItem
    })
  }
</script>

<FocusHandler {manager} />

<div
  class="selectPopup"
  bind:this={popupElement}
  tabindex="0"
  role="dialog"
  aria-label="Inbox settings"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  on:keydown={onKeydown}
>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={items.length} bind:selection on:changeContent={() => dispatch('changeContent')}>
        <svelte:fragment slot="item" let:item={itemId}>
          {@const item = items[itemId]}
          <div class="menu-item withList w-full container">
            <Label label={item.label} />
            <ModernToggle checked={item.on} size="small" on:change={item.onToggle} />
          </div>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
</style>
