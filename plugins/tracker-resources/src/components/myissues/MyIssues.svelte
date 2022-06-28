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
  import core, { DocumentQuery, getCurrentAccount, Ref, TxCollectionCUD } from '@anticrm/core'
  import type { Issue } from '@anticrm/tracker'
  import type { EmployeeAccount } from '@anticrm/contact'
  import type { IntlString } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import notification from '@anticrm/notification'

  import IssuesView from '../issues/IssuesView.svelte'
  import ModeSelector from '../ModeSelector.svelte'
  import tracker from '../../plugin'

  const config: [string, IntlString][] = [
    ['assigned', tracker.string.Assigned],
    ['created', tracker.string.Created],
    ['subscribed', tracker.string.Subscribed]
  ]
  const currentUser = getCurrentAccount() as EmployeeAccount
  const assigned = { assignee: currentUser.employee }
  const created = { _id: { $in: [] as Ref<Issue>[] } }
  const subscribed = { _id: { $in: [] as Ref<Issue>[] } }

  const createdQuery = createQuery()
  $: createdQuery.query<TxCollectionCUD<Issue, Issue>>(
    core.class.TxCollectionCUD,
    {
      modifiedBy: currentUser._id,
      objectClass: tracker.class.Issue,
      collection: 'subIssues',
      'tx._class': core.class.TxCreateDoc
    },
    (result) => {
      created._id.$in = result.map(({ tx: { objectId } }) => objectId)
    },
    { sort: { _id: 1 } }
  )

  const subscribedQuery = createQuery()
  $: subscribedQuery.query(
    notification.class.LastView,
    { user: getCurrentAccount()._id, attachedToClass: tracker.class.Issue, lastView: { $gte: 0 } },
    (result) => {
      const newSub = result.map(({ attachedTo }) => attachedTo as Ref<Issue>)
      const curSub = subscribed._id.$in
      if (curSub.length !== newSub.length || curSub.some((id, i) => newSub[i] !== id)) {
        subscribed._id.$in = newSub
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
    return queries[mode]
  }
  $: query = getQuery(mode, { assigned, created, subscribed })
</script>

<IssuesView {query} title={tracker.string.MyIssues}>
  <svelte:fragment slot="afterHeader">
    <ModeSelector {config} {mode} onChange={handleChangeMode} />
  </svelte:fragment>
</IssuesView>
