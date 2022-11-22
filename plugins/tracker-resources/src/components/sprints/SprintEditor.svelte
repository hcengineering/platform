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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueStatus, IssueTemplate, Sprint } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, ButtonShape, floorFractionDigits } from '@hcengineering/ui'
  import { Label, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import DatePresenter from '@hcengineering/ui/src/components/calendar/DatePresenter.svelte'
  import { activeSprint } from '../../issues'
  import tracker from '../../plugin'
  import { getDayOfSprint } from '../../utils'
  import EstimationProgressCircle from '../issues/timereport/EstimationProgressCircle.svelte'
  import SprintSelector from './SprintSelector.svelte'

  export let value: Issue | IssueTemplate
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToSprint
  export let shouldShowPlaceholder = true
  export let size: ButtonSize = 'large'
  export let kind: ButtonKind = 'link'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let onlyIcon: boolean = false
  export let issues: Issue[] | undefined = undefined
  export let groupBy: string | undefined = undefined
  export let enlargedText: boolean = false

  const client = getClient()

  const handleSprintIdChanged = async (newSprintId: Ref<Sprint> | null | undefined) => {
    if (!isEditable || newSprintId === undefined || value.sprint === newSprintId) {
      return
    }

    await client.update(value, { sprint: newSprintId })
  }

  $: ids = new Set(issues?.map((it) => it._id) ?? [])

  $: noParents = issues?.filter((it) => !ids.has(it.attachedTo as Ref<Issue>))

  $: rootNoBacklogIssues = noParents?.filter(
    (it) => issueStatuses.get(it.status)?.category !== tracker.issueStatusCategory.Backlog
  )

  const statuses = createQuery()
  let issueStatuses: Map<Ref<IssueStatus>, WithLookup<IssueStatus>> = new Map()
  $: if (noParents !== undefined) {
    statuses.query(tracker.class.IssueStatus, { _id: { $in: Array.from(noParents.map((it) => it.status)) } }, (res) => {
      issueStatuses = new Map(res.map((it) => [it._id, it]))
    })
  } else {
    statuses.unsubscribe()
  }

  $: totalEstimation = floorFractionDigits(
    (rootNoBacklogIssues ?? [{ estimation: 0, childInfo: [] } as unknown as Issue])
      .map((it) => {
        const cat = issueStatuses.get(it.status)?.category

        let retEst = it.estimation
        if (it.childInfo?.length > 0) {
          const cEstimation = it.childInfo.map((ct) => ct.estimation).reduce((a, b) => a + b, 0)
          const cReported = it.childInfo.map((ct) => ct.reportedTime).reduce((a, b) => a + b, 0)
          if (cEstimation !== 0) {
            retEst = cEstimation
            if (cat === tracker.issueStatusCategory.Completed || cat === tracker.issueStatusCategory.Canceled) {
              if (cReported < cEstimation) {
                retEst = cReported
              }
            }
          }
        } else {
          if (cat === tracker.issueStatusCategory.Completed || cat === tracker.issueStatusCategory.Canceled) {
            if (it.reportedTime < it.estimation) {
              return it.reportedTime
            }
          }
        }
        return retEst
      })
      .reduce((it, cur) => {
        return it + cur
      }, 0),
    3
  )
  $: totalReported = floorFractionDigits(
    (noParents ?? [{ reportedTime: 0, childInfo: [] } as unknown as Issue])
      .map((it) => {
        if (it.childInfo?.length > 0) {
          const cReported = it.childInfo.map((ct) => ct.reportedTime).reduce((a, b) => a + b, 0)
          if (cReported !== 0) {
            return cReported + it.reportedTime
          }
        }
        return it.reportedTime
      })
      .reduce((it, cur) => {
        return it + cur
      }),
    3
  )

  const sprintQuery = createQuery()
  let sprint: Sprint | undefined
  $: if (issues !== undefined && value.sprint) {
    sprintQuery.query(tracker.class.Sprint, { _id: value.sprint }, (res) => {
      sprint = res.shift()
    })
  }

  $: twoRows = $deviceInfo.twoRows
</script>

<div
  class="flex flex-wrap"
  class:minus-margin={kind === 'list-header'}
  style:flex-direction={twoRows ? 'column' : 'row'}
>
  {#if (value.sprint && value.sprint !== $activeSprint && groupBy !== 'sprint') || shouldShowPlaceholder}
    <div class="flex-row-center" class:minus-margin-vSpace={kind === 'list-header'} style:width>
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
        {enlargedText}
        showTooltip={{ label: value.sprint ? tracker.string.MoveToSprint : tracker.string.AddToSprint }}
        value={value.sprint}
        onChange={handleSprintIdChanged}
      />
    </div>
  {/if}

  {#if sprint || issues}
    <div class="flex-row-center" class:minus-margin-space={kind === 'list-header'} class:text-sm={twoRows}>
      {#if sprint}
        {@const now = Date.now()}
        <DatePresenter value={sprint.startDate} kind={'transparent'} />
        <span class="p-1"> / </span>
        <DatePresenter value={sprint.targetDate} kind={'transparent'} />
        <div class="w-2 min-w-2" />
        <!-- Active sprint in time -->
        <Label
          label={tracker.string.SprintPassed}
          params={{
            from:
              now < sprint.startDate
                ? 0
                : now > sprint.targetDate
                ? getDayOfSprint(sprint.startDate, sprint.targetDate)
                : getDayOfSprint(sprint.startDate, now),
            to: getDayOfSprint(sprint.startDate, sprint.targetDate)
          }}
        />
      {/if}
      {#if issues}
        <!-- <Label label={tracker.string.SprintDay} value={}/> -->
        <div
          class="flex-row-center flex-no-shrink h-6"
          class:ml-2={sprint}
          class:ml-0-5={!sprint}
          class:showWarning={totalEstimation > (sprint?.capacity ?? 0)}
        >
          <EstimationProgressCircle value={totalReported} max={totalEstimation} />
          <div class="w-2 min-w-2" />
          {#if totalReported > 0}
            <Label label={tracker.string.TimeSpendValue} params={{ value: totalReported }} />
            /
          {/if}
          <Label label={tracker.string.TimeSpendValue} params={{ value: totalEstimation }} />
          {#if sprint?.capacity}
            <Label label={tracker.string.CapacityValue} params={{ value: sprint?.capacity }} />
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .showWarning {
    color: var(--warning-color) !important;
  }
  .minus-margin {
    margin-left: -0.5rem;
    &-vSpace {
      margin: -0.25rem 0;
    }
    &-space {
      margin: -0.25rem 0 -0.25rem 0.5rem;
    }
  }
</style>
