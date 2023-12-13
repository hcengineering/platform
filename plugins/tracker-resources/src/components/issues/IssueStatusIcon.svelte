<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { Ref, StatusCategory, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import {
    ProjectType,
    TaskType,
    getProjectTypeStates,
    getStates,
    getTaskTypeStates,
    isTaskCategory
  } from '@hcengineering/task'
  import { taskTypeStore, typeStore } from '@hcengineering/task-resources'
  import StatePresenter from '@hcengineering/task-resources/src/components/state/StatePresenter.svelte'
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import { IconSize } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { activeProjects } from '../../utils'
  import StatusIcon from '../icons/StatusIcon.svelte'

  export let value: WithLookup<IssueStatus> | undefined
  export let size: IconSize
  export let space: Ref<Project> | undefined = undefined
  export let projectType: Ref<ProjectType> | undefined = undefined
  export let taskType: Ref<TaskType> | undefined = undefined

  const dynamicFillCategories = [tracker.issueStatusCategory.Started]

  const client = getClient()

  let category: StatusCategory | undefined
  let statuses: IssueStatus[] = []
  const statusIcon: {
    index: number | undefined
    count: number | undefined
  } = { index: undefined, count: undefined }

  $: _space = space !== undefined ? ($activeProjects.get(space) as Project) : undefined

  $: if (value?.category === tracker.issueStatusCategory.Started) {
    if (taskType !== undefined) {
      statuses = getTaskTypeStates(taskType, $taskTypeStore, $statusStore.byId).filter(
        (p) => p.category === tracker.issueStatusCategory.Started
      )
    } else if (projectType !== undefined) {
      statuses = getProjectTypeStates(projectType, $typeStore, $statusStore.byId).filter(
        (p) => p.category === tracker.issueStatusCategory.Started
      )
    } else {
      statuses = getStates(_space, $typeStore, $statusStore.byId).filter(
        (p) => p.category === tracker.issueStatusCategory.Started
      )
    }
  }

  async function updateCategory (
    _space: Project | undefined,
    status: WithLookup<IssueStatus>,
    statuses: IssueStatus[]
  ): Promise<void> {
    if (status.$lookup?.category !== undefined) {
      category = status.$lookup.category
    }
    if (category === undefined || category._id !== value?.category) {
      if (value) {
        category = await client.findOne(core.class.StatusCategory, { _id: value.category })
      }
    }
    if (value?.category !== undefined && dynamicFillCategories.includes(value?.category)) {
      const index = statuses.findIndex((p) => p._id === value?._id)
      if (index !== -1) {
        statusIcon.index = index + 1
        statusIcon.count = statuses.length + 1
      } else {
        statusIcon.index = undefined
        statusIcon.count = undefined
      }
    }
  }

  function getViewState (type: ProjectType | undefined, state: IssueStatus): IssueStatus {
    if (type === undefined) return state
    const targetColor = type.statuses.find((p) => p._id === state._id)?.color
    if (targetColor === undefined) return state
    return {
      ...state,
      color: targetColor
    }
  }

  $: type = _space ? $typeStore.get(_space.type) : projectType !== undefined ? $typeStore.get(projectType) : undefined

  $: viewState = value && getViewState(type, value)

  $: if (value !== undefined) {
    void updateCategory(_space, value, statuses)
  }
  $: icon = category?.icon
  $: color = viewState?.color !== undefined ? viewState?.color : category !== undefined ? category.color : -1
</script>

{#if category !== undefined && isTaskCategory(category._id)}
  <StatePresenter
    {space}
    projectType={_space?.type ?? projectType}
    {taskType}
    {value}
    {size}
    shouldShowName={false}
    on:accent-color
  />
{:else if icon !== undefined && color !== undefined && category !== undefined}
  <StatusIcon on:accent-color {category} {size} fill={color} {statusIcon} />
{/if}
