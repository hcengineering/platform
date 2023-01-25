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
  import { Doc, DocumentQuery, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { Label, Spinner } from '@hcengineering/ui'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import tracker from '../../../plugin'
  import SubIssueList from '../edit/SubIssueList.svelte'

  export let object: Doc
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions

  let query: DocumentQuery<Issue>
  $: query = { 'relations._id': object._id, 'relations._class': object._class }

  const subIssuesQuery = createQuery()

  let subIssues: Issue[] = []

  let teams: Map<Ref<Team>, Team> | undefined

  $: subIssuesQuery.query(tracker.class.Issue, query, async (result) => (subIssues = result), {
    sort: { rank: SortingOrder.Ascending }
  })

  const teamsQuery = createQuery()

  $: teamsQuery.query(tracker.class.Team, {}, async (result) => {
    teams = new Map(result.map((it) => [it._id, it]))
  })

  let issueStatuses = new Map<Ref<Team>, WithLookup<IssueStatus>[]>()

  const statusesQuery = createQuery()
  $: statusesQuery.query(
    tracker.class.IssueStatus,
    {},
    (statuses) => {
      const st = new Map<Ref<Team>, WithLookup<IssueStatus>[]>()
      for (const s of statuses) {
        const id = s.attachedTo as Ref<Team>
        st.set(id, [...(st.get(id) ?? []), s])
      }
      issueStatuses = st
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )
</script>

<div class="mt-1">
  {#if subIssues !== undefined && viewlet !== undefined}
    {#if issueStatuses.size > 0 && teams}
      <SubIssueList bind:viewOptions {viewlet} issues={subIssues} {teams} {issueStatuses} />
    {:else}
      <div class="p-1">
        <Label label={presentation.string.NoMatchesFound} />
      </div>
    {/if}
  {:else}
    <div class="flex-center pt-3">
      <Spinner />
    </div>
  {/if}
</div>
