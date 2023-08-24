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
  import { createEventDispatcher } from 'svelte'
  import activity, { TxViewlet } from '@hcengineering/activity'
  import { activityKey, ActivityKey } from '@hcengineering/activity-resources'
  import { PersonAccount } from '@hcengineering/contact'
  import { personAccountByIdStore } from '@hcengineering/contact-resources'
  import { Account, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { createQuery } from '@hcengineering/presentation'
  import { Loading, Scroller } from '@hcengineering/ui'

  import PeopleNotificationView from './PeopleNotificationsView.svelte'

  export let filter: 'all' | 'read' | 'unread' = 'all'
  export let _id: Ref<Doc> | undefined

  const query = createQuery()

  let docs: DocUpdates[] = []
  let map: Map<Ref<Account>, DocUpdates[]> = new Map()
  let accounts: PersonAccount[] = []
  let loading = true

  $: query.query(
    notification.class.DocUpdates,
    {
      user: getCurrentAccount()._id,
      hidden: false
    },
    async (res) => {
      docs = res
      await getFiltered(docs, filter)
      loading = false
    },
    {
      sort: {
        lastTxTime: -1
      }
    }
  )

  async function getFiltered (docs: DocUpdates[], filter: 'all' | 'read' | 'unread'): Promise<void> {
    const filtered: DocUpdates[] = []
    for (const doc of docs) {
      if (doc.txes.length === 0) continue
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
        if (arr.findIndex((p) => p._id === item._id) === -1) {
          arr.push(item)
          map.set(tx.modifiedBy, arr)
        }
      }
    }
    map = map
    accounts = Array.from(map.keys())
      .map((p) => $personAccountByIdStore.get(p as Ref<PersonAccount>))
      .filter((p) => p !== undefined) as PersonAccount[]
    if (_id === undefined) {
      changeSelected(selected)
    } else {
      const index = filtered.findIndex((p) => p.attachedTo === _id)
      if (index === -1) {
        changeSelected(selected)
      } else {
        const doc = filtered[index]
        const acc = accounts.findIndex((p) => p._id === doc.txes[doc.txes.length - 1].modifiedBy)
        if (acc !== -1) {
          selected = acc
          changeSelected(selected)
        }
      }
    }
  }

  $: getFiltered(docs, filter)

  function changeSelected (index: number) {
    if (accounts[index] === undefined) {
      if (accounts.length) {
        if (index < accounts.length - 1) {
          selected++
        } else {
          selected--
        }
        changeSelected(selected)
      } else {
        selected = 0
      }
    }
  }

  let viewlets: Map<ActivityKey, TxViewlet[]>

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map()
    for (const res of result) {
      const key = activityKey(res.objectClass, res.txClass)
      const arr = viewlets.get(key) ?? []
      arr.push(res)
      viewlets.set(key, arr)
    }
    viewlets = viewlets
  })

  let selected = 0

  const dispatch = createEventDispatcher()
  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      selected--
      changeSelected(selected)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      selected++
      changeSelected(selected)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      dispatch('open', accounts[selected]._id)
    }
  }
</script>

<div class="inbox-activity">
  <Scroller noStretch>
    {#if loading}
      <Loading />
    {:else}
      {#each accounts as account, i}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <PeopleNotificationView
          value={account}
          items={map.get(account._id) ?? []}
          selected={selected === i}
          {viewlets}
          on:keydown={onKeydown}
          on:open
          on:open={() => {
            selected = i
          }}
        />
      {/each}
    {/if}
  </Scroller>
</div>
