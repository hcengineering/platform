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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { Expandable, Spinner } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import EstimationSubIssueList from './EstimationSubIssueList.svelte'

  export let issue: Issue
  export let projects: Map<Ref<Project>, Project>

  const subIssuesQuery = createQuery()

  let subIssues: Issue[] | undefined

  $: hasSubIssues = issue.subIssues > 0
  $: subIssuesQuery.query(tracker.class.Issue, { attachedTo: issue._id }, async (result) => (subIssues = result), {
    sort: { estimation: SortingOrder.Descending }
  })
  $: total = (subIssues ?? []).reduce((a, b) => a + b.estimation, 0)
</script>

{#if subIssues}
  {#if hasSubIssues}
    <Expandable label={tracker.string.ChildEstimation} contentColor bordered>
      <svelte:fragment slot="title">: <span class="caption-color">{total}</span></svelte:fragment>
      <EstimationSubIssueList issues={subIssues} {projects} />
    </Expandable>
  {/if}
{:else}
  <div class="flex-center pt-3">
    <Spinner />
  </div>
{/if}
