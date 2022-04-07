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
  import { Card } from '@anticrm/board'
  import { Class, FindOptions, Ref, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import type { Kanban, SpaceWithStates, State } from '@anticrm/task'
  import task from '@anticrm/task'
  import { Kanban as KanbanUI } from '@anticrm/task-resources'
  
  export let _class: Ref<Class<Card>>
  export let space: Ref<SpaceWithStates>
  export let search: string
  export let options: FindOptions<Card> | undefined

  let kanban: Kanban
  let states: State[] = []

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
</script>

<KanbanUI {_class} {space} {search} {options} stateQuery={{ doneState: null }} states={states}>
  // eslint-disable-next-line no-undef  
</KanbanUI>
