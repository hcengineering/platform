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
  import { Class, DocumentQuery, FindOptions, Ref, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { DoneState, SpaceWithStates, State, Task } from '@anticrm/task'
  import { ScrollBox } from '@anticrm/ui'
  import Label from '@anticrm/ui/src/components/Label.svelte'
  import { TableBrowser } from '@anticrm/view-resources'
  import Lost from './icons/Lost.svelte'
  import Won from './icons/Won.svelte'
  import StatesBar from './state/StatesBar.svelte'
  import task from '../plugin'

  export let _class: Ref<Class<Task>>
  export let space: Ref<SpaceWithStates>
  export let options: FindOptions<Task> | undefined
  export let config: string[]
  export let search: string

  let doneStatusesView: boolean = false
  let state: Ref<State> | undefined = undefined
  let selectedDoneStates: Set<Ref<DoneState>> = new Set<Ref<DoneState>>()
  let resConfig = config
  let query = {}
  let doneStates: DoneState[] = []
  let withoutDone: boolean = false

  function updateConfig (): void {
    if (state !== undefined) {
      resConfig = config.filter((p) => p !== '$lookup.state')
      return
    }
    if (selectedDoneStates.size === 1) {
      resConfig = config.filter((p) => p !== '$lookup.doneState')
      return
    }
    resConfig = config
  }

  const doneStateQuery = createQuery()
  doneStateQuery.query(
    task.class.DoneState,
    {
      space
    },
    (res) => (doneStates = res),
    {
      sort: {
        _class: SortingOrder.Descending,
        rank: SortingOrder.Descending
      }
    }
  )

  async function updateQuery (search: string, selectedDoneStates: Set<Ref<DoneState>>): Promise<void> {
    updateConfig()
    const result = {} as DocumentQuery<Task>
    if (search !== '') {
      result.$search = search
    }
    result.space = space
    if (state) {
      result.state = state
    }
    if (selectedDoneStates.size > 0) {
      result.doneState = {
        $in: Array.from(selectedDoneStates)
      }
    } else if (withoutDone) {
      result.doneState = null
    }
    query = result
  }

  function doneStateClick (id: Ref<DoneState>): void {
    withoutDone = false
    if (selectedDoneStates.has(id)) {
      selectedDoneStates.delete(id)
    } else {
      selectedDoneStates.add(id)
    }
    selectedDoneStates = selectedDoneStates
    updateQuery(search, selectedDoneStates)
  }

  function noDoneClick (): void {
    withoutDone = !withoutDone
    selectedDoneStates.clear()
    selectedDoneStates = selectedDoneStates
    updateQuery(search, selectedDoneStates)
  }

  $: updateQuery(search, selectedDoneStates)
</script>

<div class="flex-between mb-4 header">
  <div class="flex-row-center buttons">
    <div
      class="button flex-center"
      class:active={!doneStatusesView}
      on:click={() => {
        doneStatusesView = false
        state = undefined
        withoutDone = false
        selectedDoneStates.clear()
        updateQuery(search, selectedDoneStates)
      }}
    >
      <Label label={task.string.AllStates} />
    </div>
    <div
      class="button flex-center ml-3"
      class:active={doneStatusesView}
      on:click={() => {
        doneStatusesView = true
        state = undefined
        selectedDoneStates.clear()
        updateQuery(search, selectedDoneStates)
      }}
    >
      <Label label={task.string.DoneStates} />
    </div>
  </div>
  <div
    class="flex-row-center caption-color states"
    class:antiStatesBar={doneStatusesView}
    class:justify-end={doneStatusesView}
  >
    {#if doneStatusesView}
      <div
        class="doneState withoutDone flex-center whitespace-nowrap"
        class:disable={!withoutDone}
        on:click={() => {
          noDoneClick()
        }}
      >
        <Label label={task.string.NoDoneState} />
      </div>
      {#each doneStates as state}
        <div
          class="doneState flex-center whitespace-nowrap"
          class:won={state._class === task.class.WonState}
          class:lost={state._class === task.class.LostState}
          class:disable={!selectedDoneStates.has(state._id)}
          on:click={() => {
            doneStateClick(state._id)
          }}
        >
          {#if state._class === task.class.WonState}
            <Won size="medium" />
          {:else}
            <Lost size="medium" />
          {/if}
          <span class="ml-2">
            {state.title}
          </span>
        </div>
      {/each}
    {:else}
      <StatesBar bind:state {space} on:change={() => updateQuery(search, selectedDoneStates)} />
    {/if}
  </div>
</div>
<div class="statustableview-container">
  <ScrollBox vertical stretch noShift>
    <TableBrowser {_class} {query} config={resConfig} {options} showNotification />
  </ScrollBox>
</div>

<style lang="scss">
  .statustableview-container {
    flex-grow: 1;
    margin-bottom: 0.75rem;
    min-height: 0;
    height: 100%;
  }

  .header {
    margin-left: 2.5rem;
    margin-right: 1.75rem;
    .buttons {
      padding: 0.125rem 0;
    }
    .states {
      max-width: 75%;
    }
  }

  .button {
    height: 2.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    cursor: pointer;

    &:hover {
      background-color: var(--theme-button-bg-enabled);
      border-color: var(--theme-button-border-enabled);
    }
    &.active {
      background-color: var(--theme-button-bg-enabled);
      color: var(--theme-caption-color);
      border-color: var(--theme-button-border-enabled);
    }
  }

  .doneState {
    padding: 0.5rem 0.75rem;
    height: 2.5rem;
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.5rem;
    cursor: pointer;

    &.won {
      background-color: #60b96e;
    }
    &.lost {
      background-color: #f06c63;
    }
    &.withoutDone {
      background-color: var(--theme-bg-focused-color);
    }
    &.disable {
      background-color: var(--theme-button-bg-enabled);
    }
  }
  .doneState + .doneState {
    margin-left: 0.75rem;
  }
</style>
