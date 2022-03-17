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
  import type { Class, Ref, Space } from '@anticrm/core'
  import { Card, getClient } from '@anticrm/presentation'
  import type { Task } from '@anticrm/task'
  import task from '@anticrm/task'
  import { DatePicker, EditBox, Grid } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let objectId: Ref<Task>
  export let _class: Ref<Class<Task>>
  export let space: Ref<Space>

  let name: string
  const done = false
  let dueTo: Date

  $: _space = space

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return objectId === undefined
  }

  async function createTodo () {
    await client.addCollection(
      task.class.TodoItem,
      space,
      objectId,
      _class,
      'todos',
      {
        name,
        done,
        dueTo: dueTo?.getTime() ?? undefined
      }
    )
  }
</script>

<Card
  label={plugin.string.TodoCreate}
  okAction={createTodo}
  canSave={name?.length > 0}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
  okLabel={plugin.string.TodoSave}
>
  <Grid column={1} rowGap={1.75}>
    <EditBox
      label={plugin.string.TodoDescription}
      bind:value={name}
      icon={task.icon.Task}
      placeholder={plugin.string.TodoDescriptionPlaceholder}
      maxWidth={'16rem'}
      focus
    />
    <DatePicker title={plugin.string.TodoDueDate} bind:value={dueTo} />
  </Grid>
</Card>
