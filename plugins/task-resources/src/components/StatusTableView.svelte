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
  import { Class, DocumentQuery, FindOptions, Ref, Status } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Project, Task, getStates } from '@hcengineering/task'
  import type { TabItem } from '@hcengineering/ui'
  import { ScrollerBar, TabList, Switcher } from '@hcengineering/ui'
  import { TableBrowser, statusStore } from '@hcengineering/view-resources'
  import { typeStore } from '..'
  import task from '../plugin'
  import Lost from './icons/Lost.svelte'
  import Won from './icons/Won.svelte'
  import StatesBar from './state/StatesBar.svelte'

  export let _class: Ref<Class<Task>>
  export let space: Ref<Project>
  export let query: DocumentQuery<Task>
  export let options: FindOptions<Task> | undefined
  export let config: string[]

  let doneStatusesView: boolean = false
  let state: Ref<Status> | undefined = undefined
  let _space: Project | undefined = undefined
  const selectedDoneStates: Set<Ref<Status>> = new Set<Ref<Status>>()
  $: resConfig = updateConfig(config)
  $: doneStates = getStates(_space, $typeStore, $statusStore.byId).filter(
    (p) => p.category && [task.statusCategory.Won, task.statusCategory.Lost].includes(p.category)
  )
  $: itemsDS = getItems(doneStates)
  let selectedDS: string[] = []
  let withoutDone: boolean = false
  let resultQuery: DocumentQuery<Task>
  let divScroll: HTMLElement

  function getItems (doneStates: Status[]): TabItem[] {
    const itemsDS: TabItem[] = doneStates.map((s) => {
      return {
        id: s._id,
        label: s.name,
        icon: s.category === task.statusCategory.Won ? Won : Lost,
        color: s.category === task.statusCategory.Won ? 'var(--theme-won-color)' : 'var(--theme-lost-color)'
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
    task.class.Project,
    {
      _id: space
    },
    (res) => {
      _space = res[0]
    }
  )

  const client = getClient()

  function updateQuery (query: DocumentQuery<Task>, selectedDoneStates: Set<Ref<Status>>): void {
    resConfig = updateConfig(config)
    const result = client.getHierarchy().clone(query)
    if (state) {
      result.status = state
    } else {
      if (selectedDoneStates.size > 0) {
        result.status = {
          $in: Array.from(selectedDoneStates)
        }
      } else if (withoutDone) {
        result.status = {
          $nin: doneStates.map((p) => p._id)
        }
      }
    }
    resultQuery = result
  }

  function doneStateClick (id: Ref<Status>): void {
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

<div class="hulyHeader-container clearPadding justify-between flex-gap-4">
  <Switcher
    name={'status-table-states'}
    kind={'subtle'}
    selected={doneStatusesView ? 'DoneStates' : 'AllStates'}
    items={[
      { id: 'AllStates', labelIntl: task.string.AllStates },
      { id: 'DoneStates', labelIntl: task.string.DoneStates }
    ]}
    on:select={handleSelect}
  />
  {#if doneStatusesView}
    <ScrollerBar gap={'none'} bind:scroller={divScroll}>
      <TabList items={itemsDS} bind:selected={selectedDS} multiselect on:select={handleDoneSelect} />
    </ScrollerBar>
  {:else}
    <StatesBar
      bind:state
      {space}
      gap={'none'}
      on:change={() => {
        updateQuery(query, selectedDoneStates)
      }}
    />
  {/if}
</div>
<TableBrowser {_class} bind:query={resultQuery} config={resConfig} {options} showNotification />
