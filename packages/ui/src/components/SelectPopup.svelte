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
  import { deviceOptionsStore, mouseAttractor, resizeObserver } from '..'
  import { createFocusManager } from '../focus'
  import type { AnySvelteComponent } from '../types'
  import EditBox from './EditBox.svelte'
  import FocusHandler from './FocusHandler.svelte'
  import Icon from './Icon.svelte'
  import IconCheck from './icons/Check.svelte'
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

  let search: string = ''

  const dispatch = createEventDispatcher()

  $: hasSelected = value.some((v) => v.isSelected)

  let selection = 0
  let list: ListView

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
      dispatch('close', value[selection].id)
    }
  }
  const manager = createFocusManager()

  $: filteredObjects = value.filter((el) => (el.label ?? el.text ?? '').toLowerCase().includes(search.toLowerCase()))

  $: huge = size === 'medium' || size === 'large'

  let selectedDiv: HTMLElement | undefined
  let scrollDiv: HTMLElement | undefined
  let cHeight = 0

  const updateLocation = (scrollDiv?: HTMLElement, selectedDiv?: HTMLElement, objects?: ValueType[]) => {
    const objIt = objects?.find((it) => it.isSelected)
    if (objIt === undefined) {
      cHeight = 0
      return
    }
    if (scrollDiv && selectedDiv) {
      const r = selectedDiv.getBoundingClientRect()
      const r2 = scrollDiv.getBoundingClientRect()
      if (r && r2) {
        if (r.top > r2.top && r.bottom < r2.bottom) {
          cHeight = 0
        } else {
          if (r.bottom < r2.bottom) {
            cHeight = 1
          } else {
            cHeight = -1
          }
        }
      }
    }
  }

  $: updateLocation(scrollDiv, selectedDiv, filteredObjects)
</script>

<FocusHandler {manager} />

<div
  class="selectPopup"
  class:full-width={width === 'full'}
  class:max-width-40={width === 'large'}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  on:keydown={onKeydown}
>
  {#if searchable}
    <div class="header">
      <EditBox
        kind={'search-style'}
        focusIndex={1}
        focus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        {placeholder}
        {placeholderParam}
        on:change
      />
    </div>
  {/if}
  <div class:background-accent-bg-color={cHeight === 1} style:height={'2px'} />
  <div class="scroll" on:scroll={() => updateLocation(scrollDiv, selectedDiv, filteredObjects)} bind:this={scrollDiv}>
    <div class="box">
      <ListView
        bind:this={list}
        count={filteredObjects.length}
        bind:selection
        on:changeContent={() => dispatch('changeContent')}
      >
        <svelte:fragment slot="item" let:item={itemId}>
          {@const item = filteredObjects[itemId]}
          <button
            class="menu-item w-full"
            on:click={() => dispatch('close', item.id)}
            on:focus={() => dispatch('update', item)}
            on:mouseover={mouseAttractor(() => dispatch('update', item))}
            on:mouseenter={mouseAttractor(() => dispatch('update', item))}
          >
            <div class="flex-row-center" class:mt-2={huge} class:mb-2={huge}>
              {#if hasSelected}
                <div class="icon">
                  {#if item.isSelected}
                    <div bind:this={selectedDiv}>
                      <Icon icon={IconCheck} {size} />
                    </div>
                  {/if}
                </div>
              {/if}
              {#if item.component}
                <svelte:component this={item.component} {...item.props} />
              {:else}
                {#if item.icon}
                  <div class="icon mr-2">
                    <Icon icon={item.icon} iconProps={item.iconProps} fill={item.iconColor ?? 'currentColor'} {size} />
                  </div>
                {/if}
                <span class="label" class:text-base={huge}>
                  {#if item.label}
                    <Label label={item.label} />
                  {:else if item.text}
                    <span>{item.text}</span>
                  {/if}
                </span>
              {/if}
            </div>
          </button>
        </svelte:fragment>
        <svelte:fragment slot="category" let:item={row}>
          {@const obj = filteredObjects[row]}
          {#if obj.category && ((row === 0 && obj.category.label !== undefined) || obj.category.label !== filteredObjects[row - 1]?.category?.label)}
            <div class="flex p-1">
              <div class="icon mr-2">
                {#if obj.category.icon}
                  <Icon icon={obj.category.icon} size={'small'} />
                {/if}
              </div>
              <Label label={obj.category.label} />
            </div>
          {/if}
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class:background-accent-bg-color={cHeight === -1} style:height={'2px'} />
</div>
