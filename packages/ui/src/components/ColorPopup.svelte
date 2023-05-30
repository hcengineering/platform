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
  import type { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { deviceOptionsStore, resizeObserver, themeStore } from '..'
  import { getPlatformColorDef } from '../colors'
  import EditWithIcon from './EditWithIcon.svelte'
  import Icon from './Icon.svelte'
  import ListView from './ListView.svelte'
  import IconCheck from './icons/Check.svelte'
  import IconSearch from './icons/Search.svelte'

  export let placeholder: IntlString | undefined = undefined
  export let placeholderParam: any | undefined = undefined
  export let searchable: boolean = false
  export let selected: number | string | undefined = undefined
  export let value: Array<{ id: number | string; color: number; label: string }>

  let search: string = ''

  const dispatch = createEventDispatcher()

  $: objects = value.filter((el) => el.label.toLowerCase().includes(search.toLowerCase()))

  let selection = 0
  let list: ListView

  async function handleSelection (_: Event | undefined, selection: number): Promise<void> {
    const space = objects[selection]
    dispatch('close', space)
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(key, selection)
    }
  }
</script>

<div
  class="selectPopup"
  on:keydown={onKeydown}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  {#if searchable}
    <div class="header">
      <EditWithIcon
        icon={IconSearch}
        size={'large'}
        width={'100%'}
        autoFocus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        {placeholder}
        {placeholderParam}
        on:change
      />
    </div>
  {/if}
  <div class="scroll">
    <div class="box">
      <ListView
        bind:this={list}
        count={objects.length}
        bind:selection
        on:click={(evt) => handleSelection(evt, evt.detail)}
      >
        <svelte:fragment slot="item" let:item>
          {@const itemValue = objects[item]}
          {@const color = getPlatformColorDef(itemValue.color, $themeStore.dark)}
          <button
            class="menu-item withList w-full"
            on:click={() => {
              dispatch('close', itemValue)
            }}
          >
            <div class="color" style:background={color.color} />
            <span class="label" style:color={color.title}>{itemValue.label}</span>
            <div class="check">
              {#if itemValue.id === selected}
                <Icon icon={IconCheck} size={'small'} />
              {/if}
            </div>
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class="menu-space" />
</div>
