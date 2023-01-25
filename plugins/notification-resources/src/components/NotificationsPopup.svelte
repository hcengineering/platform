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
  import activity, { TxViewlet } from '@hcengineering/activity'
  import { activityKey, ActivityKey } from '@hcengineering/activity-resources'
  import { EmployeeAccount } from '@hcengineering/contact'
  import core, { getCurrentAccount, WithLookup } from '@hcengineering/core'
  import { Notification, NotificationStatus } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, IconCheckAll, IconDelete, Scroller, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import Label from '@hcengineering/ui/src/components/Label.svelte'
  import notification from '../plugin'
  import NotificationView from './NotificationView.svelte'

  const query = createQuery()
  let notifications: WithLookup<Notification>[] = []
  const client = getClient()

  $: query.query(
    notification.class.Notification,
    {
      attachedTo: (getCurrentAccount() as EmployeeAccount).employee
    },
    (res) => {
      notifications = res
    },
    {
      sort: {
        '$lookup.tx.modifiedOn': -1
      },
      limit: 30,
      lookup: {
        tx: core.class.TxCUD
      }
    }
  )

  let viewlets: Map<ActivityKey, TxViewlet>

  const descriptors = createQuery()
  $: descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })

  const deleteNotifications = async () => {
    const allNotifications = await client.findAll(notification.class.Notification, {
      attachedTo: (getCurrentAccount() as EmployeeAccount).employee
    })
    for (const n of allNotifications) {
      await client.remove(n)
    }
  }
  const markAsReadNotifications = async () => {
    const allNotifications = await client.findAll(notification.class.Notification, {
      attachedTo: (getCurrentAccount() as EmployeeAccount).employee
    })
    for (const n of allNotifications) {
      if (n.status !== NotificationStatus.Read) {
        await client.updateDoc(n._class, n.space, n._id, {
          status: NotificationStatus.Read
        })
      }
    }
  }
  $: isMobile = $deviceInfo.isMobile
</script>

<div class="notifyPopup" class:justify-center={notifications.length === 0} class:min-w-168={!isMobile}>
  <div class="header flex-between">
    <span class="fs-title overflow-label"><Label label={notification.string.Notifications} /></span>
    {#if notifications.length > 0}
      <div class="buttons-group xxsmall-gap">
        <Button
          icon={IconCheckAll}
          kind={'list'}
          showTooltip={{ label: notification.string.MarkAllAsRead }}
          size={'medium'}
          on:click={markAsReadNotifications}
        />
        <Button
          icon={IconDelete}
          kind={'list'}
          showTooltip={{ label: notification.string.RemoveAll }}
          size={'medium'}
          on:click={deleteNotifications}
        />
      </div>
    {/if}
  </div>
  {#if notifications.length > 0}
    <Scroller padding={'0 .5rem'}>
      {#each notifications as n}
        <NotificationView notification={n} {viewlets} />
      {/each}
    </Scroller>
  {:else}
    <div class="flex-grow flex-center">
      <Label label={notification.string.NoNotifications} />
    </div>
  {/if}
</div>
