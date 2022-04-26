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
  import { Ref, Timestamp, WithLookup } from '@anticrm/core'
  import { Issue, Team } from '@anticrm/tracker'
  import { DatePresenter, Tooltip, getDaysDifference } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'
  import DueDatePopup from './DueDatePopup.svelte'
  import tracker from '../../plugin'

  export let value: WithLookup<Issue>
  export let currentSpace: Ref<Team> | undefined = undefined

  const WARNING_DAYS = 7
  const client = getClient()

  $: today = new Date(new Date(Date.now()).setHours(0, 0, 0, 0))
  $: dueDateMs = value.dueDate
  $: isOverdue = dueDateMs !== null && dueDateMs < today.getTime()
  $: dueDate = dueDateMs === null ? null : new Date(dueDateMs)
  $: daysDifference = dueDate === null ? null : getDaysDifference(today, dueDate)
  $: iconModifier = getIconModifier(isOverdue, daysDifference)
  $: formattedDate = !dueDateMs ? '' : new Date(dueDateMs).toLocaleString('default', { month: 'short', day: 'numeric' })

  const handleDueDateChanged = async (event: CustomEvent<Timestamp>) => {
    const newDate = event.detail

    if (newDate === undefined) {
      return
    }

    const currentIssue = await client.findOne(tracker.class.Issue, { space: currentSpace, _id: value._id })

    if (currentIssue === undefined) {
      return
    }

    await client.update(currentIssue, { dueDate: newDate })
  }

  const getIconModifier = (isOverdue: boolean, daysDifference: number | null) => {
    if (isOverdue) {
      return 'overdue' as 'overdue' // Fixes `DatePresenter` icon type issue
    }

    if (daysDifference === 0) {
      return 'critical' as 'critical'
    }

    if (daysDifference !== null && daysDifference <= WARNING_DAYS) {
      return 'warning' as 'warning'
    }
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
