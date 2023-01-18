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
  import { DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import { ActionContext, List } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'

  export let query: DocumentQuery<Issue> | undefined = undefined
  export let issues: Issue[] | undefined = undefined
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions

  // Extra properties
  export let teams: Map<Ref<Team>, Team> | undefined
  export let issueStatuses: Map<Ref<Team>, WithLookup<IssueStatus>[]>
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

{#if viewlet}
  <List
    _class={tracker.class.Issue}
    {viewOptions}
    viewOptionsConfig={viewlet.viewOptions?.other}
    config={viewlet.config}
    documents={issues}
    {query}
    flatHeaders={true}
    props={{ teams, issueStatuses }}
  />
{/if}
