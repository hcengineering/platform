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
  import { TxViewlet } from '@hcengineering/activity'
  import { ActivityKey, DisplayTx, newDisplayTx, TxView } from '@hcengineering/activity-resources'
  import core, { Doc, TxCUD, TxProcessor, WithLookup } from '@hcengineering/core'
  import { Notification, NotificationStatus } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { ActionIcon, Component, getPlatformColor, IconBack, IconCheck, IconDelete } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import plugin from '../plugin'

  export let notification: WithLookup<Notification>
  export let viewlets: Map<ActivityKey, TxViewlet>
  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getDisplayTx (notification: WithLookup<Notification>): DisplayTx | undefined {
    let tx = notification.$lookup?.tx
    if (tx) {
      if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
        tx = TxProcessor.extractTx(tx) as TxCUD<Doc>
      }
      return newDisplayTx(tx, hierarchy)
    }
  }

  async function changeState (notification: Notification, status: NotificationStatus): Promise<void> {
    if (notification.status === status) return
    await client.updateDoc(notification._class, notification.space, notification._id, {
      status
    })
  }

  $: displayTx = getDisplayTx(notification)
</script>

{#if displayTx}
  {@const isNew = notification.status !== NotificationStatus.Read}
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <div class="content">
    <div class="flex-row">
      <div class="bottom-divider mb-2">
        <div class="flex-row-center mb-2 mt-2">
          <div class="notify mr-4" style:color={isNew ? getPlatformColor(11) : '#555555'} />
          <div
            class="flex-shrink"
            on:click={() => {
              changeState(notification, NotificationStatus.Read)
            }}
          >
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
          <div class="flex flex-reverse flex-gap-3 flex-grow">
            <ActionIcon
              icon={IconDelete}
              label={plugin.string.Remove}
              size={'medium'}
              action={() => {
                client.remove(notification)
              }}
            />
            <ActionIcon
              icon={isNew ? IconCheck : IconBack}
              iconProps={!isNew ? { kind: 'curve' } : {}}
              label={plugin.string.MarkAsRead}
              size={'medium'}
              action={() => {
                changeState(notification, isNew ? NotificationStatus.Read : NotificationStatus.Notified)
              }}
            />
          </div>
        </div>
      </div>
      <TxView tx={displayTx} {viewlets} showIcon={false} />
    </div>
  </div>
{/if}

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
