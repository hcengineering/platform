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
  import { TabList } from '@anticrm/ui'
  import type { TabItem } from '@anticrm/ui'
  import { TableBrowser } from '@anticrm/view-resources'
  import task from '../plugin'
  import StatesBar from './state/StatesBar.svelte'
  import type { Filter } from '@anticrm/view'

  export let _class: Ref<Class<Task>>
  export let space: Ref<SpaceWithStates>
  export let options: FindOptions<Task> | undefined
  export let config: string[]
  export let search: string
  export let filters: Filter[] = []

  let doneStatusesView: boolean = false
  let state: Ref<State> | undefined = undefined
  const selectedDoneStates: Set<Ref<DoneState>> = new Set<Ref<DoneState>>()
  $: resConfig = updateConfig(config)
  let query = {}
  let doneStates: DoneState[] = []
  let itemsDS: TabItem[] = []
  let selectedDS: string[] = []
  let withoutDone: boolean = false

  function updateConfig (config: string[]): string[] {
    if (state !== undefined) {
      return config.filter((p) => p !== '$lookup.state')
    }
    if (selectedDoneStates.size === 1) {
      return config.filter((p) => p !== '$lookup.doneState')
    }
    return config
  }

  const doneStateQuery = createQuery()
  doneStateQuery.query(
    task.class.DoneState,
    {
      space
    },
    (res) => {
      doneStates = res
      itemsDS = doneStates.map((s) => {
        return {
          id: s._id,
          label: s.title,
          color: s._class === task.class.WonState ? 'var(--done-color)' : 'var(--error-color)'
        }
      })
      itemsDS.unshift({ id: 'NoDoneState', labelIntl: task.string.NoDoneState })
    },
    {
      sort: {
        _class: SortingOrder.Descending,
        rank: SortingOrder.Descending
      }
    }
  )

  async function updateQuery (search: string, selectedDoneStates: Set<Ref<DoneState>>): Promise<void> {
    resConfig = updateConfig(config)
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
    if (selectedDoneStates.has(id)) selectedDoneStates.delete(id)
    else selectedDoneStates.add(id)
    if (selectedDS.length === 2 && selectedDS.includes('NoDoneState')) {
      selectedDS = selectedDS.filter((s) => s !== 'NoDoneState')
    }
    if (selectedDS.length === 0) {
      selectedDS = ['NoDoneState']
      withoutDone = true
    }
    updateQuery(search, selectedDoneStates)
  }

  function noDoneClick (): void {
    withoutDone = true
    selectedDS = ['NoDoneState']
    selectedDoneStates.clear()
    updateQuery(search, selectedDoneStates)
  }

  $: updateQuery(search, selectedDoneStates)
  const handleSelect = (result: any) => {
    if (result.type === 'select') {
      const res = result.detail
      if (res.id === 'AllStates') {
        doneStatusesView = false
        state = undefined
        withoutDone = false
        selectedDoneStates.clear()
        updateQuery(search, selectedDoneStates)
      } else if (res.id === 'DoneStates') {
        doneStatusesView = true
        state = undefined
        selectedDoneStates.clear()
        updateQuery(search, selectedDoneStates)
      }
    }
  }
  const handleDoneSelect = (result: any) => {
    if (result.type === 'select') {
      const res = result.detail
      if (res.id === 'NoDoneState') noDoneClick()
      else doneStateClick(res.id)
    }
  }
</script>

<div class="header">
  <TabList
    items={[
      { id: 'AllStates', labelIntl: task.string.AllStates },
      { id: 'DoneStates', labelIntl: task.string.DoneStates }
    ]}
    multiselect={false}
    on:select={handleSelect}
  />
  {#if doneStatusesView}
    <TabList items={itemsDS} bind:selected={selectedDS} multiselect on:select={handleDoneSelect} />
  {:else}
    <StatesBar bind:state {space} gap={'none'} on:change={() => updateQuery(search, selectedDoneStates)} />
  {/if}
</div>
<div class="statustableview-container">
  <TableBrowser {_class} bind:query config={resConfig} {options} bind:filters showNotification />
</div>

<style lang="scss">
  .statustableview-container {
    flex-grow: 1;
    min-height: 0;
    height: 100%;
  }

  .header {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    align-items: center;
    column-gap: 1rem;
    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    width: 100%;
    min-height: 3.25rem;
    min-width: 0;
    background-color: var(--board-bg-color);

    border-top: 1px solid var(--divider-color);
    // border-bottom: 1px solid var(--divider-color);
  }
</style>
