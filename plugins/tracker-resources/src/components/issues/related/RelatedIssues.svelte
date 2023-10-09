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
  import { Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { Label, Spinner } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../../plugin'
  import CreateIssue from '../../CreateIssue.svelte'
  import AddIssueDuo from '../../icons/AddIssueDuo.svelte'
  import SubIssueList from '../edit/SubIssueList.svelte'

  export let object: Doc
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions
  export let disableHeader: boolean = false
  export let compactMode: boolean = false

  const dispatch = createEventDispatcher()

  let query: DocumentQuery<Issue>
  $: query = { 'relations._id': object._id, 'relations._class': object._class }

  let projects: Map<Ref<Project>, Project> | undefined

  const projectsQuery = createQuery()

  $: projectsQuery.query(tracker.class.Project, { archived: false }, async (result) => {
    projects = new Map(result.map((it) => [it._id, it]))
  })
</script>

{#if viewlet !== undefined}
  {#if projects}
    <SubIssueList
      bind:viewOptions
      {viewlet}
      {query}
      {projects}
      {disableHeader}
      {compactMode}
      createItemDialog={CreateIssue}
      createItemLabel={tracker.string.AddIssueTooltip}
      createItemDialogProps={{ relatedTo: object }}
    />
  {:else}
    <div class="antiSection-empty solid flex-col">
      <div class="flex-center content-color">
        <AddIssueDuo size={'large'} />
      </div>
      <div class="text-sm content-dark-color" style:pointer-events="none">
        <Label label={tracker.string.RelatedIssuesNotFound} />
      </div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="over-underline text-sm content-color" on:click={() => dispatch('add-issue')}>
        <Label label={tracker.string.NewRelatedIssue} />
      </div>
    </div>
  {/if}
{:else}
  <div class="flex-center">
    <Spinner />
  </div>
{/if}
