<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import notification, {
    ActivityNotificationViewlet,
    DisplayInboxNotification,
    DocNotifyContext
  } from '@hcengineering/notification'
  import { Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { ListView } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import DocNotifyContextCard from '../DocNotifyContextCard.svelte'
  import { archiveContextNotifications, notificationsComparator, unarchiveContextNotifications } from '../../utils'
  import { InboxData } from '../../types'

  export let data: InboxData
  export let selectedContext: Ref<DocNotifyContext> | undefined
  export let archived = false

  const client = getClient()
  const dispatch = createEventDispatcher()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByIdStore = inboxClient.contextById

  let list: ListView
  let listSelection = 0
  let element: HTMLDivElement | undefined

  let displayData: [Ref<DocNotifyContext>, DisplayInboxNotification[]][] = []
  let viewlets: ActivityNotificationViewlet[] = []

  void client.findAll(notification.class.ActivityNotificationViewlet, {}).then((res) => {
    viewlets = res
  })

  $: updateDisplayData(data)

  function updateDisplayData (data: InboxData): void {
    displayData = Array.from(data.entries()).sort(([, notifications1], [, notifications2]) =>
      notificationsComparator(notifications1[0], notifications2[0])
    )
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection + 1)
    }
    if (key.code === 'Backspace') {
      key.preventDefault()
      key.stopPropagation()

      const contextId = displayData[listSelection]?.[0]
      const context = $contextByIdStore.get(contextId)

      if (archived) {
        void unarchiveContextNotifications(context)
      } else {
        void archiveContextNotifications(context)
      }
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const contextId = displayData[listSelection]?.[0]
      const context = $contextByIdStore.get(contextId)

      dispatch('click', { context })
    }
  }

  $: if (element != null) {
    element.focus()
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="root" bind:this={element} tabindex="0" on:keydown={onKeydown}>
  <ListView
    bind:this={list}
    bind:selection={listSelection}
    count={displayData.length}
    highlightIndex={displayData.findIndex(([context]) => context === selectedContext)}
    noScroll
    kind="full-size"
    colorsSchema="lumia"
    lazy={true}
  >
    <svelte:fragment slot="item" let:item={itemIndex}>
      {@const contextId = displayData[itemIndex][0]}
      {@const contextNotifications = displayData[itemIndex][1]}
      {@const context = $contextByIdStore.get(contextId)}
      {#if context}
        <DocNotifyContextCard
          value={context}
          notifications={contextNotifications}
          {archived}
          {viewlets}
          on:click={(event) => {
            dispatch('click', event.detail)
            listSelection = itemIndex
          }}
        />
      {/if}
    </svelte:fragment>
  </ListView>
</div>

<style lang="scss">
  .root {
    &:focus {
      outline: 0;
    }
  }
</style>
