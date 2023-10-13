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
  import { Loading, Scroller } from '@hcengineering/ui'
  import { ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import NotificationView from './NotificationView.svelte'

  export let filter: 'all' | 'read' | 'unread' = 'all'
  export let _id: Ref<Doc> | undefined
  const dispatch = createEventDispatcher()

  const query = createQuery()

  let docs: DocUpdates[] = []
  let filtered: DocUpdates[] = []
  let loading = true
  let previousFilter: 'all' | 'read' | 'unread' = filter

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
      filtered = docs.filter((p) => !p.txes.some((p) => p.isNew) && p.txes.length > 0)
    } else if (filter === 'unread') {
      const current = previousFilter === 'unread' ? new Set(filtered.map((p) => p._id)) : new Set()
      filtered = docs.filter((p) => (current.has(p._id) || p.txes.some((p) => p.isNew)) && p.txes.length > 0)
    } else {
      filtered = docs.filter((p) => p.txes.length > 0)
    }
    previousFilter = filter
    listProvider.update(filtered)
    if (_id === undefined) {
      changeSelected(selected)
    } else {
      const index = filtered.findIndex((p) => p.attachedTo === _id)
      if (index === -1) {
        changeSelected(selected)
      } else {
        selected = index
        changeSelected(selected)
        markAsRead(selected)
      }
    }
  }

  $: getFiltered(docs, filter)

  function markAsRead (index: number) {
    if (filtered[index] !== undefined) {
      filtered[index].txes.forEach((p) => (p.isNew = false))
      filtered[index].txes = filtered[index].txes
      filtered = filtered
    }
  }

  function changeSelected (index: number) {
    if (filtered[index] !== undefined) {
      listProvider.updateFocus(filtered[index])
      _id = filtered[index]?.attachedTo
      dispatch('change', filtered[index])
      markAsRead(index)
    } else if (filtered.length) {
      if (index < filtered.length - 1) {
        selected++
      } else {
        selected--
      }
      changeSelected(selected)
    } else {
      selected = 0
      _id = undefined
      dispatch('change', undefined)
    }
  }

  let viewlets: Map<ActivityKey, TxViewlet[]>

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      let value = (of != null ? filtered.findIndex((p) => p._id === of._id) : selected) ?? -1
      if (value === -1) {
        // keep the current index if the document does not exist anymore
        value = selected
      } else {
        value += offset
      }

      if (value < 0) {
        value = 0
      }
      if (value >= filtered.length) {
        value = filtered.length - 1
      }

      if (filtered[value] !== undefined) {
        selected = value
        changeSelected(selected)
      }
    }
  })

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
      // dispatch('open', selected)
    }
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="inbox-activity">
  <Scroller noStretch>
    {#if loading}
      <Loading />
    {:else}
      {#each filtered as item, i (item._id)}
        <NotificationView
          value={item}
          selected={selected === i}
          {viewlets}
          on:keydown={onKeydown}
          on:click={() => {
            selected = i
            changeSelected(selected)
          }}
        />
      {/each}
    {/if}
  </Scroller>
</div>
