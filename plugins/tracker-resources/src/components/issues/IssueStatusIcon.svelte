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
  import core, { StatusCategory, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { IssueStatus } from '@hcengineering/tracker'
  import { IconSize } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import StatusIcon from '../icons/StatusIcon.svelte'

  export let value: WithLookup<IssueStatus>
  export let size: IconSize

  const dynamicFillCategories = [tracker.issueStatusCategory.Started]

  const client = getClient()

  let category: StatusCategory | undefined
  let statuses: IssueStatus[] = []
  const statusIcon: {
    index: number | undefined
    count: number | undefined
  } = { index: undefined, count: undefined }

  $: if (value.category === tracker.issueStatusCategory.Started) {
    const _s = [
      ...$statusStore.filter(
        (it) =>
          it.ofAttribute === value.ofAttribute &&
          it.category === tracker.issueStatusCategory.Started &&
          it.space === value.space
      )
    ]
    _s.sort((a, b) => a.rank.localeCompare(b.rank))
    statuses = _s
  }

  async function updateCategory (status: WithLookup<IssueStatus>, statuses: IssueStatus[]) {
    if (status.$lookup?.category) {
      category = status.$lookup.category
    }
    if (category === undefined) {
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

  $: updateCategory(value, statuses)
  $: icon = category?.icon
  $: color = value.color !== undefined ? value.color : category !== undefined ? category.color : -1
</script>

{#if icon !== undefined && color !== undefined && category !== undefined}
  <StatusIcon on:accent-color {category} {size} fill={color} {statusIcon} />
{/if}
