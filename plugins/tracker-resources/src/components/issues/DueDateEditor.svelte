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
  import { getClient } from '@hcengineering/presentation'
  import tracker, { Issue } from '@hcengineering/tracker'
  import { DueDatePresenter } from '@hcengineering/ui'
  import { WithLookup } from '@hcengineering/core'

  export let value: WithLookup<Issue>
  export let width: string | undefined = undefined

  const client = getClient()
  $: shouldIgnoreOverdue =
    value.$lookup?.status?.category === tracker.issueStatusCategory.Completed ||
    value.$lookup?.status?.category === tracker.issueStatusCategory.Canceled

  const handleDueDateChanged = async (newDueDate: number | undefined | null) => {
    if (newDueDate === undefined || value.dueDate === newDueDate) {
      return
    }

    await client.updateCollection(
      value._class,
      value.space,
      value._id,
      value.attachedTo,
      value.attachedToClass,
      value.collection,
      { dueDate: newDueDate }
    )
  }
</script>

{#if value}
  <DueDatePresenter
    kind={'link'}
    value={value.dueDate}
    {width}
    editable
    onChange={(e) => handleDueDateChanged(e)}
    {shouldIgnoreOverdue}
  />
{/if}
