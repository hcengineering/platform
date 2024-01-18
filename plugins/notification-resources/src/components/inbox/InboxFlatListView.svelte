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
  import { Scroller } from '@hcengineering/ui'
  import { ActivityNotificationViewlet, DisplayInboxNotification } from '@hcengineering/notification'
  import { createEventDispatcher } from 'svelte'
  import { flip } from 'svelte/animate'

  import InboxNotificationPresenter from './InboxNotificationPresenter.svelte'
  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import { deleteInboxNotification } from '../../utils'

  export let notifications: DisplayInboxNotification[] = []
  export let viewlets: ActivityNotificationViewlet[] = []

  const dispatch = createEventDispatcher()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notifyContextsStore = inboxClient.docNotifyContexts

  async function handleCheck (notification: DisplayInboxNotification, isChecked: boolean) {
    if (!isChecked) {
      return
    }

    await deleteInboxNotification(notification)
  }
</script>

<Scroller>
  {#each notifications as notification (notification._id)}
    <div animate:flip={{ duration: 500 }}>
      <div class="notification gap-2 ml-2">
        <!--        <div class="mt-6">-->
        <!--          <CheckBox-->
        <!--            circle-->
        <!--            kind="primary"-->
        <!--            on:value={(event) => {-->
        <!--              handleCheck(notification, event.detail)-->
        <!--            }}-->
        <!--          />-->
        <!--        </div>-->
        <InboxNotificationPresenter
          value={notification}
          {viewlets}
          onClick={() => {
            dispatch('click', {
              context: $notifyContextsStore.find(({ _id }) => _id === notification.docNotifyContext),
              notification
            })
          }}
        />
      </div>
    </div>
  {/each}
</Scroller>

<style lang="scss">
  .notification {
    display: flex;
  }
</style>
