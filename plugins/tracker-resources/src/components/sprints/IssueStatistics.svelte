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
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus, WorkDayLength } from '@hcengineering/tracker'
  import { floorFractionDigits, Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import EstimationProgressCircle from '../issues/timereport/EstimationProgressCircle.svelte'
  import TimePresenter from '../issues/timereport/TimePresenter.svelte'
  export let issues: Issue[] | undefined = undefined
  export let capacity: number | undefined = undefined
  export let workDayLength: WorkDayLength = WorkDayLength.EIGHT_HOURS

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
</script>

{#if issues}
  <!-- <Label label={tracker.string.SprintDay} value={}/> -->
  <div class="flex-row-center flex-no-shrink h-6" class:showWarning={totalEstimation > (capacity ?? 0)}>
    <EstimationProgressCircle value={totalReported} max={totalEstimation} />
    <div class="w-2 min-w-2" />
    {#if totalReported > 0}
      <TimePresenter value={totalReported} {workDayLength} />
      /
    {/if}
    <TimePresenter value={totalEstimation} {workDayLength} />
    {#if capacity}
      <Label label={tracker.string.CapacityValue} params={{ value: capacity }} />
    {/if}
  </div>
{/if}
