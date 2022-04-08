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
  import { Class, FindOptions, Ref, SortingOrder } from '@anticrm/core'
  import { Kanban as KanbanUI } from '@anticrm/kanban'
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { Kanban, SpaceWithStates, State, Task } from '@anticrm/task'
  import task from '@anticrm/task'
  import KanbanDragDone from './KanbanDragDone.svelte'

  export let _class: Ref<Class<Task>>
  export let space: Ref<SpaceWithStates>
  // export let open: AnyComponent
  export let search: string
  export let options: FindOptions<Task> | undefined
  // export let config: string[]

  let kanban: Kanban
  let states: State[] = []

  const client = getClient()

  const kanbanQuery = createQuery()
  $: kanbanQuery.query(task.class.Kanban, { attachedTo: space }, result => { kanban = result[0] })

  const statesQuery = createQuery()
  $: if (kanban !== undefined) {
    statesQuery.query(task.class.State, { space: kanban.space }, result => { states = result }, {
      sort: {
        rank: SortingOrder.Ascending
      }
    })
  }

  $: clazz = client.getHierarchy().getClass(_class)
  $: presenterMixin = client.getHierarchy().as(clazz, task.mixin.KanbanCard)
  $: cardPresenter = getResource(presenterMixin.card)
  /* eslint-disable no-undef */
</script>

{#await cardPresenter then presenter}
  <KanbanUI {_class} {space} {search} {options} query={{ doneState: null }} states={states}
    fieldName={'state'} rankFieldName={'rank'}>
    <svelte:fragment slot='card' let:object let:dragged>
      <svelte:component this={presenter} {object} {dragged}/>
    </svelte:fragment>
    // eslint-disable-next-line no-undef
    <svelte:fragment slot='doneBar' let:onDone>
      <KanbanDragDone {kanban} on:done={(e) => {
        // eslint-disable-next-line no-undef
        onDone({ doneState: e.detail._id })
      }} />
    </svelte:fragment>
  </KanbanUI>
{/await}
