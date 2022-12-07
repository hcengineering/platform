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
  import { DocumentQuery, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, Team, TimeSpendReport } from '@hcengineering/tracker'
  import { floorFractionDigits, Label, Scroller, Spinner } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import TimePresenter from './TimePresenter.svelte'
  import TimeSpendReportsList from './TimeSpendReportsList.svelte'

  export let issue: Issue
  export let teams: Map<Ref<Team>, Team>
  export let query: DocumentQuery<TimeSpendReport>

  const subIssuesQuery = createQuery()

  let reports: TimeSpendReport[] | undefined

  $: workDayLength = issue.workDayLength
  $: subIssuesQuery.query(tracker.class.TimeSpendReport, query, async (result) => (reports = result), {
    sort: { modifiedOn: SortingOrder.Descending },
    lookup: {
      attachedTo: tracker.class.Issue
    }
  })

  $: total = (reports ?? []).reduce((a, b) => a + floorFractionDigits(b.value, 3), 0)
  $: reportedTime = floorFractionDigits(issue.reportedTime, 3)
</script>

{#if reports}
  <span class="overflow-label flex-nowrap">
    <Label label={tracker.string.ReportedTime} />: <TimePresenter value={reportedTime} {workDayLength} />
    <Label label={tracker.string.TimeSpendReports} />: <TimePresenter value={total} {workDayLength} />
  </span>
  <div class="h-50">
    <Scroller>
      <TimeSpendReportsList {reports} {teams} />
    </Scroller>
  </div>
{:else}
  <div class="flex-center pt-3">
    <Spinner />
  </div>
{/if}
