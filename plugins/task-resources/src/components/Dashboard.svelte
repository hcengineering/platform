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
  import core, { Class, DocumentQuery, IdMap, Ref, Status, Timestamp } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { Project, Task } from '@hcengineering/task'
  import task, { getStates } from '@hcengineering/task'
  import { BarDashboard, DashboardItem } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import CreateFilter from './CreateFilter.svelte'
  import { typeStore } from '..'

  export let _class: Ref<Class<Task>>
  export let space: Ref<Project>
  export let query: DocumentQuery<Task>

  let project: Project | undefined = undefined
  let states: Status[] = []
  const statesQuery = createQuery()
  $: updateStates(space)

  $: states = getStates(project, $typeStore, $statusStore.byId)

  function updateStates (space: Ref<Project>): void {
    statesQuery.query(task.class.Project, { _id: space }, (result) => {
      project = result[0]
    })
  }

  let modified: Timestamp | undefined = undefined
  let ids: Ref<Task>[] = []
  const txQuery = createQuery()

  function updateTxes (_class: Ref<Class<Task>>, space: Ref<Project>, modified: Timestamp | undefined): void {
    if (modified === undefined) {
      ids = []
      return
    }
    txQuery.query(
      core.class.TxCreateDoc,
      {
        objectSpace: space,
        objectClass: _class,
        modifiedOn: { $gte: modified }
      },
      (result) => {
        ids = result.map((p) => p.objectId) as Ref<Task>[]
      }
    )
  }

  let items: DashboardItem[] = []
  let tasks: Task[] = []

  $: updateTxes(_class, space, modified)

  const docQuery = createQuery()

  $: resultQuery = modified
    ? {
        _id: { $in: ids },
        ...query
      }
    : query

  $: group(tasks, $statusStore.byId)

  function group (tasks: Task[], statuses: IdMap<Status>): void {
    const template = new Map<Ref<Status>, DashboardItem>(
      states.map((p) => {
        return [
          p._id,
          {
            _id: p._id,
            label: p.name,
            values: [
              { color: 10, value: 0 },
              { color: 0, value: 0 },
              { color: 11, value: 0 }
            ]
          }
        ]
      })
    )
    for (const value of tasks) {
      const group = template.get(value.status)
      if (group === undefined) continue
      const status = statuses.get(value.status)
      if (status === undefined) continue
      if (status.category === task.statusCategory.Won) {
        group.values[1].value++
      } else if (status.category === task.statusCategory.Lost) {
        group.values[2].value++
      } else group.values[0].value++
      template.set(value.status, group)
    }
    items = Array.from(template.values())
  }

  function updateDocs (_class: Ref<Class<Task>>, states: Status[], query: DocumentQuery<Task>): void {
    if (states.length === 0) {
      return
    }
    docQuery.query(
      _class,
      query,
      (result) => {
        tasks = result
      },
      {
        projection: {
          status: 1
        }
      }
    )
  }

  $: updateDocs(_class, states, resultQuery)
</script>

<div class="min-h-4 max-h-4 h-4 flex-no-shrink" />
<CreateFilter bind:value={modified} />

<div class="mx-10 mt-4">
  <BarDashboard {items} />
</div>
