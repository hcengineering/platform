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
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { Issue } from '@hcengineering/tracker'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import tracker from '../../../plugin'
  import CreateIssue from '../../CreateIssue.svelte'
  import SubIssueList from '../edit/SubIssueList.svelte'

  export let object: Doc
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions
  export let disableHeader: boolean = false
  export let compactMode: boolean = false

  let query: DocumentQuery<Issue>
  $: query = { relations: { _id: object._id, _class: object._class } }
</script>

{#if viewlet !== undefined}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <SubIssueList
    bind:viewOptions
    {viewlet}
    {query}
    {disableHeader}
    {compactMode}
    createItemDialog={CreateIssue}
    createItemLabel={tracker.string.AddIssueTooltip}
    createItemDialogProps={{ relatedTo: object }}
  />
{/if}
