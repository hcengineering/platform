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
  import { Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { ListView, Loading, Scroller } from '@hcengineering/ui'
  import { ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import NotificationView from './NotificationView.svelte'

  export let filter: 'all' | 'read' | 'unread' = 'all'
  const dispatch = createEventDispatcher()

  const query = createQuery()

  let _id: Ref<Doc> | undefined
  let docs: DocUpdates[] = []
  let filtered: DocUpdates[] = []
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
    if (filter === 'read') {
      filtered = docs.filter((p) => !p.txes.some((p) => p.isNew))
    } else if (filter === 'unread') {
      filtered = docs.filter((p) => p.txes.some((p) => p.isNew))
    } else {
      filtered = docs
    }
    listProvider.update(filtered)
    if (loading || _id === undefined) {
      changeSelected(selected)
    } else if (filtered.find((p) => p.attachedTo === _id) === undefined) {
      changeSelected(selected)
    }
  }

  $: getFiltered(docs, filter)

  $: changeSelected(selected)

  function changeSelected (index: number) {
    if (filtered[index] !== undefined) {
      listProvider.updateFocus(filtered[index])
      _id = filtered[index]?.attachedTo
      dispatch('change', filtered[index])
    } else if (filtered.length) {
      if (index < filtered.length - 1) {
        selected++
      } else {
        selected--
      }
    } else {
      selected = 0
      _id = undefined
      dispatch('change', undefined)
    }
  }

  let viewlets: Map<ActivityKey, TxViewlet>

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      const value = selected + offset
      if (filtered[value] !== undefined) {
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
<div class="clear-mins container">
  <Scroller>
    {#if loading}
      <Loading />
    {:else}
      {#each filtered as item, i (item._id)}
        <NotificationView
          value={item}
          selected={selected === i}
          {viewlets}
          on:click={() => {
            selected = i
          }}
        />
      {/each}
    {/if}
  </Scroller>
</div>

<style lang="scss">
  .container {
    margin-top: -0.5rem;
  }
</style>
