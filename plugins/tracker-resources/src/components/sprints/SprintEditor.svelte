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
  import { IntlString } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Issue, Sprint } from '@anticrm/tracker'
  import { ButtonKind, ButtonShape, ButtonSize, isWeekend, Label, tooltip } from '@anticrm/ui'
  import { activeSprint } from '../../issues'
  import tracker from '../../plugin'
  import EstimationProgressCircle from '../issues/timereport/EstimationProgressCircle.svelte'
  import SprintSelector from './SprintSelector.svelte'

  export let value: Issue
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToSprint
  export let shouldShowPlaceholder = true
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let onlyIcon: boolean = false
  export let issues: Issue[] | undefined
  export let groupBy: string | undefined

  const client = getClient()

  const handleSprintIdChanged = async (newSprintId: Ref<Sprint> | null | undefined) => {
    if (!isEditable || newSprintId === undefined || value.sprint === newSprintId) {
      return
    }

    await client.updateCollection(
      value._class,
      value.space,
      value._id,
      value.attachedTo,
      value.attachedToClass,
      value.collection,
      { sprint: newSprintId }
    )
  }

  $: ids = new Set(issues?.map((it) => it._id) ?? [])

  $: noParents = issues?.filter((it) => !ids.has(it.attachedTo as Ref<Issue>))
  $: totalEstimation = (noParents ?? [{ estimation: 0 }])
    .map((it) => it.estimation)
    .reduce((it, cur) => {
      return it + cur
    })
  $: totalReported = (noParents ?? [{ reportedTime: 0 }])
    .map((it) => it.reportedTime)
    .reduce((it, cur) => {
      return it + cur
    })

  const sprintQuery = createQuery()
  let sprint: Sprint | undefined
  $: if (issues !== undefined && value.sprint) {
    sprintQuery.query(tracker.class.Sprint, { _id: value.sprint }, (res) => {
      sprint = res.shift()
    })
  }
  function getDayOfSprint (startDate: number, now: number): number {
    const days = Math.floor(Math.abs((1 + now - startDate) / 1000 / 60 / 60 / 24)) + 1
    const stDate = new Date(startDate)
    const stDateDate = stDate.getDate()
    const ds = Array.from(Array(days).keys()).map((it) => stDateDate + it)
    return ds.filter((it) => !isWeekend(new Date(stDate.setDate(it)))).length
  }
</script>

{#if (value.sprint && value.sprint !== $activeSprint && groupBy !== 'sprint') || shouldShowPlaceholder}
  <div
    class="clear-mins"
    use:tooltip={{ label: value.sprint ? tracker.string.MoveToSprint : tracker.string.AddToSprint }}
  >
    <SprintSelector
      {kind}
      {size}
      {shape}
      {width}
      {justify}
      {isEditable}
      {shouldShowLabel}
      {popupPlaceholder}
      {onlyIcon}
      value={value.sprint}
      onSprintIdChange={handleSprintIdChanged}
    />
  </div>
{/if}

{#if issues}
  {#if sprint}
    {@const now = Date.now()}
    {#if sprint.startDate < now && now < sprint.targetDate}
      <!-- Active sprint in time -->
      <div class="ml-2">
        <Label
          label={tracker.string.SprintPassed}
          params={{
            from: getDayOfSprint(sprint.startDate, now),
            to: getDayOfSprint(sprint.startDate, sprint.targetDate) - 1
          }}
        />
      </div>
    {/if}
  {/if}
  <!-- <Label label={tracker.string.SprintDay} value={}/> -->
  <div class="ml-4 flex-row-center">
    <div class="mr-2">
      <EstimationProgressCircle value={totalReported} max={totalEstimation} />
    </div>
    {#if totalReported > 0}
      <Label label={tracker.string.TimeSpendValue} params={{ value: totalReported }} />
      /
    {/if}
    <Label label={tracker.string.TimeSpendValue} params={{ value: totalEstimation }} />
  </div>
{/if}
