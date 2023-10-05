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
  import type { PersonAccount } from '@hcengineering/contact'
  import { Doc, DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import type { Issue, Project } from '@hcengineering/tracker'
  import { resolvedLocationStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { IModeSelector } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import IssuesView from '../issues/IssuesView.svelte'

  export let config: [string, IntlString, object][] = []

  const dispatch = createEventDispatcher()
  const currentUser = getCurrentAccount() as PersonAccount
  const assigned = { assignee: currentUser.person }
  const created = { createdBy: currentUser._id }
  let subscribed = { _id: { $in: [] as Ref<Issue>[] } }
  let query: DocumentQuery<Issue> | undefined = undefined
  let modeSelectorProps: IModeSelector | undefined = undefined
  let mode: string | undefined = undefined

  const subscribedQuery = createQuery()
  $: subscribedQuery.query(
    tracker.class.Issue,
    { 'notification:mixin:Collaborators.collaborators': getCurrentAccount()._id },
    (result) => {
      const newSub = result.map((p) => p._id as Ref<Doc> as Ref<Issue>)
      const curSub = subscribed._id.$in
      if (curSub.length !== newSub.length || curSub.some((id, i) => newSub[i] !== id)) {
        subscribed = { _id: { $in: newSub } }
      }
    },
    { sort: { _id: 1 } }
  )

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

  $: queries = { assigned, created, subscribed }
  $: mode = $resolvedLocationStore.query?.mode ?? undefined
  $: if (mode === undefined || (queries as any)[mode] === undefined) {
    ;[[mode]] = config
  }
  $: if (mode !== undefined) {
    query = { ...(queries as any)[mode] }
    if (query?.space === undefined) {
      query = { ...query, space: { $nin: archived } }
    }
    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }
</script>

{#if query !== undefined && modeSelectorProps !== undefined}
  <IssuesView {query} space={undefined} title={tracker.string.MyIssues} {modeSelectorProps} />
{/if}
