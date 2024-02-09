<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import { AttributeEditor, getClient } from '@hcengineering/presentation'
  import task, { ProjectType, TaskType, calculateStatuses, findStatusAttr } from '@hcengineering/task'
  import { Ref, Status } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import { Label, showPopup, ButtonIcon, ModernButton, IconSquareExpand, IconAdd, Icon } from '@hcengineering/ui'
  import { IconPicker, statusStore } from '@hcengineering/view-resources'
  import { ClassAttributes, settingsStore } from '@hcengineering/setting-resources'
  import { taskTypeStore } from '../..'
  import StatesProjectEditor from '../state/StatesProjectEditor.svelte'
  import TaskTypeKindEditor from '../taskTypes/TaskTypeKindEditor.svelte'
  import TaskTypeRefEditor from '../taskTypes/TaskTypeRefEditor.svelte'
  import TaskTypeIcon from './TaskTypeIcon.svelte'
  import plugin from '../../plugin'

  export let projectType: ProjectType
  export let taskType: TaskType
  export let taskTypeCounter: Map<Ref<TaskType>, number>
  export let taskTypes: TaskType[]

  const client = getClient()

  $: descriptor = client.getModel().findAllSync(task.class.TaskTypeDescriptor, { _id: taskType?.descriptor })

  $: states = taskType.statuses.map((p) => $statusStore.byId.get(p)).filter((p) => p !== undefined) as Status[]

  function selectIcon (el: MouseEvent): void {
    const icons: Asset[] = [descriptor[0].icon]
    showPopup(
      IconPicker,
      { icon: taskType?.icon, color: taskType?.color, icons, showColor: false },
      el.target as HTMLElement,
      async (result) => {
        if (result !== undefined && result !== null) {
          await client.update(taskType, { color: result.color, icon: result.icon })
        }
      }
    )
  }
  function handleAddStatus (): void {
    const icons: Asset[] = []
    const attr = findStatusAttr(getClient().getHierarchy(), taskType.ofClass)
    $settingsStore = {
      id: '#',
      component: task.component.CreateStatePopup,
      props: {
        status: undefined,
        taskType,
        _class: taskType.statusClass,
        category: task.statusCategory.Active,
        type: projectType,
        ofAttribute: attr._id,
        icon: undefined,
        color: 0,
        icons
      }
    }
  }
</script>

<div class="hulyComponent-content__column-group mt-4">
  <div class="hulyComponent-content__header mb-6">
    <div class="flex-row-center gap-1-5">
      <TaskTypeKindEditor
        kind={taskType.kind}
        on:change={(evt) => {
          void client.diffUpdate(taskType, { kind: evt.detail })
        }}
      />
      <ButtonIcon
        icon={TaskTypeIcon}
        iconProps={{ value: taskType }}
        size={'large'}
        kind={'secondary'}
        on:click={selectIcon}
      />
    </div>
    <ModernButton
      icon={IconSquareExpand}
      label={plugin.string.CountTasks}
      labelParams={{ count: taskTypeCounter.get(taskType._id) ?? 0 }}
      disabled={taskTypeCounter.get(taskType._id) === undefined}
      kind={'tertiary'}
      size={'medium'}
      hasMenu
    />
  </div>

  <AttributeEditor _class={task.class.TaskType} object={taskType} key="name" editKind={'modern-ghost-large'} />

  <div class="flex-row-center mt-4 ml-4 mr-4 gap-4">
    <div class="flex-no-shrink trans-title uppercase">
      <Label label={getEmbeddedLabel('Parent type restrictions')} />
    </div>
    {#if taskType.kind === 'subtask' || taskType.kind === 'both'}
      <TaskTypeRefEditor
        label={getEmbeddedLabel('Allowed parents')}
        value={taskType.allowedAsChildOf}
        types={taskTypes.filter((it) => it.kind === 'task' || it.kind === 'both')}
        onChange={(evt) => {
          void client.diffUpdate(taskType, { allowedAsChildOf: evt })
        }}
      />
    {/if}
  </div>
</div>

<div class="hulyTableAttr-container">
  <div class="hulyTableAttr-header font-medium-12">
    <Icon icon={task.icon.ManageTemplates} size={'small'} />
    <span><Label label={plugin.string.ProcessStates} /></span>
    <ButtonIcon kind={'primary'} icon={IconAdd} size={'small'} on:click={handleAddStatus} />
  </div>
  <StatesProjectEditor
    {taskType}
    type={projectType}
    {states}
    on:delete={async (evt) => {
      const index = taskType.statuses.findIndex((p) => p === evt.detail.state._id)
      taskType.statuses.splice(index, 1)
      await client.update(taskType, {
        statuses: taskType.statuses
      })
      await client.update(projectType, {
        statuses: calculateStatuses(projectType, $taskTypeStore, [
          { taskTypeId: taskType._id, statuses: taskType.statuses }
        ])
      })
    }}
    on:move={async (evt) => {
      const index = taskType.statuses.findIndex((p) => p === evt.detail.stateID)
      const state = taskType.statuses.splice(index, 1)[0]

      const statuses = [
        ...taskType.statuses.slice(0, evt.detail.position),
        state,
        ...taskType.statuses.slice(evt.detail.position)
      ]
      await client.update(taskType, {
        statuses
      })

      await client.update(projectType, {
        statuses: calculateStatuses(projectType, $taskTypeStore, [{ taskTypeId: taskType._id, statuses }])
      })
    }}
  />
</div>

<ClassAttributes ofClass={taskType.ofClass} _class={taskType.targetClass} showHierarchy />
