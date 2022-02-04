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

<div class="antiPopup">
  <div class="ap-space" />
  {#each states as state}
    <button
      class="ap-menuItem ap-woScroll flex-row-center"
      on:click={() => {
        dispatch('close', state)
      }}
    >
      <div class="color" style="background-color: {getPlatformColor(state.color)}" />
      {state.title}
    </button>
  {/each}
  <div class="ap-space" />
</div>

<style lang="scss">
  .color {
    margin-right: .75rem;
    width: 1rem;
    height: 1rem;
    border-radius: .25rem;
  }
</style>
