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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { deviceOptionsStore, resizeObserver } from '..'
  import { createFocusManager } from '../focus'
  import type { AnySvelteComponent } from '../types'
  import EditWithIcon from './EditWithIcon.svelte'
  import FocusHandler from './FocusHandler.svelte'
  import Icon from './Icon.svelte'
  import IconCheck from './icons/Check.svelte'
  import IconSearch from './icons/Search.svelte'
  import Label from './Label.svelte'
  import ListView from './ListView.svelte'

  interface ValueType {
    id: number | string | null
    icon?: Asset | AnySvelteComponent
    iconProps?: Record<string, any>
    iconColor?: string
    label?: IntlString
    text?: string
    isSelected?: boolean

    component?: AnySvelteComponent
    props?: Record<string, any>

    category?: {
      icon?: Asset
      label: IntlString
    }
  }

  export let placeholder: IntlString | undefined = undefined
  export let placeholderParam: any | undefined = undefined
  export let searchable: boolean = false
  export let value: Array<ValueType>
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let size: 'small' | 'medium' | 'large' = 'small'
  export let onSelect: ((value: ValueType['id']) => void) | undefined = undefined
  export let showShadow: boolean = true
  export let embedded: boolean = false

  let search: string = ''

  const dispatch = createEventDispatcher()

  $: hasSelected = value.some((v) => v.isSelected)

  let selection = 0
  let list: ListView

  function sendSelect (id: ValueType['id']): void {
    if (onSelect) {
      onSelect(id)
    } else {
      dispatch('close', id)
    }
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
      sendSelect(value[selection].id)
    }
  }
  const manager = createFocusManager()

  $: filteredObjects = value.filter((el) => (el.label ?? el.text ?? '').toLowerCase().includes(search.toLowerCase()))

  $: huge = size === 'medium' || size === 'large'
</script>

<FocusHandler {manager} />

<div
  class="selectPopup"
  class:noShadow={showShadow === false}
  class:full-width={width === 'full'}
  class:max-width-40={width === 'large'}
  class:embedded
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  on:keydown={onKeydown}
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
  {:else}
    <div class="menu-space" />
  {/if}
  <div class="scroll">
    <div class="box">
      <ListView
        bind:this={list}
        count={filteredObjects.length}
        bind:selection
        on:changeContent={() => dispatch('changeContent')}
      >
        <svelte:fragment slot="item" let:item={itemId}>
          {@const item = filteredObjects[itemId]}
          <button class="menu-item withList w-full" on:click={() => sendSelect(item.id)}>
            <div class="flex-row-center flex-grow pointer-events-none">
              {#if item.component}
                <div class="flex-grow clear-mins"><svelte:component this={item.component} {...item.props} /></div>
              {:else}
                {#if item.icon}
                  <div class="icon mr-2">
                    <Icon icon={item.icon} iconProps={item.iconProps} fill={item.iconColor ?? 'currentColor'} {size} />
                  </div>
                {/if}
                <span class="label overflow-label flex-grow" class:text-base={huge}>
                  {#if item.label}
                    <Label label={item.label} />
                  {:else if item.text}
                    {item.text}
                  {/if}
                </span>
              {/if}
              {#if hasSelected}
                <div class="check">
                  {#if item.isSelected}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              {/if}
            </div>
          </button>
        </svelte:fragment>
        <svelte:fragment slot="category" let:item={row}>
          {@const obj = filteredObjects[row]}
          {#if obj.category && ((row === 0 && obj.category.label !== undefined) || obj.category.label !== filteredObjects[row - 1]?.category?.label)}
            {#if row > 0}<div class="menu-separator" />{/if}
            <div class="menu-group__header flex-row-center">
              <!-- {#if obj.category.icon}
                <div class="flex-no-shrink mr-2">
                  <Icon icon={obj.category.icon} size={'small'} />
                </div>
              {/if} -->
              <span class="overflow-label">
                <Label label={obj.category.label} />
              </span>
            </div>
          {/if}
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  {#if !embedded}<div class="menu-space" />{/if}
</div>
