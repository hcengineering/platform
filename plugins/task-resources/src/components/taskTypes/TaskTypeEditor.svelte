<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import { AttributeEditor, createQuery, getClient } from '@hcengineering/presentation'
  import task, { ProjectType, TaskType, calculateStatuses, findStatusAttr } from '@hcengineering/task'
  import { Ref, SortingOrder, Status } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import {
    Label,
    showPopup,
    ButtonIcon,
    ModernButton,
    IconSquareExpand,
    IconAdd,
    Icon,
    Scroller
  } from '@hcengineering/ui'
  import { IconPicker, statusStore } from '@hcengineering/view-resources'
  import { ClassAttributes, settingsStore } from '@hcengineering/setting-resources'
  import { taskTypeStore } from '../..'
  import StatesProjectEditor from '../state/StatesProjectEditor.svelte'
  import TaskTypeKindEditor from '../taskTypes/TaskTypeKindEditor.svelte'
  import TaskTypeRefEditor from '../taskTypes/TaskTypeRefEditor.svelte'
  import TaskTypeIcon from './TaskTypeIcon.svelte'
  import plugin from '../../plugin'

  export let spaceType: ProjectType
  export let objectId: Ref<TaskType>
  export let name: string | undefined
  export let icon: Asset | undefined
  export let color: number | undefined
  export let readonly: boolean = true

  const client = getClient()

  let taskTypes: TaskType[] = []
  const taskTypesQuery = createQuery()
  $: taskTypesQuery.query(
    task.class.TaskType,
    { _id: { $in: spaceType?.tasks ?? [] } },
    (res) => {
      taskTypes = res
    },
    { sort: { _id: SortingOrder.Ascending } }
  )

  $: taskType = taskTypes.find((tt) => tt._id === objectId)
  $: name = taskType?.name
  $: icon = taskType?.icon
  $: color = taskType?.color
  $: descriptor = client.getModel().findAllSync(task.class.TaskTypeDescriptor, { _id: taskType?.descriptor })
  $: states = (taskType?.statuses.map((p) => $statusStore.byId.get(p)).filter((p) => p !== undefined) as Status[]) ?? []

  let tasksCounter: number = 0
  const tasksCounterQuery = createQuery()
  $: if (taskType !== undefined) {
    tasksCounterQuery.query(
      task.class.Task,
      { kind: taskType._id },
      (res) => {
        tasksCounter = res.length
      },
      {
        projection: {
          total: true,
          limit: 1,
          _id: 1
        }
      }
    )
  }

  function selectIcon (el: MouseEvent): void {
    if (readonly) {
      return
    }
    const icons: Asset[] = [descriptor[0].icon]

    showPopup(
      IconPicker,
      { icon: taskType?.icon, color: taskType?.color, icons, showColor: false },
      el.target as HTMLElement,
      async (result) => {
        if (result !== undefined && result !== null && taskType !== undefined) {
          await client.update(taskType, { color: result.color, icon: result.icon })
        }
      }
    )
  }

  function handleAddStatus (): void {
    if (taskType === undefined || readonly) {
      return
    }

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
        type: spaceType,
        ofAttribute: attr._id,
        icon: undefined,
        color: 0,
        icons,
        readonly
      }
    }
  }
</script>

{#if taskType !== undefined}
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content gap">
          <div class="hulyComponent-content__column-group mt-4">
            <div class="hulyComponent-content__header mb-6">
              <div class="flex-row-center gap-1-5">
                <TaskTypeKindEditor
                  kind={taskType.kind}
                  on:change={(evt) => {
                    if (taskType === undefined) {
                      return
                    }
                    void client.diffUpdate(taskType, { kind: evt.detail })
                  }}
                  {readonly}
                />
                {#if !readonly}
                  <ButtonIcon
                    icon={TaskTypeIcon}
                    iconProps={{ value: taskType }}
                    size={'large'}
                    kind={'secondary'}
                    dataId={'btnSelectIcon'}
                    disabled={readonly}
                    on:click={selectIcon}
                  />
                {/if}
              </div>
              <ModernButton
                icon={IconSquareExpand}
                label={plugin.string.CountTasks}
                labelParams={{ count: tasksCounter }}
                disabled={tasksCounter === 0}
                kind={'tertiary'}
                size={'medium'}
                hasMenu
              />
            </div>

            <div class="name" class:editable={!readonly}>
              <AttributeEditor
                _class={task.class.TaskType}
                object={taskType}
                key="name"
                editKind={'modern-ghost-large'}
                editable={!readonly}
              />
            </div>

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
                    if (taskType === undefined) {
                      return
                    }
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
              <ButtonIcon
                kind={'primary'}
                icon={IconAdd}
                size={'small'}
                on:click={handleAddStatus}
                disabled={readonly}
              />
            </div>
            <StatesProjectEditor
              {taskType}
              type={spaceType}
              {states}
              {readonly}
              on:delete={async (evt) => {
                if (taskType === undefined) {
                  return
                }
                const index = taskType.statuses.findIndex((p) => p === evt.detail.state._id)
                taskType.statuses.splice(index, 1)
                await client.update(taskType, {
                  statuses: taskType.statuses
                })
                await client.update(spaceType, {
                  statuses: calculateStatuses(spaceType, $taskTypeStore, [
                    { taskTypeId: taskType._id, statuses: taskType.statuses }
                  ])
                })
              }}
              on:move={async (evt) => {
                if (taskType === undefined || readonly) {
                  return
                }
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

                await client.update(spaceType, {
                  statuses: calculateStatuses(spaceType, $taskTypeStore, [{ taskTypeId: taskType._id, statuses }])
                })
              }}
            />
          </div>

          <ClassAttributes ofClass={taskType.ofClass} _class={taskType.targetClass} showHierarchy disabled={readonly} />
        </div>
      </Scroller>
    </div>
  </div>
{/if}

<style lang="scss">
  .name {
    width: 100%;
    font-weight: 500;
    margin-left: 1rem;
    display: flex;
    align-items: center;
    font-size: 1.5rem;

    &.editable {
      margin-left: 0;
    }
  }
</style>
