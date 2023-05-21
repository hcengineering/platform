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
  import { Issue, Project } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import IssuesView from './IssuesView.svelte'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { IModeSelector } from '@hcengineering/ui'
  import { navigate, parseLocation } from '@hcengineering/ui'

  export let currentSpace: Ref<Project> | undefined = undefined
  export let baseQuery: DocumentQuery<Issue> = {}
  export let title: IntlString

  const config: [string, IntlString, object][] = [
    ['all', tracker.string.All, {}],
    ['active', tracker.string.Active, {}],
    ['backlog', tracker.string.Backlog, {}]
  ]
  let [[mode]] = config
  const loc = parseLocation(new URL(`${window.location.href}/${mode}`))

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

  function handleChangeMode (newMode: string) {
    if (newMode === mode) return
    mode = newMode
  }

  function getQuery (mode: string, queries: { [key: string]: DocumentQuery<Issue> }) {
    return { ...queries[mode], '$lookup.space.archived': false }
  }
  $: query = getQuery(mode, { all, active, backlog })
  $: modeSelectorProps = {
    config,
    mode,
    onChange: handleChangeMode
  } as IModeSelector
  $: loc.path[loc.path.length - 1] = mode
  $: navigate(loc)
</script>

{#key query && currentSpace}
  <IssuesView {query} space={currentSpace} {title} {modeSelectorProps} />
{/key}
