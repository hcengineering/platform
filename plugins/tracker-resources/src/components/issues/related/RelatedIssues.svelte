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
  import { createEventDispatcher } from 'svelte'
  import { Doc, DocumentQuery, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { Label, Spinner } from '@hcengineering/ui'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import tracker from '../../../plugin'
  import SubIssueList from '../edit/SubIssueList.svelte'
  import AddIssueDuo from '../../icons/AddIssueDuo.svelte'
  import contact from '@hcengineering/contact'

  export let object: Doc
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions
  export let disableHeader = false

  const dispatch = createEventDispatcher()

  let query: DocumentQuery<Issue>
  $: query = { 'relations._id': object._id, 'relations._class': object._class }

  const subIssuesQuery = createQuery()

  let subIssues: Issue[] = []

  let teams: Map<Ref<Team>, Team> | undefined

  $: subIssuesQuery.query(tracker.class.Issue, query, async (result) => (subIssues = result), {
    sort: { rank: SortingOrder.Ascending },
    lookup: {
      assignee: contact.class.Employee
    }
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

{#if subIssues !== undefined && viewlet !== undefined}
  {#if issueStatuses.size > 0 && teams && subIssues.length > 0}
    <SubIssueList bind:viewOptions {viewlet} issues={subIssues} {teams} {issueStatuses} {disableHeader} />
  {:else}
    <div class="antiSection-empty solid flex-col mt-3">
      <div class="flex-center content-accent-color">
        <AddIssueDuo size={'large'} />
      </div>
      <div class="text-sm dark-color" style:pointer-events="none">
        <Label label={tracker.string.RelatedIssuesNotFound} />
      </div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="over-underline text-sm content-accent-color" on:click={() => dispatch('add-issue')}>
        <Label label={tracker.string.NewRelatedIssue} />
      </div>
    </div>
  {/if}
{:else}
  <div class="flex-center pt-3">
    <Spinner />
  </div>
{/if}
