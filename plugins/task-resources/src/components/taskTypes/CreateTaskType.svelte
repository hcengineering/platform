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
  import presentation, { getClient, hasResource } from '@hcengineering/presentation'
  import {
    ProjectType,
    ProjectTypeDescriptor,
    Task,
    TaskType,
    TaskTypeDescriptor,
    createState,
    findStatusAttr
  } from '@hcengineering/task'
  import { DropdownIntlItem, Modal, ModernEditbox, Label, ButtonMenu } from '@hcengineering/ui'
  import task from '../../plugin'
  import TaskTypeKindEditor from './TaskTypeKindEditor.svelte'
  import { clearSettingsStore } from '@hcengineering/setting-resources'

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
    .findAllSync(
      task.class.TaskTypeDescriptor,
      descriptor.allowedTaskTypeDescriptors
        ? { allowCreate: true, _id: { $in: descriptor.allowedTaskTypeDescriptors } }
        : { allowCreate: true }
    )
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

  let taskTypeDescriptor: TaskTypeDescriptor = taskTypeDescriptors[0]

  async function save (): Promise<void> {
    if (type === undefined) return

    const descr = taskTypeDescriptors.find((it) => it._id === taskTypeDescriptor._id)
    if (descr === undefined) return

    const ofClass = descr.baseClass
    const _taskType = {
      kind,
      name,
      ofClass,
      descriptor: taskTypeDescriptor._id,
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

      await client.createDoc(task.class.TaskType, core.space.Model, _taskType, taskTypeId)
    }

    if (!type.tasks.includes(taskTypeId)) {
      await client.update(type, { $push: { tasks: taskTypeId } })
    }

    clearSettingsStore()
  }

  const descriptorItems: DropdownIntlItem[] = taskTypeDescriptors.map((it) => ({
    id: it._id,
    icon: it.icon,
    label: it.name
  }))
</script>

<Modal
  label={task.string.TaskType}
  type={'type-aside'}
  okAction={save}
  canSave
  okLabel={taskType !== undefined ? presentation.string.Save : presentation.string.Create}
  on:changeContent
  onCancel={() => {
    clearSettingsStore()
  }}
>
  <div class="hulyModal-content__titleGroup">
    <ModernEditbox bind:value={name} label={task.string.TaskName} size={'large'} kind={'ghost'} autoFocus />
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label">
        <Label label={task.string.TaskType} />
      </span>
      <TaskTypeKindEditor bind:kind />
    </div>
    {#if taskTypeDescriptors.length > 1}
      <div class="hulyModal-content__settingsSet-line">
        <span class="label">
          <Label label={task.string.Type} />
        </span>
        <ButtonMenu
          selected={taskTypeDescriptor._id}
          items={descriptorItems}
          icon={taskTypeDescriptor.icon}
          label={taskTypeDescriptor.name}
          kind={'secondary'}
          size={'large'}
          on:selected={(evt) => {
            if (evt.detail != null) {
              const tt = taskTypeDescriptors.find((tt) => tt._id === evt.detail)
              if (tt) taskTypeDescriptor = tt
            }
          }}
        />
      </div>
    {/if}
  </div>
</Modal>
