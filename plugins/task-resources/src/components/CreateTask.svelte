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
  import type { AttachedData, Data, Doc, Ref, Space } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { Card, getClient, UserBox } from '@anticrm/presentation'
  import { Issue, State } from '@anticrm/task'
  import { EditBox, Grid, Status as StatusControl } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'

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
    state: '' as Ref<State>
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
      throw new Error('create application: state not found')
    }
  
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: task.class.Issue })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

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
      state: state._id
    }

    await client.addCollection(task.class.Issue, _space, parent?._id ?? task.global.Task, parent?._class ?? task.class.Issue, 'tasks', value, taskId)
  }
</script>

<!-- <DialogHeader {space} {object} {newValue} {resume} create={true} on:save={createCandidate}/> -->

<Card
  label={task.string.CreateTask}
  okAction={createTask}
  canSave={object.name.length > 0 && _space != null}
  spaceClass={task.class.Project}
  spaceLabel={task.string.ProjectName}
  spacePlaceholder={task.string.SelectProject}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={task.string.TaskName}
      bind:value={object.name}
      icon={task.icon.Task}
      placeholder="The boring task"
      maxWidth="39rem"
      focus
    />
    <UserBox
      _class={contact.class.Employee}
      title="Assignee *"
      caption="Assign this task"
      bind:value={assignee}
      allowDeselect
      titleDeselect={task.string.TaskUnAssign}
    />
  </Grid>
</Card>

<style lang="scss">
  .channels {
    margin-top: 1.25rem;
    span {
      margin-left: 0.5rem;
    }
  }

  .locations {
    span {
      margin-bottom: 0.125rem;
      font-weight: 500;
      font-size: 0.75rem;
      color: var(--theme-content-accent-color);
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      color: var(--theme-caption-color);
    }
  }

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--theme-card-divider);
  }

  .resume {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: 0.5rem;
    backdrop-filter: blur(10px);
    &.solid {
      border-style: solid;
    }
  }
  // .resume a {
  //   font-size: .75rem;
  //   color: var(--theme-content-dark-color);
  //   &:hover { color: var(--theme-content-color); }
  // }
</style>
