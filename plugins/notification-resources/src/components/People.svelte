<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import activity, { TxViewlet } from '@hcengineering/activity'
  import { activityKey, ActivityKey } from '@hcengineering/activity-resources'
  import { EmployeeAccount } from '@hcengineering/contact'
  import { employeeAccountByIdStore } from '@hcengineering/contact-resources'
  import { Account, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { ListView, Loading, Scroller } from '@hcengineering/ui'
  import { ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import PeopleNotificationView from './PeopleNotificationsView.svelte'

  export let filter: 'all' | 'read' | 'unread' = 'all'

  const query = createQuery()

  let _id: Ref<Doc> | undefined
  let docs: DocUpdates[] = []
  let map: Map<Ref<Account>, DocUpdates[]> = new Map()
  let accounts: EmployeeAccount[] = []
  let loading = true

  $: query.query(
    notification.class.DocUpdates,
    {
      user: getCurrentAccount()._id,
      hidden: false
    },
    (res) => {
      docs = res
      getFiltered(docs, filter)
      loading = false
    },
    {
      sort: {
        lastTxTime: -1
      }
    }
  )

  function getFiltered (docs: DocUpdates[], filter: 'all' | 'read' | 'unread'): void {
    const filtered: DocUpdates[] = []
    for (const doc of docs) {
      if (filter === 'read') {
        const txes = doc.txes.filter((p) => !p.isNew)
        if (txes.length > 0) {
          filtered.push({
            ...doc,
            txes
          })
        }
      } else if (filter === 'unread') {
        const txes = doc.txes.filter((p) => p.isNew)
        if (txes.length > 0) {
          filtered.push({
            ...doc,
            txes
          })
        }
      } else {
        filtered.push(doc)
      }
    }
    map.clear()
    for (const item of filtered) {
      for (const tx of item.txes) {
        const arr = map.get(tx.modifiedBy) ?? []
        arr.push(item)
        map.set(tx.modifiedBy, arr)
      }
    }
    map = map
    accounts = Array.from(map.keys())
      .map((p) => $employeeAccountByIdStore.get(p as Ref<EmployeeAccount>))
      .filter((p) => p !== undefined) as EmployeeAccount[]
    listProvider.update(accounts)
    if (loading || _id === undefined) {
      changeSelected(selected)
    } else if (filtered.find((p) => p.attachedTo === _id) === undefined) {
      changeSelected(selected)
    }
  }

  $: getFiltered(docs, filter)

  $: changeSelected(selected)

  function changeSelected (index: number) {
    if (accounts[index] !== undefined) {
      listProvider.updateFocus(accounts[index])
    } else if (accounts.length) {
      if (index < accounts.length - 1) {
        selected++
      } else {
        selected--
      }
    } else {
      selected = 0
    }
  }

  let viewlets: Map<ActivityKey, TxViewlet>

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      const value = selected + offset
      if (accounts[value] !== undefined) {
        selected = value
        listView?.select(selected)
      }
    }
  })

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })

  let selected = 0
  let listView: ListView
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="clear-mins">
  <Scroller>
    {#if loading}
      <Loading />
    {:else}
      {#each accounts as account, i}
        <PeopleNotificationView
          value={account}
          items={map.get(account._id) ?? []}
          selected={selected === i}
          {viewlets}
          on:open
          on:click={() => {
            selected = i
          }}
        />
      {/each}
    {/if}
  </Scroller>
</div>
