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
  import contact, { Employee } from '@anticrm/contact'
  import { AttachedData, Data, Doc, Ref, SortingOrder, Space } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { Card, getClient, UserBox } from '@anticrm/presentation'
  import task, { calcRank, Issue, State } from '@anticrm/task'
  import { EditBox, Grid, Status as StatusControl } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'

  export let space: Ref<Space>
  export let parent: Pick<Doc, '_id' | '_class'> | undefined

  let _space = space

  $: _space = space
  const status: Status = OK

  let assignee: Ref<Employee> | null = null

  const object: Data<Issue> = {
    name: '',
    description: '',
    assignee: null,
    number: 0,
    attachedTo: task.global.Task,
    attachedToClass: task.class.Issue,
    collection: 'tasks',
    state: '' as Ref<State>,
    doneState: null,
    rank: ''
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const taskId: Ref<Issue> = generateId()

  export function canClose (): boolean {
    return object.name !== ''
  }

  async function createTask () {
    const state = await client.findOne(task.class.State, { space: _space })
    if (state === undefined) {
      throw new Error('create task: state not found')
    }
  
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: task.class.Issue })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const lastOne = await client.findOne(
      task.class.Task,
      { state: state._id },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.updateDoc(
      task.class.Sequence,
      task.space.Sequence,
      sequence._id,
      {
        $inc: { sequence: 1 }
      },
      true
    )

    const value: AttachedData<Issue> = {
      name: object.name,
      description: object.description,
      assignee,
      number: (incResult as any).object.sequence,
      doneState: null,
      state: state._id,
      rank: calcRank(lastOne, undefined)
    }

    await client.addCollection(task.class.Issue, _space, parent?._id ?? task.global.Task, parent?._class ?? task.class.Issue, 'tasks', value, taskId)
  }
</script>

<Card
  label={plugin.string.CreateTask}
  okAction={createTask}
  canSave={object.name.length > 0 && _space != null}
  spaceClass={task.class.Project}
  spaceLabel={plugin.string.ProjectName}
  spacePlaceholder={plugin.string.SelectProject}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={plugin.string.TaskName}
      bind:value={object.name}
      icon={task.icon.Task}
      placeholder={plugin.string.TaskNamePlaceholder}
      maxWidth={'16rem'}
      focus
    />
    <UserBox
      _class={contact.class.Employee}
      title={plugin.string.TaskAssignee}
      caption={plugin.string.AssignThisTask}
      bind:value={assignee}
      allowDeselect
      titleDeselect={plugin.string.TaskUnAssign}
    />
  </Grid>
</Card>
