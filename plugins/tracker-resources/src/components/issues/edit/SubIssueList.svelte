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
  import { Issue, Project } from '@hcengineering/tracker'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import {
    ActionContext,
    List,
    ListSelectionProvider,
    SelectDirection,
    selectionStore
  } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import tracker from '../../../plugin'

  export let query: DocumentQuery<Issue> | undefined = undefined
  export let issues: Issue[] | undefined = undefined
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions
  export let disableHeader = false

  // Extra properties
  export let projects: Map<Ref<Project>, Project> | undefined

  let list: List

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      // Select next
      list.select(offset, of)
    }
  })

  onDestroy(() => {
    ListSelectionProvider.Pop()
  })
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

{#if viewlet}
  <List
    bind:this={list}
    _class={tracker.class.Issue}
    {viewOptions}
    viewOptionsConfig={viewlet.viewOptions?.other}
    config={viewlet.config}
    documents={issues}
    {query}
    flatHeaders={true}
    props={{ projects }}
    {disableHeader}
    selectedObjectIds={$selectionStore ?? []}
    on:row-focus={(event) => {
      listProvider.updateFocus(event.detail ?? undefined)
    }}
    on:check={(event) => {
      listProvider.updateSelection(event.detail.docs, event.detail.value)
    }}
    on:content={(evt) => {
      listProvider.update(evt.detail)
    }}
  />
{/if}
