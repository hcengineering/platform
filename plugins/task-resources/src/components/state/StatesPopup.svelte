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
  import { getColorNumberByText, getPlatformColorDef, resizeObserver, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let space: Ref<SpaceWithStates>
  let states: State[] = []
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
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#each states as state}
        {@const color = getPlatformColorDef(state.color ?? getColorNumberByText(state.name), $themeStore.dark)}
        <button
          class="menu-item"
          on:click={() => {
            dispatch('close', state)
          }}
        >
          <div class="color" style:background-color={color.color} />
          <span class="label">{state.name}</span>
        </button>
      {/each}
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .color {
    flex-shrink: 0;
    margin-right: 0.75rem;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
  }
</style>
