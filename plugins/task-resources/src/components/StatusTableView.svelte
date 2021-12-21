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
  import { Class, DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import task, { DoneState, SpaceWithStates, State, Task } from '@anticrm/task'
  import { ScrollBox } from '@anticrm/ui'
  import Label from '@anticrm/ui/src/components/Label.svelte'
  import { Table } from '@anticrm/view-resources'
  import Lost from './icons/Lost.svelte'
  import Won from './icons/Won.svelte'
  import StatesBar from './state/StatesBar.svelte'

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
    (res) => (doneStates = res)
  )

  async function updateQuery (): Promise<void> {
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
    }
    query = result
  }

  function doneStateClick (id: Ref<DoneState>): void {
    if (selectedDoneStates.has(id)) {
      selectedDoneStates.delete(id)
    } else {
      selectedDoneStates.add(id)
    }
    selectedDoneStates = selectedDoneStates
    updateQuery()
  }

  $: updateQuery()
</script>

<div class="container">
  <div class="flex-between mb-4 mt-4 header">
    <div class="flex-row-center">
      <div
        class="button flex-center"
        class:active={!doneStatusesView}
        on:click={() => {
          doneStatusesView = false
          state = undefined
          selectedDoneStates.clear()
          updateQuery()
        }}
      >
        <Label label={'All statuses'} />
      </div>
      <div
        class="button flex-center ml-4"
        class:active={doneStatusesView}
        on:click={() => {
          doneStatusesView = true
          state = undefined
          selectedDoneStates.clear()
          updateQuery()
        }}
      >
        <Label label={'Done statuses'} />
      </div>
    </div>
    <div class="flex-row-center caption-color states">
      {#if doneStatusesView}
        {#each doneStates as state}
          <div
            class="doneState flex-row-center"
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
        <StatesBar bind:state {space} on:change={updateQuery} />
      {/if}
    </div>
  </div>
  <div class="container">
    <ScrollBox vertical stretch noShift>
      <Table {_class} {query} config={resConfig} {options} enableChecking />
    </ScrollBox>
  </div>
</div>

<style lang="scss">
  .container {
    flex-grow: 1;
    position: relative;
    padding-bottom: 2.5rem;
    height: 100%;
  }

  .header {
    margin-left: 2.5rem;
    margin-right: 1.75rem;

    .states {
      max-width: 75%;
    }
  }

  .button {
    cursor: pointer;
    height: 2.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    &:hover {
      background-color: var(--theme-button-bg-enabled);
      border: 1px solid var(--theme-button-border-enabled);
    }
    &.active {
      background-color: var(--theme-button-bg-enabled);
      color: var(--theme-caption-color);
      border: 1px solid var(--theme-button-border-enabled);
    }
  }
  .doneState {
    cursor: pointer;
    height: 2.5rem;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-button-border-enabled);

    &.won {
      background-color: #60b96e;
    }

    &.lost {
      background-color: #f06c63;
    }

    &.disable {
      background-color: var(--theme-button-bg-enabled);
    }
  }

  .doneState + .doneState {
    margin-left: 0.5rem;
  }
</style>
