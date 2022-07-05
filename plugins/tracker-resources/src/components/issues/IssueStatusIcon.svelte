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
  import { WithLookup } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { IssueStatus, IssueStatusCategory } from '@anticrm/tracker'
  import { getPlatformColor, Icon, IconSize } from '@anticrm/ui'
  import tracker from '../../plugin'

  export let value: WithLookup<IssueStatus>
  export let size: IconSize
  export let fill: string | undefined = undefined

  const client = getClient()

  let category: IssueStatusCategory | undefined

  async function updateCategory (status: WithLookup<IssueStatus>) {
    if (status.$lookup?.category) {
      category = status.$lookup.category
    }

    category = await client.findOne(tracker.class.IssueStatusCategory, { _id: value.category })
  }

  $: updateCategory(value)
  $: icon = category?.icon
  $: color =
    fill ??
    (value.color !== undefined ? getPlatformColor(value.color) : undefined) ??
    (category !== undefined ? getPlatformColor(category.color) : undefined)
</script>

{#if icon !== undefined && color !== undefined}
  <Icon {icon} fill={color} {size} />
{/if}
