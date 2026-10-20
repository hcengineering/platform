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
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import task from '@hcengineering/task'
  import { Issue } from '@hcengineering/tracker'
  import { floorFractionDigits, Label } from '@hcengineering/ui'
  import { ViewOptions } from '@hcengineering/view'
  import { FixedColumn, statusStore } from '@hcengineering/view-resources'
  import { calcIssueTimeStats } from '../../issueTimeStats'
  import tracker from '../../plugin'
  import EstimationProgressCircle from '../issues/timereport/EstimationProgressCircle.svelte'
  import TimePresenter from '../issues/timereport/TimePresenter.svelte'
  export let docs: Issue[] | undefined = undefined
  // All documents of the group, docs may hold only the loaded part of it.
  export let allDocs: Doc[] | undefined = undefined
  export let viewOptions: ViewOptions | undefined = undefined
  export let capacity: number | undefined = undefined
  export let category: string | undefined = undefined

  $: planning = category === 'milestone' || category === 'assignee'
  $: showSum = viewOptions?.showEstimationSum === true
  $: show = docs !== undefined && (planning || showSum)

  const client = getClient()
  let fetched: Issue[] | undefined = undefined
  let fetchSeq = 0

  // Rows of a group are loaded page by page, so with the option enabled the
  // time fields of the remaining issues are fetched once per set of group ids.
  // Live updates of loaded rows or loading another page do not refetch.
  $: groupIds =
    showSum && allDocs !== undefined && allDocs.length > (docs?.length ?? 0)
      ? allDocs.map((it) => it._id as Issue['_id']).sort((a, b) => a.localeCompare(b))
      : undefined
  $: void fetchGroup(groupIds?.join(','), groupIds)

  let fetchedKey: string | undefined = undefined

  async function fetchGroup (key: string | undefined, ids: Array<Issue['_id']> | undefined): Promise<void> {
    if (key === fetchedKey) return
    fetchedKey = key
    const seq = ++fetchSeq
    if (ids === undefined) {
      fetched = undefined
      return
    }
    const res = await client.findAll(
      tracker.class.Issue,
      { _id: { $in: ids } },
      {
        projection: {
          _id: 1,
          _class: 1,
          space: 1,
          attachedTo: 1,
          parents: 1,
          status: 1,
          estimation: 1,
          reportedTime: 1,
          childInfo: 1
        }
      }
    )
    if (seq === fetchSeq) {
      fetched = res
    }
  }

  // Prefer the live loaded rows, fetched data only completes them.
  $: loaded = new Map((docs ?? []).map((it) => [it._id, it]))
  $: groupDocs =
    fetched !== undefined ? [...loaded.values(), ...fetched.filter((it) => !loaded.has(it._id))] : (docs ?? [])

  $: stats = calcIssueTimeStats(groupDocs, {
    isUnStarted: (it) => $statusStore.byId.get(it.status)?.category === task.statusCategory.UnStarted,
    isClosed: (it) => {
      const cat = $statusStore.byId.get(it.status)?.category
      return cat === task.statusCategory.Won || cat === task.statusCategory.Lost
    },
    skipUnStarted: planning,
    includeAllChildren: viewOptions?.shouldShowSubIssues === false
  })
  $: totalEstimation = floorFractionDigits(stats.estimation, 3)
  $: totalReported = floorFractionDigits(stats.reportedTime, 3)
</script>

{#if show}
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
