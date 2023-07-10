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
  import type { TabItem, IconSize, WidthType, DropdownIntlItem } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import DropdownLabelsIntl from './DropdownLabelsIntl.svelte'
  import { checkAdaptiveMatching, deviceOptionsStore as deviceInfo } from '..'

  export let selected: string | string[] = ''
  export let multiselect: boolean = false
  export let items: TabItem[]
  export let kind: 'normal' | 'regular' | 'plain' | 'separated' | 'separated-free' = 'normal'
  export let onlyIcons: boolean = false
  export let size: 'small' | 'medium' = 'medium'
  export let adaptiveShrink: WidthType | null = null

  const dispatch = createEventDispatcher()

  if (multiselect && selected === '') selected = []
  if (selected === '') selected = items[0].id

  const getSelected = (id: string, selected: string | string[]): boolean => {
    let res: boolean = false
    if (multiselect && Array.isArray(selected)) res = selected.filter((it) => it === id).length > 0
    else if (selected === id) res = true
    return res
  }
  const tabs: HTMLElement[] = []

  let iconSize: IconSize
  $: iconSize = onlyIcons ? (size === 'small' ? 'small' : 'medium') : size === 'small' ? 'x-small' : 'small'

  $: devSize = $deviceInfo.size
  $: adaptive = adaptiveShrink !== null ? checkAdaptiveMatching(devSize, adaptiveShrink) : false

  let ddItems: DropdownIntlItem[]
  $: ddItems = items.map((it) => ({ id: it.id, label: it.labelIntl, params: it.labelParams } as DropdownIntlItem))
</script>

{#if items.length > 0}
  {#if adaptive}
    <DropdownLabelsIntl
      items={ddItems}
      {size}
      selected={Array.isArray(selected) ? selected[0] : selected}
      on:selected={(e) => {
        const item = items.filter((it) => it.id === e.detail)[0]
        if (Array.isArray(selected)) selected[0] = item.id
        else selected = item.id
        dispatch('select', item)
      }}
    />
  {:else}
    <div class="tablist-container {kind} {size}">
      {#each items as item, i}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          bind:this={tabs[i]}
          class={kind === 'normal' || kind === 'regular' ? 'button' : 'plain'}
          class:separated={kind === 'separated' || kind === 'separated-free'}
          class:free={kind === 'separated-free'}
          class:onlyIcons
          class:selected={getSelected(item.id, selected)}
          data-view={item.tooltip}
          data-id={`tab-${item.id}`}
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
                <Label label={item.labelIntl} params={item.labelParams} />
              {/if}
            </span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
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
      font-size: 0.8125rem;
      transition-property: background-color, color;
      transition-duration: 0.15s;

      &:not(.selected) {
        cursor: pointer;
      }
      .color {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 0.25rem;
      }
      &::before {
        position: absolute;
        top: 50%;
        left: -1.5px;
        height: 70%;
        border-left: 1px solid var(--button-border-color);
        transform: translateY(-50%);
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
      &.regular .button {
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
          background-color: var(--theme-button-default);
          border-color: var(--theme-button-border);

          &:hover {
            background-color: var(--theme-button-hovered);
          }
        }
      }
    }
    &.regular {
      background-color: var(--theme-button-default);
      border: 1px solid var(--theme-button-border);
      border-radius: 0.25rem;

      .button {
        background-color: transparent;
        border-radius: calc(0.25rem - 1px);

        &:hover {
          color: var(--theme-caption-color);
        }
        &.selected {
          color: var(--theme-caption-color);
          background-color: var(--theme-button-pressed);
        }
        &:not(:first-child) {
          margin-left: 0.125rem;
        }
      }
    }

    &.plain,
    &.separated {
      margin-bottom: -1px;
      height: 100%;
    }
    .plain {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: fit-content;
      height: 100%;
      max-width: 12.5rem;
      min-height: 3.25rem;
      color: var(--theme-dark-color);
      border-top: 2px solid transparent;
      border-bottom: 2px solid transparent;

      &:not(.selected) {
        cursor: pointer;
      }
      &.selected {
        color: var(--theme-caption-color);
        border-bottom-color: var(--theme-tablist-plain-color);
      }
      &:not(:first-child, .separated) {
        margin-left: 2rem;
      }
      &.separated {
        position: relative;
        margin: 0 1.25rem;

        &::before {
          position: absolute;
          content: '';
          top: 50%;
          left: -1.25rem;
          width: 1px;
          height: 2rem;
          background-color: var(--theme-tablist-plain-divider);
          transform: translateY(-50%);
        }
        &.free:first-child::before {
          content: none;
        }
      }
    }
  }
</style>
