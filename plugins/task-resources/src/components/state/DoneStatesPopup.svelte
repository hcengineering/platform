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
  import { Class, Doc, Ref, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { DoneState, SpaceWithStates } from '@anticrm/task'
  import { getPlatformColor, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'

  export let space: Ref<SpaceWithStates>
  let states: DoneState[] = []
  const dispatch = createEventDispatcher()
  const statesQuery = createQuery()
  statesQuery.query(
    task.class.DoneState,
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
  function getColor (_class: Ref<Class<Doc>>): string {
    return _class === task.class.WonState ? getPlatformColor(0) : getPlatformColor(11)
  }
</script>

<div class="flex-col statuses-container">
  {#each states as state}
    <div
      class="flex-row-center state"
      on:click={() => {
        dispatch('close', state)
      }}
    >
      <div class="color" style="background-color: {getColor(state._class)}" />
      {state.title}
    </div>
  {/each}
  <div
      class="flex-row-center state"
      on:click={() => {
        dispatch('close', null)
      }}
    >
      <div class="color" style="border: 0.5px #ffffff55 solid"/>
      <Label label={task.string.NoDoneState}/>
    </div>
</div>

<style lang="scss">
  .statuses-container {
    padding: 0.5rem;
    max-height: 100%;
    min-width: 10rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.75rem;
    user-select: none;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, 0.35));

    .state {
      padding: 0.5rem;
      border-radius: 0.5rem;
      cursor: pointer;

      &:hover {
        background-color: var(--theme-button-bg-hovered);
      }
      .color {
        margin-right: 0.75rem;
        width: .5rem;
        height: .5rem;
        border-radius: .5rem;
      }
    }
  }
  .not-done {
    margin-left: 1.25rem;
  }
</style>
