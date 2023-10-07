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
  import { DocumentQuery, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { resolvedLocationStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

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

  const archivedProjectQuery = createQuery()
  let archived: Ref<Project>[] = []

  archivedProjectQuery.query(
    tracker.class.Project,
    { archived: true },
    (res) => {
      archived = res.map((it) => it._id)
    },
    { projection: { _id: 1 } }
  )
  $: spaceQuery = currentSpace ? { space: currentSpace } : { space: { $nin: archived } }

  $: all = { ...baseQuery, ...spaceQuery }

  const activeStatusQuery = createQuery()

  let activeStatuses: Ref<IssueStatus>[] = []

  $: activeStatusQuery.query(
    tracker.class.IssueStatus,
    { category: { $in: [tracker.issueStatusCategory.Unstarted, tracker.issueStatusCategory.Started] } },
    (result) => {
      activeStatuses = result.map(({ _id }) => _id)
    }
  )

  let active: DocumentQuery<Issue>
  $: active = { status: { $in: activeStatuses }, ...spaceQuery }

  const backlogStatusQuery = createQuery()

  let backlogStatuses: Ref<IssueStatus>[] = []
  let backlog: DocumentQuery<Issue> = {}
  $: backlogStatusQuery.query(
    tracker.class.IssueStatus,
    { category: tracker.issueStatusCategory.Backlog },
    (result) => {
      backlogStatuses = result.map(({ _id }) => _id)
    }
  )
  $: backlog = { status: { $in: backlogStatuses }, ...spaceQuery }

  $: queries = { all, active, backlog }
  $: mode = $resolvedLocationStore.query?.mode ?? undefined
  $: if (mode === undefined || (queries as any)[mode] === undefined) {
    ;[[mode]] = config
  }
  $: if (mode !== undefined) {
    query = { ...(queries as any)[mode] }
    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }
</script>

{#if query !== undefined && modeSelectorProps !== undefined}
  <IssuesView {query} space={currentSpace} {title} {modeSelectorProps} />
{/if}
