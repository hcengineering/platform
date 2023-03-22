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
  import { WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { IssueStatus, IssueStatusCategory } from '@hcengineering/tracker'
  import { getPlatformColor, IconSize } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { statusStore } from '../../utils'
  import StatusIcon from '../icons/StatusIcon.svelte'

  export let value: WithLookup<IssueStatus>
  export let size: IconSize
  export let fill: string | undefined = undefined

  const dynamicFillCategories = [tracker.issueStatusCategory.Started]

  const client = getClient()

  let category: IssueStatusCategory | undefined
  let statuses: IssueStatus[] = []
  const statusIcon: {
    index: number | undefined
    count: number | undefined
  } = { index: undefined, count: undefined }

  const categoriesQuery = createQuery()

  $: if (value.category === tracker.issueStatusCategory.Started) {
    const _s = [
      ...$statusStore.filter(
        (it) => it.attachedTo === value.attachedTo && it.category === tracker.issueStatusCategory.Started
      )
    ]
    _s.sort((a, b) => a.rank.localeCompare(b.rank))
    statuses = _s
    categoriesQuery.unsubscribe()
  }

  async function updateCategory (status: WithLookup<IssueStatus>, statuses: IssueStatus[]) {
    if (status.$lookup?.category) {
      category = status.$lookup.category
    }
    if (category === undefined) {
      category = await client.findOne(tracker.class.IssueStatusCategory, { _id: value.category })
    }
    if (dynamicFillCategories.includes(value.category)) {
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
  $: color =
    fill ??
    (value.color !== undefined ? getPlatformColor(value.color) : undefined) ??
    (category !== undefined ? getPlatformColor(category.color) : undefined) ??
    'currentColor'
</script>

{#if icon !== undefined && color !== undefined && category !== undefined}
  <StatusIcon {category} {size} fill={color} {statusIcon} />
{/if}
