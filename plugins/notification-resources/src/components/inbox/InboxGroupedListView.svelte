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
  import { CheckBox, Label, Scroller } from '@hcengineering/ui'
  import { DisplayInboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import { groupByArray, Ref } from '@hcengineering/core'
  import { getDocTitle, getDocIdentifier } from '@hcengineering/view-resources'
  import InboxNotificationPresenter from './InboxNotificationPresenter.svelte'
  import NotifyContextIcon from '../NotifyContextIcon.svelte'
  import NotifyMarker from '../NotifyMarker.svelte'

  export let notifications: DisplayInboxNotification[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notifyContextsStore = inboxClient.docNotifyContexts

  const checkedContexts = new Set<Ref<DocNotifyContext>>()

  let notificationsByContext = new Map<Ref<DocNotifyContext>, DisplayInboxNotification[]>()

  $: notificationsByContext = groupByArray(notifications, ({ docNotifyContext }) => docNotifyContext)

  function handleContextChecked (contextId: Ref<DocNotifyContext>, isChecked: boolean) {
    if (isChecked) {
      checkedContexts.add(contextId)
    } else {
      checkedContexts.delete(contextId)
    }
  }
</script>

<Scroller>
  {#each notificationsByContext as [contextId, contexNotifications]}
    {@const context = $notifyContextsStore.find(({ _id }) => _id === contextId)}
    {@const first = contexNotifications[0]}

    {#if context && first}
      {@const unreadCount = contexNotifications.filter(({ isViewed }) => !isViewed).length}

      <div class="card">
        <div class="header">
          <CheckBox
            checked={checkedContexts.has(contextId)}
            circle
            kind="primary"
            on:value={(event) => {
              handleContextChecked(contextId, event.detail)
            }}
          />
          <NotifyContextIcon {context} />

          <div class="labels">
            {#await getDocIdentifier(client, context.attachedTo, context.attachedToClass) then title}
              {#if title}
                {title}
              {:else}
                <Label label={hierarchy.getClass(context.attachedToClass).label} />
              {/if}
            {/await}
            {#await getDocTitle(client, context.attachedTo, context.attachedToClass) then title}
              <div class="title overflow-label" {title}>
                {title}
              </div>
            {/await}
          </div>
          <NotifyMarker count={unreadCount} />
        </div>
        <div class="notification">
          <InboxNotificationPresenter value={first} embedded skipLabel />
        </div>
      </div>
    {/if}
  {/each}
</Scroller>

<style lang="scss">
  .card {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 1rem;

    .header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .title {
      font-weight: 500;
      max-width: 330px;
    }

    &:hover {
      background-color: var(--highlight-hover);
    }
  }

  .notification {
    margin-top: 1rem;
    margin-left: 5.5rem;
  }
</style>
