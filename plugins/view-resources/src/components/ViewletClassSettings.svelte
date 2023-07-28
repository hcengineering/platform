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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { Button, ToggleWithLabel } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'

  export let viewlet: Viewlet
  export let items: (Config | AttributeConfig)[] = []

  const dispatch = createEventDispatcher()

  interface Config {
    value: string | BuildModelKey | undefined
    type: 'divider' | 'attribute'
  }

  interface AttributeConfig extends Config {
    type: 'attribute'
    enabled: boolean
    label: IntlString
    _class: Ref<Class<Doc>>
    icon: Asset | undefined
    order?: number
  }

  function isAttribute (val: Config): val is AttributeConfig {
    return val.type === 'attribute'
  }

  function dragEnd () {
    selected = undefined
    dispatch('save', items)
  }

  function dragOver (e: DragEvent, i: number) {
    e.preventDefault()
    e.stopPropagation()
    const s = selected as number
    if (dragswap(e, i, s)) {
      ;[items[i], items[s]] = [items[s], items[i]]
      selected = i
    }
  }

  const elements: HTMLElement[] = []

  function dragswap (ev: MouseEvent, i: number, s: number): boolean {
    if (i < s) {
      return ev.offsetY < elements[i].offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > elements[i].offsetHeight / 2
    }
    return false
  }

  function change (item: Config, value: boolean): void {
    if (isAttribute(item)) {
      item.enabled = value
      dispatch('save', items)
    }
  }

  let selected: number | undefined
</script>

<div class="flex-row-reverse mb-2 mr-2">
  <Button
    on:click={() => dispatch('restoreDefaults')}
    label={view.string.RestoreDefaults}
    size={'x-small'}
    kind={'link'}
    noFocus
  />
</div>
{#each items as item, i}
  {#if isAttribute(item)}
    <div
      class="menu-item flex-row-center"
      bind:this={elements[i]}
      draggable={viewlet.configOptions?.sortable && item.enabled}
      on:dragstart={(ev) => {
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = 'move'
          ev.dataTransfer.dropEffect = 'move'
        }
        // ev.preventDefault()
        ev.stopPropagation()
        selected = i
      }}
      on:dragover|preventDefault={(e) => dragOver(e, i)}
      on:dragend={dragEnd}
    >
      <ToggleWithLabel
        on={item.enabled}
        label={item.label}
        on:change={(e) => {
          change(item, e.detail)
        }}
      />
    </div>
  {:else}
    <div class="antiDivider" />
  {/if}
{/each}

<style lang="scss">
  .item {
    padding: 0.5rem;
    border-radius: 0.25rem;
    &:hover {
      background-color: var(--theme-button-hovered);
    }
  }
</style>
