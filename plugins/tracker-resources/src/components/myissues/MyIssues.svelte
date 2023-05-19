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
  import type { EmployeeAccount } from '@hcengineering/contact'
  import { Doc, DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import type { Issue } from '@hcengineering/tracker'

  import tracker from '../../plugin'
  import IssuesView from '../issues/IssuesView.svelte'
  import { IModeSelector } from '../../utils'

  const config: [string, IntlString, object][] = [
    ['assigned', tracker.string.Assigned, {}],
    ['created', tracker.string.Created, { value: 2 }],
    ['subscribed', tracker.string.Subscribed, {}]
  ]
  const currentUser = getCurrentAccount() as EmployeeAccount
  const assigned = { assignee: currentUser.employee }
  const created = { createdBy: currentUser._id }
  let subscribed = { _id: { $in: [] as Ref<Issue>[] } }

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

  let [[mode]] = config
  function handleChangeMode (newMode: string) {
    if (newMode === mode) return
    mode = newMode
  }

  function getQuery (mode: string, queries: { [key: string]: DocumentQuery<Issue> }) {
    return { ...queries[mode], '$lookup.space.archived': false }
  }
  $: query = getQuery(mode, { assigned, created, subscribed })
  $: modeSelectorProps = {
    config,
    mode,
    onChange: handleChangeMode
  } as IModeSelector
</script>

<IssuesView {query} space={undefined} title={tracker.string.MyIssues} {modeSelectorProps} />
