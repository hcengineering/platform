<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Ref, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import task, { SpaceWithStates, State } from '@anticrm/task'
  import { getPlatformColor } from '@anticrm/ui'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import StatesBarElement from './StatesBarElement.svelte'

  export let space: Ref<SpaceWithStates>
  export let state: Ref<State> | undefined = undefined
  let states: State[] = []

  let div: HTMLElement
  let maskLeft: boolean = false
  let maskRight: boolean = false
  let mask: 'left' | 'right' | 'both' | 'none' = 'none'

  const dispatch = createEventDispatcher()

  const statesQuery = createQuery()
  statesQuery.query(
    task.class.State,
    { space },
    (res) => {
      states = res
    },
    {
      sort: {
        rank: SortingOrder.Ascending
      }
    }
  )

  const checkMask = (): void => {
    maskLeft = !!(div && div.scrollLeft > 1)
    maskRight = !!(div && div.scrollWidth - div.scrollLeft - div.clientWidth > 1)
    if (maskLeft || maskRight) {
      if (maskLeft && maskRight) mask = 'both'
      else if (maskLeft) mask = 'left'
      else if (maskRight) mask = 'right'
    } else mask = 'none'
  }

  const selectItem = (ev: Event, item: State): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    if (state === item._id) {
      state = undefined
    } else {
      state = item._id
    }
    dispatch('change')
  }

  onMount(() => {
    if (div) {
      checkMask()
      div.addEventListener('scroll', checkMask)
    }
  })
  onDestroy(() => {
    if (div) div.removeEventListener('scroll', checkMask)
  })
</script>

<div bind:this={div} class="flex-row-center statusesbar-container {mask}">
  {#each states as item, i}
    <div
      class="flex-row-center cursor-pointer step-lr25"
      class:selected={item._id === state}
      on:click={(ev) => {
        selectItem(ev, item)
      }}
    >
      <StatesBarElement side={'left'} kind={i ? 'arrow' : 'round'} selected={item._id === state} color={getPlatformColor(item.color)} />
      <div
        class="flex-row-center overflow-label label"
        style={item._id === state ? `background-color: ${getPlatformColor(item.color)};` : ''}
      >
        {item.title}
      </div>
      <StatesBarElement
        side={'right'}
        kind={i < states.length - 1 ? 'arrow' : 'round'}
        selected={item._id === state}
        color={getPlatformColor(item.color)}
      />
    </div>
  {/each}
</div>

<style lang="scss">
  .statusesbar-container {
    overflow-x: auto;
    padding: 0.125rem 0;

    &::-webkit-scrollbar:horizontal {
      height: 0.125rem;
    }
    &::-webkit-scrollbar-track {
      margin: 0.25rem;
    }
    &::-webkit-scrollbar-thumb {
      background-color: var(--theme-bg-accent-color);
    }
  }

  .label {
    padding: 0.5rem 2rem;
    height: 2.25rem;
    max-height: 2.25rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-enabled);
    border-top: 1px solid var(--theme-button-border-enabled);
    border-bottom: 1px solid var(--theme-button-border-enabled);
  }

  .selected {
    .label {
      border-color: transparent;
    }
  }
  .left {
    mask-image: linear-gradient(to right, rgba(0, 0, 0, 0) 0, rgba(0, 0, 0, 1) 1rem);
  }
  .right {
    mask-image: linear-gradient(to left, rgba(0, 0, 0, 0) 0, rgba(0, 0, 0, 1) 1rem);
  }
  .both {
    mask-image: linear-gradient(
      to right,
      rgba(0, 0, 0, 0) 0,
      rgba(0, 0, 0, 1) 1rem,
      rgba(0, 0, 0, 1) calc(100% - 1rem),
      rgba(0, 0, 0, 0) 100%
    );
  }
  .none {
    mask-image: linear-gradient(to right, rgba(0, 0, 0, 0) 1);
  }
</style>
