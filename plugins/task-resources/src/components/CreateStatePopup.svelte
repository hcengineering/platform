<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Attribute, Class, Ref, Status, StatusCategory } from '@hcengineering/core'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { ProjectType, TaskType, calculateStatuses, createState } from '@hcengineering/task'
  import { EditBox, getColorNumberByText } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'
  import { taskTypeStore } from '..'

  const dispatch = createEventDispatcher()
  const client = getClient()
  export let status: Status | undefined = undefined
  export let _class: Ref<Class<Status>> | undefined = status?._class
  export let taskType: TaskType
  export let type: ProjectType
  export let ofAttribute: Ref<Attribute<Status>>
  export let category: Ref<StatusCategory> | undefined = status?.category
  export let value = status?.name ?? ''

  async function save (): Promise<void> {
    if (taskType === undefined || _class === undefined) return
    if (status === undefined) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color: 9
      })

      const states = taskType.statuses.map((p) => $statusStore.byId.get(p)).filter((p) => p !== undefined) as Status[]
      const lastIndex = states.findLastIndex((p) => p.category === category)
      const statuses = [...taskType.statuses.slice(0, lastIndex + 1), _id, ...taskType.statuses.slice(lastIndex + 1)]

      await client.update(type, {
        statuses: calculateStatuses(type, $taskTypeStore, [{ taskTypeId: taskType._id, statuses }])
      })
      await client.update(taskType, {
        statuses
      })
    } else if (status.name.trim() !== value.trim()) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color: getColorNumberByText(value.trim())
      })
      const index = taskType.statuses.indexOf(status._id)
      const statuses = [...taskType.statuses.slice(0, index), _id, ...taskType.statuses.slice(index + 1)]
      await client.update(type, {
        statuses: calculateStatuses(type, $taskTypeStore, [{ taskTypeId: taskType._id, statuses }])
      })
      await client.update(taskType, {
        statuses
      })
      const projects = await client.findAll(task.class.Project, { type: type._id })
      while (true) {
        const docs = await client.findAll(
          task.class.Task,
          {
            status: status._id,
            space: { $in: projects.map((p) => p._id) }
          },
          { limit: 1000 }
        )
        if (docs.length === 0) {
          break
        }

        const op = client.apply(_id)
        docs.map((p) => op.update(p, { status: _id }))
        await op.commit()
      }
    }
    dispatch('close')
  }
</script>

<Card
  label={task.string.StatusPopupTitle}
  okAction={save}
  canSave
  okLabel={presentation.string.Save}
  on:changeContent
  onCancel={() => dispatch('close')}
>
  <EditBox focusIndex={1} bind:value placeholder={task.string.StatusName} kind={'large-style'} autoFocus fullSize />
</Card>
