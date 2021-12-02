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
  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'
  import type { Data, Ref, Space } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { Card, getClient, UserBox } from '@anticrm/presentation'
  import { Task } from '@anticrm/task'
  import { EditBox, Grid, Status as StatusControl } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'

  export let space: Ref<Space>

  let _space = space
  const status: Status = OK

  let assignee: Ref<EmployeeAccount> // | null = null

  const object: Data<Task> = {
    name: '',
    description: '',
    assignee: undefined as unknown as Ref<Employee>,
    number: 0
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const taskId = generateId()

  export function canClose (): boolean {
    return object.name !== ''
  }

  async function createTask () {
    const sequence = await client.findOne(view.class.Sequence, { attachedTo: task.class.Task })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.updateDoc(
      view.class.Sequence,
      view.space.Sequence,
      sequence._id,
      {
        $inc: { sequence: 1 }
      },
      true
    )

    const value: Data<Task> = {
      name: object.name,
      description: object.description,
      assignee,
      number: (incResult as any).object.sequence
    }

    await client.createDoc(task.class.Task, _space, value, taskId)
    dispatch('close')
  }
</script>

<!-- <DialogHeader {space} {object} {newValue} {resume} create={true} on:save={createCandidate}/> -->

<Card
  label={task.string.CreateTask}
  okAction={createTask}
  canSave={object.name.length > 0 && assignee !== undefined}
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
      _class={contact.class.EmployeeAccount}
      title="Assignee *"
      caption="Assign this task"
      bind:value={assignee}
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
