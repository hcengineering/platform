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
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import ui, {
    EditWithIcon,
    Icon,
    IconCheck,
    IconChevronRight,
    IconSearch,
    Label,
    NestedSelectPopup,
    resizeObserver,
    Submenu
  } from '..'
  import type { NestedSelectItem } from '../types'

  export let items: NestedSelectItem[] = []
  export let selectedValues: (string | number)[] = []
  export let placeholder: IntlString = ui.string.Search
  export let isTopLevel: boolean = true
  export let onChange: ((values: (string | number)[]) => void) | undefined = undefined

  const dispatch = createEventDispatcher()
  let search: string = ''

  function filterNodes (nodes: NestedSelectItem[], query: string): NestedSelectItem[] {
    if (!query) return nodes

    const q = query.toLowerCase()
    return nodes
      .map((node): NestedSelectItem | null => {
        const filteredChildren = node.children ? filterNodes(node.children, query) : []
        const labelStr = typeof node.label === 'string' ? node.label : ''
        const matches = labelStr.toLowerCase().includes(q)

        if (matches || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren }
        }
        return null
      })
      .filter((n): n is NestedSelectItem => n !== null)
  }

  $: displayItems = isTopLevel ? filterNodes(items, search) : items

  function toggle (id: string | number): void {
    const set = new Set(selectedValues)
    if (set.has(id)) {
      set.delete(id)
    } else {
      set.add(id)
    }
    selectedValues = Array.from(set)
    dispatch('update', selectedValues)
    onChange?.(selectedValues)
  }

  function handleUpdate (values: (string | number)[]): void {
    selectedValues = values
    dispatch('update', selectedValues)
    onChange?.(selectedValues)
  }
</script>

<div
  class="selectPopup"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  {#if isTopLevel}
    <div class="header">
      <EditWithIcon icon={IconSearch} size={'large'} width={'100%'} bind:value={search} {placeholder} autoFocus />
    </div>
  {:else}
    <div class="menu-space" />
  {/if}

  <div class="scroll">
    <div class="box">
      {#each displayItems as item (item.id)}
        {#if item.children && item.children.length > 0}
          <Submenu
            withHover
            props={{
              items: item.children,
              selectedValues,
              isTopLevel: false,
              onChange: handleUpdate
            }}
            options={{
              component: NestedSelectPopup
            }}
          >
            <div
              slot="item"
              class="flex-row-center w-full"
              on:click={() => {
                toggle(item.id)
              }}
            >
              <div
                class="check ml-0 mr-2"
                on:click|stopPropagation={() => {
                  toggle(item.id)
                }}
              >
                {#if selectedValues.includes(item.id)}
                  <Icon icon={IconCheck} size="small" />
                {/if}
              </div>
              {#if item.icon}
                <div class="icon">
                  <Icon icon={item.icon} iconProps={item.iconProps} size="small" />
                </div>
              {/if}
              <div class="label"><Label label={item.label} /></div>
            </div>
          </Submenu>
        {:else}
          <button
            class="menu-item flex-row-center w-full"
            on:click={() => {
              toggle(item.id)
            }}
          >
            <div class="check ml-0 mr-2">
              {#if selectedValues.includes(item.id)}
                <Icon icon={IconCheck} size="small" />
              {/if}
            </div>
            {#if item.icon}
              <div class="icon">
                <Icon icon={item.icon} iconProps={item.iconProps} size="small" />
              </div>
            {/if}
            <div class="label"><Label label={item.label} /></div>
          </button>
        {/if}
      {/each}
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  :global(.selectPopup .check),
  :global(.selectPopup .icon) {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  :global(.selectPopup .icon .emoji) {
    justify-content: flex-start !important;
  }
</style>
