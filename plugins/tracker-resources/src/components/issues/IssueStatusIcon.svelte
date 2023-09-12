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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { getStates } from '@hcengineering/task'
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import { IconSize } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import StatusIcon from '../icons/StatusIcon.svelte'

  export let value: WithLookup<IssueStatus>
  export let size: IconSize
  export let space: Ref<Project> | undefined

  const dynamicFillCategories = [tracker.issueStatusCategory.Started]

  const client = getClient()

  let category: StatusCategory | undefined
  let statuses: IssueStatus[] = []
  const statusIcon: {
    index: number | undefined
    count: number | undefined
  } = { index: undefined, count: undefined }

  const spaceQuery = createQuery()
  let _space: Project | undefined = undefined
  $: space
    ? spaceQuery.query(tracker.class.Project, { _id: space }, (res) => {
      _space = res[0]
    })
    : (_space = undefined)

  $: if (value.category === tracker.issueStatusCategory.Started) {
    statuses = getStates(_space, $statusStore).filter((p) => p.category === tracker.issueStatusCategory.Started)
  }

  async function updateCategory (_space: Project | undefined, status: WithLookup<IssueStatus>, statuses: IssueStatus[]) {
    if (status.$lookup?.category) {
      category = status.$lookup.category
    }
    if (category === undefined || category._id !== value.category) {
      category = await client.findOne(core.class.StatusCategory, { _id: value.category })
    }
    if (value.category !== undefined && dynamicFillCategories.includes(value.category)) {
      const index = statuses.findIndex((p) => p._id === value._id)
      if (index !== -1) {
        statusIcon.index = index + 1
        statusIcon.count = statuses.length + 1
      } else {
        statusIcon.index = undefined
        statusIcon.count = undefined
      }
    }
  }

  $: updateCategory(_space, value, statuses)
  $: icon = category?.icon
  $: color = value.color !== undefined ? value.color : category !== undefined ? category.color : -1
</script>

{#if icon !== undefined && color !== undefined && category !== undefined}
  <StatusIcon on:accent-color {category} {size} fill={color} {statusIcon} />
{/if}
