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
  import { Timestamp, WithLookup } from '@anticrm/core'
  import { Issue } from '@anticrm/tracker'
  import { DatePresenter, Tooltip, getDaysDifference } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'
  import DueDatePopup from './DueDatePopup.svelte'
  import tracker from '../../plugin'
  import { getDueDateIconModifier } from '../../utils'

  export let value: WithLookup<Issue>

  const client = getClient()

  $: today = new Date(new Date(Date.now()).setHours(0, 0, 0, 0))
  $: dueDateMs = value.dueDate
  $: isOverdue = dueDateMs !== null && dueDateMs < today.getTime()
  $: dueDate = dueDateMs === null ? null : new Date(dueDateMs)
  $: daysDifference = dueDate === null ? null : getDaysDifference(today, dueDate)
  $: iconModifier = getDueDateIconModifier(isOverdue, daysDifference)
  $: formattedDate = !dueDateMs ? '' : new Date(dueDateMs).toLocaleString('default', { month: 'short', day: 'numeric' })

  const handleDueDateChanged = async (event: CustomEvent<Timestamp>) => {
    const newDate = event.detail

    if (newDate === undefined || value.dueDate === newDate) {
      return
    }

    await client.update(value, { dueDate: newDate })
  }

  $: shouldRenderPresenter =
    dueDateMs &&
    value.$lookup?.status?.category !== tracker.issueStatusCategory.Completed &&
    value.$lookup?.status?.category !== tracker.issueStatusCategory.Canceled
</script>

{#if shouldRenderPresenter}
  <Tooltip
    direction={'top'}
    component={DueDatePopup}
    props={{
      formattedDate: formattedDate,
      daysDifference: daysDifference,
      isOverdue: isOverdue,
      iconModifier: iconModifier
    }}
  >
    <DatePresenter
      value={dueDateMs}
      editable={true}
      shouldShowLabel={false}
      icon={iconModifier}
      on:change={handleDueDateChanged}
    />
  </Tooltip>
{/if}
