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
  import { DropdownIntlItem, Modal, ModernEditbox, Label, ButtonMenu, Toggle } from '@hcengineering/ui'
  import task from '../../plugin'
  import TaskTypeKindEditor from './TaskTypeKindEditor.svelte'
  import ClassMixinSelector from './ClassMixinSelector.svelte'
  import LinkTaskTypeSelector from './LinkTaskTypeSelector.svelte'
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

  let baseMixin = taskType?.baseMixin

  // Mode: 'create' for new TaskType, 'clone' for cloning existing
  let mode: 'create' | 'clone' = 'create'
  let selectedTaskTypesToClone: Ref<TaskType>[] = []

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

    // Clone mode: clone selected TaskTypes
    if (mode === 'clone') {
      await cloneSelectedTaskTypes()
      return
    }

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
      icon: descr.icon,
      baseMixin
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
      // Use baseMixin if provided, otherwise use ofClass
      const extendsClass = baseMixin ?? ofClass
      _taskType.targetClass = await client.createDoc(core.class.Class, core.space.Model, {
        extends: extendsClass,
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

  async function cloneSelectedTaskTypes (): Promise<void> {
    if (selectedTaskTypesToClone.length === 0) return

    // Fetch the selected TaskTypes
    const sourceTaskTypes = await client.findAll(task.class.TaskType, {
      _id: { $in: selectedTaskTypesToClone }
    })

    for (const source of sourceTaskTypes) {
      const newTaskTypeId: Ref<TaskType> = generateId()

      // Create new targetClass (mixin) that extends the source's targetClass
      const sourceClass = client.getHierarchy().getClass(source.ofClass)
      const newTargetClass = await client.createDoc(core.class.Class, core.space.Model, {
        extends: source.targetClass, // Inherit from source's mixin
        kind: ClassifierKind.MIXIN,
        label: getEmbeddedLabel(source.name),
        icon: sourceClass.icon
      })

      // Clone statuses for this TaskType
      const clonedStatuses: Ref<Status>[] = []
      const statusAttr = findStatusAttr(client.getHierarchy(), source.ofClass) ??
        client.getHierarchy().getAttribute(task.class.Task, 'status')

      for (const statusId of source.statuses) {
        const originalStatus = await client.findOne(core.class.Status, { _id: statusId })
        if (originalStatus !== undefined) {
          const newStatus = await createState(client, source.statusClass, {
            name: originalStatus.name,
            ofAttribute: statusAttr._id,
            category: originalStatus.category
          })
          clonedStatuses.push(newStatus)

          // Add to ProjectType statuses
          if (type.statuses.find((it) => it._id === newStatus) === undefined) {
            await client.update(type, {
              $push: { statuses: { _id: newStatus, taskType: newTaskTypeId } }
            })
          }
        }
      }

      // Create the cloned TaskType
      const clonedTaskType: Data<TaskType> = {
        name: source.name,
        kind: source.kind,
        parent: type._id,
        descriptor: source.descriptor,
        ofClass: source.ofClass,
        targetClass: newTargetClass,
        statusCategories: source.statusCategories,
        statuses: clonedStatuses,
        statusClass: source.statusClass,
        allowedAsChildOf: source.allowedAsChildOf,
        baseMixin: source.targetClass, // Point to source's targetClass for inheritance
        icon: source.icon,
        color: source.color
      }

      await client.createDoc(task.class.TaskType, core.space.Model, clonedTaskType, newTaskTypeId)

      // Add to ProjectType tasks array
      if (!type.tasks.includes(newTaskTypeId)) {
        await client.update(type, { $push: { tasks: newTaskTypeId } })
      }
    }

    clearSettingsStore()
  }

  $: canSave = mode === 'create' ? name.trim().length > 0 : selectedTaskTypesToClone.length > 0
</script>

<Modal
  label={task.string.TaskType}
  type={'type-aside'}
  okAction={save}
  canSave={canSave}
  okLabel={mode === 'clone' ? task.string.CloneTaskTypes : (taskType !== undefined ? presentation.string.Save : presentation.string.Create)}
  on:changeContent
  onCancel={() => {
    clearSettingsStore()
  }}
>
  <!-- Mode Toggle -->
  {#if taskType === undefined}
    <div class="hulyModal-content__settingsSet">
      <div class="hulyModal-content__settingsSet-line mode-toggle">
        <span class="label">
          <Label label={task.string.CreateNew} />
        </span>
        <Toggle
          on={mode === 'clone'}
          on:change={() => { mode = mode === 'create' ? 'clone' : 'create' }}
        />
        <span class="label">
          <Label label={task.string.CloneExisting} />
        </span>
      </div>
    </div>
  {/if}

  {#if mode === 'clone' && taskType === undefined}
    <!-- Clone Mode: Select existing TaskTypes -->
    <div class="hulyModal-content__settingsSet">
      <LinkTaskTypeSelector
        currentProjectType={type._id}
        bind:selectedTaskTypes={selectedTaskTypesToClone}
      />
    </div>
  {:else}
    <!-- Create Mode: Original form -->
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
      <div class="hulyModal-content__settingsSet-line">
        <ClassMixinSelector
          baseClass={taskTypeDescriptor?.baseClass ?? task.class.Task}
          bind:value={baseMixin}
        />
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
  {/if}
</Modal>
