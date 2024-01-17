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
  import { ActivityNotificationViewlet, DisplayInboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import { groupByArray, Ref } from '@hcengineering/core'
  import { flip } from 'svelte/animate'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import DocNotifyContextCard from '../DocNotifyContextCard.svelte'
  import { deleteContextNotifications } from '../../utils'

  export let notifications: DisplayInboxNotification[] = []
  export let viewlets: ActivityNotificationViewlet[] = []

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notifyContextsStore = inboxClient.docNotifyContexts

  let displayNotificationsByContext = new Map<Ref<DocNotifyContext>, DisplayInboxNotification[]>()

  $: displayNotificationsByContext = groupByArray(notifications, ({ docNotifyContext }) => docNotifyContext)

  async function handleCheck (context: DocNotifyContext, isChecked: boolean) {
    if (!isChecked) {
      return
    }

    await deleteContextNotifications(context)
  }
</script>

{#each displayNotificationsByContext as [contextId, contextNotifications] (contextId)}
  <div animate:flip={{ duration: 500 }}>
    {#if contextNotifications.length}
      {@const context = $notifyContextsStore.find(({ _id }) => _id === contextId)}

      {#if context}
        <DocNotifyContextCard
          value={context}
          notifications={contextNotifications}
          {viewlets}
          on:click
          on:check={(event) => handleCheck(context, event.detail)}
        />
        <div class="separator" />
      {/if}
    {/if}
  </div>
{/each}

<style lang="scss">
  .separator {
    width: 100%;
    height: 1px;
    background-color: var(--theme-navpanel-border);
  }
</style>
