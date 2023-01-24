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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import task, { SpaceWithStates, State } from '@hcengineering/task'
  import { getPlatformColor, ScrollerBar } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import StatesBarElement from './StatesBarElement.svelte'
  import type { StatesBarPosition } from '../..'

  export let space: Ref<SpaceWithStates>
  export let state: Ref<State> | undefined = undefined
  export let gap: 'none' | 'small' | 'big' = 'small'

  let states: State[] = []
  let divScroll: HTMLElement

  const dispatch = createEventDispatcher()

  const statesQuery = createQuery()
  statesQuery.query(
    task.class.State,
    space != null ? { space } : {},
    (res) => {
      states = res
    },
    {
      sort: {
        rank: SortingOrder.Ascending
      }
    }
  )

  const selectItem = (ev: Event, item: State): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const rectScroll = divScroll.getBoundingClientRect()
    divScroll.scrollBy({
      top: 0,
      left: rect.left + rect.width / 2 - (rectScroll.left + rectScroll.width / 2),
      behavior: 'smooth'
    })
    if (state === item._id) {
      state = undefined
    } else {
      state = item._id
    }
    dispatch('change')
  }

  const getPosition = (n: number): StatesBarPosition => {
    if (n === 0) return 'start'
    else if (n === states.length - 1) return 'end'
    else return 'middle'
  }
</script>

<ScrollerBar {gap} bind:scroller={divScroll}>
  {#each states as item, i (item._id)}
    <StatesBarElement
      label={item.title}
      position={getPosition(i)}
      selected={item._id === state}
      color={getPlatformColor(item.color)}
      on:click={(ev) => {
        if (item._id !== state) selectItem(ev, item)
      }}
    />
  {/each}
</ScrollerBar>
