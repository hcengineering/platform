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
  import { Ref } from '@anticrm/core'
  import { Issue, IssuePriority, Team } from '@anticrm/tracker'
  import { getClient } from '@anticrm/presentation'
  import { Tooltip } from '@anticrm/ui'
  import tracker from '../../plugin'
  import PrioritySelector from '../PrioritySelector.svelte'

  export let value: Issue
  export let currentSpace: Ref<Team> | undefined = undefined

  const client = getClient()

  const handlePriorityChanged = async (newPriority: IssuePriority | undefined) => {
    if (newPriority === undefined) {
      return
    }

    const currentIssue = await client.findOne(tracker.class.Issue, { space: currentSpace, _id: value._id })

    if (currentIssue === undefined) {
      return
    }

    await client.update(currentIssue, { priority: newPriority })
  }
</script>

{#if value}
  <Tooltip direction={'bottom'} label={tracker.string.SetPriority}>
    <PrioritySelector
      kind={'icon'}
      shouldShowLabel={false}
      priority={value.priority}
      onPriorityChange={handlePriorityChanged}
    />
  </Tooltip>
{/if}
