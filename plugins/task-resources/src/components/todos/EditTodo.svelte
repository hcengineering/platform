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
  import type { DocumentUpdate, Ref, Timestamp } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import type { TodoItem } from '@hcengineering/task'
  import task from '@hcengineering/task'
  import { DatePicker, EditBox, Grid } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let item: TodoItem

  let name: string = ''
  let dueTo: number | null | undefined = null

  let _itemId: Ref<TodoItem>

  $: if (_itemId !== item._id) {
    _itemId = item._id
    name = item.name
    if (item.dueTo != null) {
      dueTo = item.dueTo
    } else {
      dueTo = null
    }
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return true
  }

  async function editTodo () {
    const ops: DocumentUpdate<TodoItem> = {}
    if (item.name !== name) {
      ops.name = name
    }
    if (item.dueTo !== dueTo) {
      ops.dueTo = (dueTo ?? null) as unknown as Timestamp
    }

    if (Object.keys(ops).length === 0) {
      return
    }

    await client.update(item, ops)
  }
</script>

<Card
  label={plugin.string.TodoEdit}
  okAction={editTodo}
  canSave={name.length > 0}
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
