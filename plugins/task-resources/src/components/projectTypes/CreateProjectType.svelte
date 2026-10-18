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
  import core, {
    Class,
    Ref,
    SpaceTypeDescriptor,
    StatusCategory,
    generateId,
    getCurrentAccount,
    toIdMap
  } from '@hcengineering/core'
  import { Resource, getResource, translate } from '@hcengineering/platform'
  import { getClient, hasResource } from '@hcengineering/presentation'
  import {
    Project,
    ProjectType,
    ProjectTypeDescriptor,
    TaskType,
    TaskTypeDescriptor,
    TaskTypeWithFactory,
    createProjectType,
    findStatusAttr,
    makeDefaultTaskType,
    makeTaskTypeFromTemplate
  } from '@hcengineering/task'
  import { ToggleWithLabel, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'

  const client = getClient()

  export let descriptor: SpaceTypeDescriptor
  export let name: string = ''
  export const handleTypeCreated: () => Promise<void> = createType

  let classic: boolean = true
  $: projDescriptor = descriptor as ProjectTypeDescriptor

  const dispatch = createEventDispatcher()

  // A task type of a built-in (system) project type with the same descriptor, used as a template.
  function findTemplateTaskType (descriptor: Ref<TaskTypeDescriptor>, isClassic: boolean): TaskType | undefined {
    const model = client.getModel()
    const candidates = model.findAllSync(task.class.TaskType, { descriptor }).filter((it) => {
      const parent = model.findObject(it.parent)
      return parent?.descriptor === projDescriptor._id && parent.createdBy === core.account.System
    })
    return candidates.find((it) => model.findObject(it.parent)?.classic === isClassic) ?? candidates[0]
  }

  async function getDefaultTaskTypes (type: ProjectType): Promise<TaskTypeWithFactory[]> {
    const allowed = projDescriptor.allowedTaskTypeDescriptors
    const descr = client
      .getModel()
      .findAllSync(
        task.class.TaskTypeDescriptor,
        allowed !== undefined ? { allowCreate: true, _id: { $in: allowed } } : { allowCreate: true }
      )
      .find((p) => hasResource(p._id as any as Resource<any>))
    if (descr === undefined) {
      return []
    }

    let categoryIds: Array<Ref<StatusCategory>> | undefined
    if (descr.statusCategoriesFunc !== undefined) {
      const f = await getResource(descr.statusCategoriesFunc)
      if (f !== undefined) {
        categoryIds = f(type)
      }
    }

    const template = findTemplateTaskType(descr._id, type.classic)
    if (template !== undefined) {
      const statuses = await client.findAll(template.statusClass, { _id: { $in: template.statuses } })
      return [makeTaskTypeFromTemplate(generateId(), template, statuses, categoryIds)]
    }

    categoryIds = categoryIds ?? [
      task.statusCategory.UnStarted,
      task.statusCategory.Active,
      task.statusCategory.Won,
      task.statusCategory.Lost
    ]
    const categories = toIdMap(await client.findAll(core.class.StatusCategory, { _id: { $in: categoryIds } }))
    return [
      makeDefaultTaskType(
        generateId(),
        await translate(descr.name, {}, $themeStore.language),
        descr,
        findStatusAttr(client.getHierarchy(), descr.baseClass),
        categoryIds.map((it) => categories.get(it)).filter((it) => it !== undefined) as StatusCategory[]
      )
    ]
  }

  async function createType (): Promise<void> {
    if (projDescriptor === undefined) {
      return
    }
    const typeId: Ref<ProjectType> = generateId()
    const data = {
      name,
      descriptor: projDescriptor._id,
      description: '',
      tasks: [],
      roles: 0,
      classic: projDescriptor.allowedClassic === true ? classic : false
    }
    // The type as it will be created, to resolve the default task type before creating it.
    const type: ProjectType = {
      ...data,
      _id: typeId,
      _class: task.class.ProjectType,
      space: core.space.Model,
      statuses: [],
      targetClass: `${typeId}:type:mixin` as Ref<Class<Project>>,
      modifiedOn: Date.now(),
      modifiedBy: getCurrentAccount().primarySocialId
    }
    await createProjectType(client, data, await getDefaultTaskTypes(type), typeId)
    dispatch('close')
  }
</script>

{#if projDescriptor?.allowedClassic === true}
  <ToggleWithLabel label={task.string.ClassicProject} bind:on={classic} />
{/if}
