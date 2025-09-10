<!--
// Copyright © 2025 Hardcore Engineering Inc.
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

  import home from '../plugin'

  import {
    updateHomeSetting,
    isHomeSettingEnabled,
    comfortableSettingId,
    compactSettingId,
    comfortableSettingId2,
    homeSettingsStore,
    homeViewSettings
  } from '../home'

  const dispatch = createEventDispatcher()

  let popupElement: HTMLDivElement | undefined = undefined

  const items = [
    {
      id: compactSettingId,
      label: home.string.Compact
    },
    {
      id: comfortableSettingId,
      label: home.string.Comfortable
    },
    {
      id: comfortableSettingId2,
      label: home.string.Comfortable2
    }
  ]

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
      list.select(selection - 1)
      return true
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
      return true
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const item = items[selection]
      if (item != null) {
        onToggle(item.id)
      }
      return true
    }
    return false
  }

  const manager = createFocusManager()

  $: if (popupElement) {
    popupElement.focus()
  }

  function onToggle (id: string): void {
    const isEnabled = !isHomeSettingEnabled($homeSettingsStore, id)
    updateHomeSetting(id, isEnabled)

    if (isEnabled) {
      for (const setting of homeViewSettings) {
        if (setting === id) continue
        updateHomeSetting(setting, false)
      }
    } else {
      const toEnable = homeViewSettings.find((it) => it !== id)
      if (toEnable != null) {
        updateHomeSetting(toEnable, true)
      }
      for (const setting of homeViewSettings) {
        if (setting === toEnable) continue
        updateHomeSetting(setting, false)
      }
    }
  }
</script>

<FocusHandler {manager} />

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="selectPopup"
  bind:this={popupElement}
  tabindex="0"
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
            <ModernToggle
              checked={isHomeSettingEnabled($homeSettingsStore, item.id)}
              size="small"
              on:change={() => {
                onToggle(item.id)
              }}
            />
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
