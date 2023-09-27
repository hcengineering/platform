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
  import { Class, DocumentQuery, FindOptions, IdMap, Ref, Status } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { DoneState, SpaceWithStates, State, Task } from '@hcengineering/task'
  import type { TabItem } from '@hcengineering/ui'
  import { TabList, ScrollerBar } from '@hcengineering/ui'
  import { TableBrowser, statusStore } from '@hcengineering/view-resources'
  import task from '../plugin'
  import StatesBar from './state/StatesBar.svelte'
  import Lost from './icons/Lost.svelte'
  import Won from './icons/Won.svelte'

  export let _class: Ref<Class<Task>>
  export let space: Ref<SpaceWithStates>
  export let query: DocumentQuery<Task>
  export let options: FindOptions<Task> | undefined
  export let config: string[]

  let doneStatusesView: boolean = false
  let state: Ref<State> | undefined = undefined
  let _space: SpaceWithStates | undefined = undefined
  const selectedDoneStates: Set<Ref<DoneState>> = new Set<Ref<DoneState>>()
  $: resConfig = updateConfig(config)
  $: doneStates = getDoneStates(_space, $statusStore)
  $: itemsDS = getItems(doneStates)
  let selectedDS: string[] = []
  let withoutDone: boolean = false
  let resultQuery: DocumentQuery<Task>
  let divScroll: HTMLElement

  function getItems (doneStates: DoneState[]): TabItem[] {
    const itemsDS: TabItem[] = doneStates.map((s) => {
      return {
        id: s._id,
        label: s.name,
        icon: s._class === task.class.WonState ? Won : Lost,
        color: s._class === task.class.WonState ? 'var(--theme-won-color)' : 'var(--theme-lost-color)'
      }
    })
    itemsDS.unshift({ id: 'NoDoneState', labelIntl: task.string.NoDoneState })
    return itemsDS
  }

  function updateConfig (config: string[]): string[] {
    if (state !== undefined) {
      return config.filter((p) => p !== 'status')
    }
    if (selectedDoneStates.size === 1) {
      return config.filter((p) => p !== 'doneState')
    }
    return config
  }

  const spaceQuery = createQuery()

  $: spaceQuery.query(
    task.class.SpaceWithStates,
    {
      _id: space
    },
    (res) => {
      _space = res[0]
    }
  )

  function getDoneStates (space: SpaceWithStates | undefined, statusStore: IdMap<Status>): DoneState[] {
    if (space === undefined) {
      return []
    }
    const doneStates = space.doneStates
      ? space.doneStates.map((x) => statusStore.get(x) as DoneState).filter((p) => p !== undefined)
      : []
    return doneStates
  }

  const client = getClient()

  async function updateQuery (query: DocumentQuery<Task>, selectedDoneStates: Set<Ref<DoneState>>): Promise<void> {
    resConfig = updateConfig(config)
    const result = client.getHierarchy().clone(query)
    if (state) {
      result.status = state
    }
    if (selectedDoneStates.size > 0) {
      result.doneState = {
        $in: Array.from(selectedDoneStates)
      }
    } else if (withoutDone) {
      result.doneState = null
    }
    resultQuery = result
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
    updateQuery(query, selectedDoneStates)
  }

  function noDoneClick (): void {
    withoutDone = true
    selectedDS = ['NoDoneState']
    selectedDoneStates.clear()
    updateQuery(query, selectedDoneStates)
  }

  $: updateQuery(query, selectedDoneStates)
  const handleSelect = (result: any) => {
    if (result.type === 'select') {
      const res = result.detail
      if (res.id === 'AllStates') {
        doneStatusesView = false
        state = undefined
        withoutDone = false
        selectedDoneStates.clear()
        updateQuery(query, selectedDoneStates)
      } else if (res.id === 'DoneStates') {
        doneStatusesView = true
        state = undefined
        selectedDoneStates.clear()
        updateQuery(query, selectedDoneStates)
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

<div class="ac-header full divide">
  <TabList
    items={[
      { id: 'AllStates', labelIntl: task.string.AllStates },
      { id: 'DoneStates', labelIntl: task.string.DoneStates }
    ]}
    multiselect={false}
    on:select={handleSelect}
  />
  {#if doneStatusesView}
    <ScrollerBar gap={'none'} bind:scroller={divScroll}>
      <TabList items={itemsDS} bind:selected={selectedDS} multiselect on:select={handleDoneSelect} />
    </ScrollerBar>
  {:else}
    <StatesBar bind:state {space} gap={'none'} on:change={() => updateQuery(query, selectedDoneStates)} />
  {/if}
</div>
<div class="statustableview-container">
  <TableBrowser {_class} bind:query={resultQuery} config={resConfig} {options} showNotification />
</div>

<style lang="scss">
  .statustableview-container {
    flex-grow: 1;
    min-height: 0;
    height: 100%;
  }
</style>
