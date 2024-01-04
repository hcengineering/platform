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
  import core, { Class, ClassifierKind, Data, Ref, RefTo, Status, generateId, toIdMap } from '@hcengineering/core'
  import { Resource, getEmbeddedLabel, getResource } from '@hcengineering/platform'
  import presentation, { Card, getClient, hasResource } from '@hcengineering/presentation'
  import {
    ProjectType,
    ProjectTypeDescriptor,
    Task,
    TaskType,
    TaskTypeDescriptor,
    createState,
    findStatusAttr
  } from '@hcengineering/task'
  import { DropdownIntlItem, DropdownLabelsIntl, EditBox, getColorNumberByText } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'
  import TaskTypeKindEditor from './TaskTypeKindEditor.svelte'

  const dispatch = createEventDispatcher()
  const client = getClient()
  export let type: ProjectType
  export let descriptor: ProjectTypeDescriptor
  export let taskType: TaskType | undefined

  function defaultTaskType (type: ProjectType): Data<TaskType> {
    return {
      kind: 'task',
      name: '',
      parent: type._id,
      descriptor: '' as Ref<TaskTypeDescriptor>,
      ofClass: task.class.Task,
      targetClass: task.class.Task,
      statusCategories: [
        task.statusCategory.UnStarted,
        task.statusCategory.Active,
        task.statusCategory.Won,
        task.statusCategory.Lost
      ],
      statusClass: core.class.Status,
      statuses: [],
      allowedAsChildOf: []
    }
  }

  const taskTypeDescriptors = client
    .getModel()
    .findAllSync(task.class.TaskTypeDescriptor, { allowCreate: true })
    .filter((p) => hasResource(p._id as any as Resource<any>))

  let { kind, name, targetClass, statusCategories, statuses, allowedAsChildOf } =
    taskType !== undefined ? { ...taskType } : { ...defaultTaskType(type) }

  function findStatusClass (_class: Ref<Class<Task>>): Ref<Class<Status>> | undefined {
    const h = getClient().getHierarchy()
    const attrs = h.getAllAttributes(_class)
    for (const it of attrs.values()) {
      if (it.type._class === core.class.RefTo && h.isDerived((it.type as RefTo<any>).to, core.class.Status)) {
        return (it.type as RefTo<any>).to
      }
    }
  }

  let taskTypeDescriptor: Ref<TaskTypeDescriptor> = taskTypeDescriptors[0]._id

  async function save (): Promise<void> {
    if (type === undefined) return

    const descr = taskTypeDescriptors.find((it) => it._id === taskTypeDescriptor)
    if (descr === undefined) return

    const ofClass = descr.baseClass
    const _taskType = {
      kind,
      name,
      ofClass,
      descriptor: taskTypeDescriptor,
      targetClass,
      statusCategories,
      statuses,
      allowedAsChildOf,
      statusClass: findStatusClass(ofClass) ?? core.class.Status,
      parent: type._id,
      icon: descr.icon
    }

    if (taskType === undefined && descr.statusCategoriesFunc !== undefined) {
      const f = await getResource(descr.statusCategoriesFunc)
      if (f !== undefined) {
        _taskType.statusCategories = f(type)
      }
    }

    const taskTypeId: Ref<TaskType> = taskType?._id ?? generateId()
    const categories = toIdMap(
      await client.findAll(core.class.StatusCategory, { _id: { $in: _taskType.statusCategories } })
    )
    const statusAttr =
      findStatusAttr(client.getHierarchy(), ofClass) ?? client.getHierarchy().getAttribute(task.class.Task, 'status')
    for (const st of _taskType.statusCategories) {
      const std = categories.get(st)
      if (std !== undefined) {
        const s = await createState(client, _taskType.statusClass, {
          name: std.defaultStatusName,
          ofAttribute: statusAttr._id,
          category: std._id
        })
        _taskType.statuses.push(s)
        if (type.statuses.find((it) => it._id === s) === undefined) {
          await client.update(type, {
            $push: { statuses: { _id: s, taskType: taskTypeId } }
          })
        }
      }
    }

    if (taskType !== undefined) {
      await client.diffUpdate(taskType, _taskType)
    } else {
      const ofClassClass = client.getHierarchy().getClass(ofClass)
      // Create target class for custom field.
      _taskType.targetClass = await client.createDoc(core.class.Class, core.space.Model, {
        extends: ofClass,
        kind: ClassifierKind.MIXIN,
        label: getEmbeddedLabel(name),
        icon: ofClassClass.icon
      })

      await client.createDoc(task.class.TaskType, type._id, _taskType, taskTypeId)
    }

    if (!type.tasks.includes(taskTypeId)) {
      await client.update(type, { $push: { tasks: taskTypeId } })
    }

    dispatch('close')
  }

  const descriptorItems: DropdownIntlItem[] = taskTypeDescriptors.map((it) => ({ id: it._id, label: it.name }))
</script>

<Card
  label={task.string.TaskType}
  okAction={save}
  canSave
  okLabel={taskType !== undefined ? presentation.string.Save : presentation.string.Create}
  on:changeContent
  onCancel={() => dispatch('close')}
>
  <EditBox
    focusIndex={1}
    bind:value={name}
    placeholder={task.string.TaskName}
    kind={'large-style'}
    autoFocus
    fullSize
  />
  <div class="p-1 flex-row-center mt-4">
    <TaskTypeKindEditor bind:kind />

    <DropdownLabelsIntl kind={'regular'} size={'large'} items={descriptorItems} bind:selected={taskTypeDescriptor} />
  </div>
</Card>
