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
  import { ListView } from '@hcengineering/ui'
  import { ActivityNotificationViewlet, DisplayInboxNotification } from '@hcengineering/notification'
  import { createEventDispatcher } from 'svelte'

  import InboxNotificationPresenter from './InboxNotificationPresenter.svelte'
  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import { deleteInboxNotification } from '../../utils'

  export let notifications: DisplayInboxNotification[] = []
  export let viewlets: ActivityNotificationViewlet[] = []

  const dispatch = createEventDispatcher()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notifyContextsStore = inboxClient.docNotifyContexts

  let list: ListView
  let listSelection = 0
  let element: HTMLDivElement | undefined

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

      const notification = notifications[listSelection]

      deleteInboxNotification(notification)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const notification = notifications[listSelection]
      const context = $notifyContextsStore.find(({ _id }) => _id === notification.docNotifyContext)
      dispatch('click', {
        context,
        notification
      })
    }
  }

  $: if (element) {
    element.focus()
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="root" bind:this={element} tabindex="0" on:keydown={onKeydown}>
  <ListView
    bind:this={list}
    bind:selection={listSelection}
    count={notifications.length}
    noScroll
    colorsSchema="lumia"
    lazy={true}
  >
    <svelte:fragment slot="item" let:item={itemIndex}>
      {@const notification = notifications[itemIndex]}
      <div class="notification gap-2">
        <InboxNotificationPresenter
          value={notification}
          {viewlets}
          withFlatActions
          onClick={() => {
            dispatch('click', {
              context: $notifyContextsStore.find(({ _id }) => _id === notification.docNotifyContext),
              notification
            })
          }}
        />
      </div>
    </svelte:fragment>
  </ListView>
</div>

<style lang="scss">
  .root {
    &:focus {
      outline: 0;
    }
  }

  .notification {
    display: flex;
  }
</style>
