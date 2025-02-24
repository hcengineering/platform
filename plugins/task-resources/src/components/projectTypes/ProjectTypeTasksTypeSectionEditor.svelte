<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { SortingOrder } from '@hcengineering/core'
  import { ButtonIcon, IconAdd, Label, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import { createQuery } from '@hcengineering/presentation'
  import { ProjectType, ProjectTypeDescriptor, TaskType } from '@hcengineering/task'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'

  import IconLayers from '../icons/Layers.svelte'
  import TaskTypeIcon from '../taskTypes/TaskTypeIcon.svelte'
  import TaskTypeKindEditor from '../taskTypes/TaskTypeKindEditor.svelte'
  import CreateTaskType from '../taskTypes/CreateTaskType.svelte'
  import task from '../../plugin'

  export let type: ProjectType | undefined
  export let descriptor: ProjectTypeDescriptor | undefined
  export let disabled: boolean = true

  let taskTypes: TaskType[] = []
  const taskTypesQuery = createQuery()
  $: taskTypesQuery.query(
    task.class.TaskType,
    { _id: { $in: type?.tasks ?? [] } },
    (res) => {
      taskTypes = res
    },
    { sort: { _id: SortingOrder.Ascending } }
  )

  function handleTaskTypeSelected (id: string | undefined): void {
    const loc = getCurrentResolvedLocation()
    if (id !== undefined) {
      loc.path[5] = 'taskTypes'
      loc.path[6] = id
      loc.path.length = 7
    } else {
      loc.path.length = 5
    }

    clearSettingsStore()
    navigate(loc)
  }
</script>

{#if descriptor !== undefined}
  <div class="hulyTableAttr-header font-medium-12">
    <IconLayers size={'small'} />
    <span><Label label={task.string.TaskTypes} /></span>
    <ButtonIcon
      kind="primary"
      icon={IconAdd}
      size="small"
      dataId={'btnAdd'}
      {disabled}
      on:click={(ev) => {
        if (disabled) {
          return
        }
        $settingsStore = { id: 'createTaskType', component: CreateTaskType, props: { type, descriptor } }
      }}
    />
  </div>
  {#if taskTypes.length}
    <div class="hulyTableAttr-content task">
      {#each taskTypes as taskType}
        <button
          class="hulyTableAttr-content__row"
          on:click|stopPropagation={() => {
            handleTaskTypeSelected(taskType._id)
          }}
        >
          <div class="hulyTableAttr-content__row-icon-wrapper">
            <TaskTypeIcon value={taskType} size={'small'} />
          </div>
          {#if taskType.name}
            <div class="hulyTableAttr-content__row-label font-medium-14">
              {taskType.name}
            </div>
          {/if}
          <div class="hulyTableAttr-content__row-label grow dark font-regular-14">
            <TaskTypeKindEditor readonly kind={taskType.kind} />
          </div>
        </button>
      {/each}
    </div>
  {/if}
{/if}
