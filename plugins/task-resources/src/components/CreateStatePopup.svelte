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
  import { ProjectType, createState } from '@hcengineering/task'
  import { EditBox } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()
  export let status: Status | undefined = undefined
  export let _class: Ref<Class<Status>> | undefined = status?._class
  export let type: ProjectType
  export let ofAttribute: Ref<Attribute<Status>>
  export let category: Ref<StatusCategory> | undefined = status?.category
  export let value = status?.name ?? ''

  async function save () {
    if (type === undefined || _class === undefined) return
    if (status === undefined) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color: 9
      })

      const states = type.statuses.map((p) => $statusStore.byId.get(p._id)).filter((p) => p !== undefined) as Status[]
      const lastIndex = states.findLastIndex((p) => p.category === category)
      const statuses = [
        ...type.statuses.slice(0, lastIndex + 1),
        {
          _id,
          color: 9
        },
        ...type.statuses.slice(lastIndex + 1)
      ]
      await client.update(type, {
        statuses
      })
    } else if (status.name.trim() !== value.trim()) {
      const _id = await createState(client, _class, {
        ofAttribute,
        name: value.trim(),
        category,
        color: 9
      })
      const index = type.statuses.findIndex((p) => p._id === status?._id)
      const oldStatus = type.statuses[index]
      const statuses = [
        ...type.statuses.slice(0, index),
        {
          _id,
          color: oldStatus.color
        },
        ...type.statuses.slice(index + 1)
      ]
      const projects = await client.findAll(task.class.Project, { type: type._id })
      const docs = await client.findAll(task.class.Task, {
        status: status._id,
        space: { $in: projects.map((p) => p._id) }
      })
      const op = client.apply(_id)
      await op.update(type, {
        statuses
      })
      docs.map((p) => op.update(p, { status: _id }))
      await op.commit()
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
