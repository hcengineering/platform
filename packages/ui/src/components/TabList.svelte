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
  import type { TabItem } from '../types'
  import { Label, Icon } from '..'

  export let selected: string | string[] = ''
  export let multiselect: boolean = false
  export let items: TabItem[]

  const dispatch = createEventDispatcher()

  if (multiselect && selected === '') selected = []
  if (selected === '') selected = items[0].id

  const getSelected = (id: string): boolean => {
    let res: boolean = false
    if (multiselect && Array.isArray(selected)) res = selected.filter((it) => it === id).length > 0
    else if (selected === id) res = true
    return res
  }
</script>

{#if items.length > 0}
  <div class="tablist-container">
    {#each items as item}
      <div
        class="button"
        class:selected={getSelected(item.id)}
        on:click={() => {
          if (multiselect) {
            if (Array.isArray(selected)) {
              if (selected.includes(item.id)) selected = selected.filter((it) => it !== item.id)
              else selected.push(item.id)
            }
          } else selected = item.id
          dispatch('select', item)
          items = items
        }}
      >
        {#if item.icon}
          <div class="icon"><Icon icon={item.icon} size={'small'} /></div>
        {:else if item.color}
          <div class="color" style:background-color={item.color} />
        {/if}
        <span class="overflow-label">
          {#if item.label}
            {item.label}
          {:else if item.labelIntl}
            <Label label={item.labelIntl} />
          {/if}
        </span>
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .tablist-container {
    display: flex;
    align-items: center;
    width: fit-content;
    background-color: var(--accent-bg-color);
    border-radius: 0.5rem;

    .button {
      position: relative;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      padding: 0.25rem 0.75rem;
      width: fit-content;
      height: 1.5rem;
      min-height: 1.5rem;
      max-width: 12.5rem;
      font-weight: 500;
      font-size: 0.8125rem;
      background-color: var(--accent-bg-color);
      border: 1px solid transparent;
      border-radius: calc(0.5rem - 1px);
      cursor: pointer;
      transition-property: background-color, color;
      transition-duration: 0.15s;

      .icon {
        margin-right: 0.375rem;
      }
      .color {
        margin-right: 0.375rem;
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 0.25rem;
      }
      &:hover {
        background-color: var(--button-bg-color);
      }
      &::before {
        position: absolute;
        top: 0.35rem;
        left: -1.5px;
        height: 0.8rem;
        border-left: 1px solid var(--button-border-color);
      }
      &.selected {
        color: var(--caption-color);
        background-color: var(--button-bg-color);
        border-color: var(--button-border-color);
        box-shadow: var(--accent-shadow);
      }
    }
    .button:not(.selected) + .button:not(.selected)::before {
      content: '';
    }
  }
</style>
