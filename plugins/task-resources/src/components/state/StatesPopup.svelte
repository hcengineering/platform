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
  import { Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import task, { SpaceWithStates, State } from '@anticrm/task'
  import { createEventDispatcher } from 'svelte'

  export let space: Ref<SpaceWithStates>
  let states: State[] = []
  const dispatch = createEventDispatcher()
  const statesQuery = createQuery()
  statesQuery.query(task.class.State, { space }, (res) => { states = res })

</script>

<div class="flex-col statuses-container">
  {#each states as state}
    <div class="flex-row-center state" on:click={() => { dispatch('close', state) }}>
      <div class="color" style="background-color: {state.color}"></div>
      {state.title}
    </div>
  {/each}
</div>

<style lang="scss">
  .statuses-container {
    padding: .5rem;
    max-height: 100%;
    min-width: 10rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    user-select: none;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, .35));

    .state {
      padding: .5rem;
      border-radius: .5rem;
      cursor: pointer;

      &:hover { background-color: var(--theme-button-bg-hovered); }
      .color {
        margin-right: .75rem;
        width: 1rem;
        height: 1rem;
        border-radius: .25rem;
      }
    }
  }
</style>