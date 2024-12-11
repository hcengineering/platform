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
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { mySocialStringsStore } from '@hcengineering/contact-resources'
  import { Doc, DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import type { IntlString, Asset } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import type { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { IModeSelector, resolvedLocationStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import task from '@hcengineering/task'
  import tracker from '../../plugin'
  import IssuesView from '../issues/IssuesView.svelte'

  export let config: [string, IntlString, object][] = []
  export let icon: Asset | undefined = undefined

  const dispatch = createEventDispatcher()
  const assigned = { assignee: getCurrentEmployee() }
  const created = { createdBy: { $in: mySocialStringsStore } }
  let subscribed = { _id: { $in: [] as Ref<Issue>[] } }
  let query: DocumentQuery<Issue> | undefined = undefined
  let modeSelectorProps: IModeSelector | undefined = undefined
  let mode: string | undefined = undefined

  const activeStatusQuery = createQuery()

  let activeStatuses: Ref<IssueStatus>[] = []

  $: activeStatusQuery.query(
    tracker.class.IssueStatus,
    { category: { $in: [task.statusCategory.Active, task.statusCategory.ToDo] } },
    (result) => {
      activeStatuses = result.map(({ _id }) => _id)
    }
  )

  let active: DocumentQuery<Issue>
  $: active = { status: { $in: activeStatuses }, ...assigned }

  const backlogStatusQuery = createQuery()

  let backlogStatuses: Ref<IssueStatus>[] = []
  let backlog: DocumentQuery<Issue> = {}
  $: backlogStatusQuery.query(tracker.class.IssueStatus, { category: task.statusCategory.UnStarted }, (result) => {
    backlogStatuses = result.map(({ _id }) => _id)
  })
  $: backlog = { status: { $in: backlogStatuses }, ...assigned }

  const subscribedQuery = createQuery()
  $: subscribedQuery.query(
    tracker.class.Issue,
    { 'notification:mixin:Collaborators.collaborators': { $in: getCurrentAccount().socialIds } },
    (result) => {
      const newSub = result.map((p) => p._id as Ref<Doc> as Ref<Issue>)
      const curSub = subscribed._id.$in
      if (curSub.length !== newSub.length || curSub.some((id, i) => newSub[i] !== id)) {
        subscribed = { _id: { $in: newSub } }
      }
    },
    { sort: { _id: 1 }, projection: { _id: 1 } }
  )

  const allProjectQuery = createQuery()
  let allProjects: Pick<Project, '_class' | '_id' | 'archived'>[] = []

  allProjectQuery.query(
    tracker.class.Project,
    {},
    (res) => {
      allProjects = res
    },
    { projection: { _id: 1, archived: 1 } }
  )

  $: queries = { assigned, active, backlog, created, subscribed }
  $: mode = $resolvedLocationStore.query?.mode ?? undefined
  $: if (mode === undefined || (queries as any)[mode] === undefined) {
    ;[[mode]] = config
  }
  $: if (mode !== undefined) {
    query = { ...(queries as any)[mode] }
    if (query?.space === undefined) {
      query = { ...query, space: { $in: allProjects.filter((it) => !it.archived).map((it) => it._id) } }
    }
    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }
</script>

{#if query !== undefined && modeSelectorProps !== undefined}
  <IssuesView {query} space={undefined} {icon} title={tracker.string.MyIssues} {modeSelectorProps} />
{/if}
