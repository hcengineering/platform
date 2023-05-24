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
  import { DocumentQuery, Ref } from '@hcengineering/core'
  import { Issue, Project } from '@hcengineering/tracker'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { resolvedLocationStore } from '@hcengineering/ui'

  import { IModeSelector } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import IssuesView from './IssuesView.svelte'

  export let currentSpace: Ref<Project> | undefined = undefined
  export let baseQuery: DocumentQuery<Issue> = {}
  export let title: IntlString
  export let config: [string, IntlString, object][]

  const dispatch = createEventDispatcher()
  let query: DocumentQuery<Issue> | undefined = undefined
  let modeSelectorProps: IModeSelector | undefined = undefined

  $: spaceQuery = currentSpace ? { space: currentSpace } : {}

  $: all = { ...baseQuery, ...spaceQuery }

  const activeStatusQuery = createQuery()
  let active: DocumentQuery<Issue>
  $: activeStatusQuery.query(
    tracker.class.IssueStatus,
    {
      category: { $in: [tracker.issueStatusCategory.Unstarted, tracker.issueStatusCategory.Started] },
      ...spaceQuery
    },
    (result) => {
      active = { status: { $in: result.map(({ _id }) => _id) }, ...spaceQuery }
    }
  )

  const backlogStatusQuery = createQuery()
  let backlog: DocumentQuery<Issue> = {}
  $: backlogStatusQuery.query(
    tracker.class.IssueStatus,
    { category: tracker.issueStatusCategory.Backlog, ...spaceQuery },
    (result) => {
      backlog = { status: { $in: result.map(({ _id }) => _id) }, ...spaceQuery }
    }
  )

  $: queries = { all, active, backlog }
  $: mode = $resolvedLocationStore.query?.mode ?? undefined
  $: if (mode === undefined || queries[mode] === undefined) {
    ;[[mode]] = config
  }
  $: if (mode !== undefined) {
    query = { ...queries[mode], '$lookup.space.archived': false }
    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }
</script>

{#if query !== undefined && modeSelectorProps !== undefined}
  {#key query && currentSpace}
    <IssuesView {query} space={currentSpace} {title} {modeSelectorProps} />
  {/key}
{/if}
