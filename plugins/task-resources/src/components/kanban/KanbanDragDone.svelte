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
  import { IdMap, Ref, Status } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { SpaceWithStates } from '@hcengineering/task'
  import task, { DoneState, LostState, WonState } from '@hcengineering/task'
  import { createEventDispatcher } from 'svelte'
  import Won from '../icons/Won.svelte'
  import Lost from '../icons/Lost.svelte'
  import { statusStore } from '@hcengineering/view-resources'

  export let space: Ref<SpaceWithStates>
  let wonStates: WonState[] = []
  let lostStates: LostState[] = []
  let _space: SpaceWithStates | undefined = undefined
  const dispatch = createEventDispatcher()

  const query = createQuery()
  query.query(task.class.SpaceWithStates, { _id: space }, (result) => {
    _space = result[0]
  })

  function getStates (space: SpaceWithStates | undefined, statusStore: IdMap<Status>): void {
    if (space === undefined) return
    const result: Status[] =
      (space.doneStates?.map((p) => statusStore.get(p))?.filter((p) => p !== undefined) as Status[]) ?? []
    wonStates = result.filter((x) => x._class === task.class.WonState)
    lostStates = result.filter((x) => x._class === task.class.LostState)
  }

  $: getStates(_space, $statusStore)

  let hoveredDoneState: Ref<DoneState> | undefined

  const onDone = (state: DoneState) => async () => {
    hoveredDoneState = undefined
    dispatch('done', state)
  }
</script>

<div class="done-panel overflow-y-auto whitespace-nowrap">
  {#each wonStates as wonState}
    <div
      class="flex-grow flex-center done-item"
      class:hovered={hoveredDoneState === wonState._id}
      on:dragenter={() => {
        hoveredDoneState = wonState._id
      }}
      on:dragleave={() => {
        if (hoveredDoneState === wonState._id) {
          hoveredDoneState = undefined
        }
      }}
      on:dragover|preventDefault={() => {}}
      on:drop={onDone(wonState)}
    >
      <div class="mr-2"><Won size={'small'} /></div>
      {wonState.name}
    </div>
  {/each}
  {#each lostStates as lostState}
    <div
      class="flex-grow flex-center done-item"
      class:hovered={hoveredDoneState === lostState._id}
      on:dragenter={() => {
        hoveredDoneState = lostState._id
      }}
      on:dragleave={() => {
        if (hoveredDoneState === lostState._id) {
          hoveredDoneState = undefined
        }
      }}
      on:dragover|preventDefault={() => {}}
      on:drop={onDone(lostState)}
    >
      <div class="mr-2"><Lost size={'small'} /></div>
      {lostState.name}
    </div>
  {/each}
</div>

<style lang="scss">
  .done-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;

    display: flex;
    align-items: center;
    justify-content: stretch;
    padding: 0.5rem 2.5rem;
    background-color: var(--theme-comp-header-color);
    border-top: 1px solid var(--theme-divider-color);
  }

  .done-item {
    height: 3rem;
    color: var(--theme-caption-color);
    border: 1px dashed transparent;
    border-radius: 0.75rem;
    padding: 0.5rem;

    &.hovered {
      background-color: var(--theme-bg-color);
      border-color: var(--theme-divider-color);
    }
  }
</style>
