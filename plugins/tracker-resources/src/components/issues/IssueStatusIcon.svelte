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
  import { WithLookup, SortingOrder } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { IssueStatus, IssueStatusCategory } from '@hcengineering/tracker'
  import { getPlatformColor, IconSize } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import StatusIcon from '../icons/StatusIcon.svelte'

  export let value: WithLookup<IssueStatus>
  export let size: IconSize
  export let fill: string | undefined = undefined

  const client = getClient()

  let category: IssueStatusCategory | undefined
  let categories: IssueStatus[] | undefined
  let statusIcon: {
    index: number | undefined
    count: number | undefined
  } = { index: undefined, count: undefined }

  async function updateCategory (status: WithLookup<IssueStatus>) {
    if (status.$lookup?.category) {
      category = status.$lookup.category
    }
    if (category === undefined) {
      category = await client.findOne(tracker.class.IssueStatusCategory, { _id: value.category })
    }
    if (value.category === tracker.issueStatusCategory.Started) {
      categories = await client.findAll(
        tracker.class.IssueStatus,
        { category: tracker.issueStatusCategory.Started },
        { sort: { rank: SortingOrder.Ascending } }
      )
      if (categories) {
        categories.map((cat, i) => {
          if (cat._id === value._id) statusIcon = { index: i + 1, count: categories ? categories.length + 1 : 0 }
          return true
        })
      }
    }
  }

  $: updateCategory(value)
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
