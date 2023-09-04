<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import { Issue } from '@hcengineering/tracker'
  import { floorFractionDigits, Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { statusStore } from '@hcengineering/view-resources'
  import EstimationProgressCircle from '../issues/timereport/EstimationProgressCircle.svelte'
  import TimePresenter from '../issues/timereport/TimePresenter.svelte'
  import { FixedColumn } from '@hcengineering/view-resources'
  export let docs: Issue[] | undefined = undefined
  export let capacity: number | undefined = undefined
  export let category: string | undefined = undefined

  $: ids = new Set(docs?.map((it) => it._id) ?? [])

  $: noParents = docs?.filter((it) => !ids.has(it.attachedTo as Ref<Issue>))

  $: rootNoBacklogIssues = noParents?.filter(
    (it) => $statusStore.get(it.status)?.category !== tracker.issueStatusCategory.Backlog
  )

  $: totalEstimation = floorFractionDigits(
    (rootNoBacklogIssues ?? [{ estimation: 0, childInfo: [] } as unknown as Issue])
      .map((it) => {
        const cat = $statusStore.get(it.status)?.category

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
      }, 0),
    3
  )
</script>

{#if docs && (category === 'milestone' || category === 'assignee')}
  <FixedColumn key="estimation-editor">
    <!-- <Label label={tracker.string.MilestoneDay} value={}/> -->
    <div class="flex-row-center flex-no-shrink h-6" class:showWarning={totalEstimation > (capacity ?? 0)}>
      <EstimationProgressCircle value={totalReported} max={totalEstimation} />
      <div class="w-2 min-w-2" />
      {#if totalReported > 0}
        <TimePresenter value={totalReported} />
        /
      {/if}
      <TimePresenter value={totalEstimation} />
      {#if capacity}
        <Label label={tracker.string.CapacityValue} params={{ value: capacity }} />
      {/if}
    </div>
  </FixedColumn>
{/if}
