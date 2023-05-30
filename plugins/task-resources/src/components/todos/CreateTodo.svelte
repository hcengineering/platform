<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Class, Ref, Space } from '@hcengineering/core'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import type { Task, TodoItem } from '@hcengineering/task'
  import task, { calcRank } from '@hcengineering/task'
  import { DatePicker, EditBox, Grid } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let objectId: Ref<Task>
  export let _class: Ref<Class<Task>>
  export let space: Ref<Space>

  let name: string
  const done = false
  let dueTo: number | null = null
  let latestItem: TodoItem | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const todoItemsQuery = createQuery()

  export function canClose (): boolean {
    return objectId === undefined
  }

  async function createTodo () {
    await client.addCollection(task.class.TodoItem, space, objectId, _class, 'todoItems', {
      name,
      assignee: null,
      done,
      dueTo: dueTo ?? null,
      rank: calcRank(latestItem)
    })
  }

  $: todoItemsQuery.query(
    task.class.TodoItem,
    { attachedTo: objectId },
    (result) => {
      latestItem = undefined
      if (result && result.length > 0) {
        latestItem = result[result.length - 1]
      }
    },
    {
      sort: {
        rank: 1
      }
    }
  )
</script>

<Card
  label={plugin.string.TodoCreate}
  okAction={createTodo}
  canSave={name?.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  okLabel={plugin.string.TodoSave}
  on:changeContent
>
  <Grid column={1} rowGap={1.75}>
    <EditBox
      label={plugin.string.TodoDescription}
      bind:value={name}
      icon={task.icon.Task}
      placeholder={plugin.string.TodoDescriptionPlaceholder}
      autoFocus
    />
    <DatePicker title={plugin.string.TodoDueDate} bind:value={dueTo} />
  </Grid>
</Card>
