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
  import { ActionIcon, Component, getPlatformColor, IconDelete } from '@anticrm/ui'
  import view from '@anticrm/view'
  import plugin from '../plugin'

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
      on:mouseover|once={() => {
        read(notification)
      }}
    >
      <div class="flex-row">
        <div class="bottom-divider mb-2">
          <div class="flex-row-center mb-2 mt-2">
            <div
              class="notify mr-4"
              style:color={notification.status !== NotificationStatus.Read ? getPlatformColor(11) : '#555555'}
            />
            <!-- <Icon icon={IconArrowRight} size={'medium'} /> -->
            <div class="flex-shrink">
              <Component
                is={view.component.ObjectPresenter}
                props={{
                  objectId: displayTx.tx.objectId,
                  _class: displayTx.tx.objectClass,
                  value: displayTx.doc,
                  inline: true
                }}
              />
            </div>
            <div class="flex flex-reverse gap-2 flex-grow">
              <ActionIcon
                icon={IconDelete}
                label={plugin.string.Remove}
                size={'medium'}
                action={() => {
                  client.remove(notification)
                }}
              />
            </div>
          </div>
        </div>
        <TxView tx={displayTx} {viewlets} showIcon={false} />
      </div>
    </div>
  {/if}
{/await}

<style lang="scss">
  .content {
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }
  .notify {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 0.25rem;
    outline: 1px solid transparent;
    outline-offset: 2px;
    transition: all 0.1s ease-in-out;
    z-index: -1;
    background-color: currentColor;
  }
</style>
