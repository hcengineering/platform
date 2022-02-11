<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { TxViewlet } from '@anticrm/activity'
  import { ActivityKey, DisplayTx, getCollectionTx, newDisplayTx, TxView } from '@anticrm/activity-resources'
  import core, { AttachedDoc, Doc, TxCollectionCUD } from '@anticrm/core'
  import { Notification, NotificationStatus } from '@anticrm/notification'
  import { getClient } from '@anticrm/presentation'

  export let notification: Notification
  export let viewlets: Map<ActivityKey, TxViewlet>
  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function getDisplayTx (notification: Notification): Promise<DisplayTx | undefined> {
    let tx = await client.findOne(core.class.TxCUD, { _id: notification.tx })
    if (tx === undefined) return
    if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
      tx = getCollectionTx(tx as TxCollectionCUD<Doc, AttachedDoc>)
    }
    return newDisplayTx(tx, hierarchy)
  }

  async function read (notification: Notification): Promise<void> {
    if (notification.status === NotificationStatus.Read) return
    await client.updateDoc(notification._class, notification.space, notification._id, {
      status: NotificationStatus.Read
    })
  }
</script>

{#await getDisplayTx(notification) then displayTx}
  {#if displayTx}
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <div
      class="content"
      class:isNew={notification.status !== NotificationStatus.Read}
      on:mouseover|once={() => {
        read(notification)
      }}
    >
      <TxView
        tx={displayTx}
        {viewlets}
        showIcon={false}
      />
    </div>
  {/if}
{/await}

<style lang="scss">
  .content {
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }
  .isNew {
    border: 1px solid var(--theme-bg-focused-border);
  }
</style>
