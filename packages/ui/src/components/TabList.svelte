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
  import { tooltip } from '../tooltips'
  import type { TabItem, IconSize } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let selected: string | string[] = ''
  export let multiselect: boolean = false
  export let items: TabItem[]
  export let kind: 'normal' | 'secondary' = 'normal'
  export let onlyIcons: boolean = false
  export let size: 'small' | 'medium' = 'medium'

  const dispatch = createEventDispatcher()

  if (multiselect && selected === '') selected = []
  if (selected === '') selected = items[0].id

  const getSelected = (id: string): boolean => {
    let res: boolean = false
    if (multiselect && Array.isArray(selected)) res = selected.filter((it) => it === id).length > 0
    else if (selected === id) res = true
    return res
  }
  const tabs: HTMLElement[] = []

  let iconSize: IconSize
  $: iconSize = onlyIcons ? (size === 'small' ? 'small' : 'medium') : size === 'small' ? 'x-small' : 'small'
</script>

{#if items.length > 0}
  <div class="tablist-container {kind} {size}">
    {#each items as item, i}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        bind:this={tabs[i]}
        class="button"
        class:onlyIcons
        class:selected={getSelected(item.id)}
        data-view={item.tooltip}
        use:tooltip={{ label: item.tooltip ?? undefined, element: tabs[i] ?? undefined }}
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
          <div class="icon">
            <Icon icon={item.icon} size={iconSize} fill={item.color ?? 'currentColor'} />
          </div>
        {:else if item.color}
          <div class="color" style:background-color={item.color} />
        {/if}
        {#if item.label || item.labelIntl}
          <span class="overflow-label" class:ml-1-5={item.icon || item.color}>
            {#if item.label}
              {item.label}
            {:else if item.labelIntl}
              <Label label={item.labelIntl} />
            {/if}
          </span>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .tablist-container {
    display: flex;
    align-items: center;
    width: fit-content;

    .button {
      position: relative;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: fit-content;
      min-height: 1.375rem;
      max-width: 12.5rem;
      font-weight: 500;
      font-size: 0.8125rem;
      cursor: pointer;
      transition-property: background-color, color;
      transition-duration: 0.15s;

      .color {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 0.25rem;
      }
      &::before {
        position: absolute;
        top: 0.35rem;
        left: -1.5px;
        height: 0.8rem;
        border-left: 1px solid var(--button-border-color);
      }
    }
    .button:not(.selected) + .button:not(.selected)::before {
      content: '';
    }

    &.small {
      .button {
        padding: 0 0.5rem;

        &.onlyIcons {
          padding: 0.375rem;
        }
      }
      &.normal .button {
        height: 1.5rem;
      }
      &.secondary .button {
        height: 1.375rem;
      }
    }
    &.medium .button {
      height: 2rem;
      padding: 0.25rem 0.75rem;

      &.onlyIcons {
        padding: 0.375rem;
      }
    }
    &.normal {
      background-color: var(--theme-tablist-color);
      border-radius: 0.25rem;

      .button {
        color: var(--theme-trans-color);
        border: 1px solid transparent;
        border-radius: 0.25rem;

        &.selected {
          color: var(--theme-caption-color);
          background-color: var(--theme-button-enabled);
          border-color: var(--theme-button-border);

          &:hover {
            background-color: var(--theme-button-hovered);
          }
        }
      }
    }
    &.secondary {
      background-color: var(--button-bg-color);
      border: 1px solid var(--button-border-color);
      border-radius: 0.25rem;
      box-shadow: var(--button-shadow);

      .button {
        background-color: transparent;
        border-radius: calc(0.25rem - 1px);

        &:hover {
          color: var(--caption-color);
        }
        &.selected {
          color: var(--caption-color);
          background-color: var(--button-bg-hover);
        }
        &:not(:first-child) {
          margin-left: 0.125rem;
        }
      }
    }
  }
</style>
