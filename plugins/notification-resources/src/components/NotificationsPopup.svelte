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
  import activity, { TxViewlet } from '@anticrm/activity'
  import { activityKey, ActivityKey } from '@anticrm/activity-resources'
  import { EmployeeAccount } from '@anticrm/contact'
  import { getCurrentAccount, SortingOrder } from '@anticrm/core'
  import type { Notification } from '@anticrm/notification'
  import { createQuery } from '@anticrm/presentation'
  import { Scroller } from '@anticrm/ui'
  import Label from '@anticrm/ui/src/components/Label.svelte'
  import notification from '../plugin'
  import NotificationView from './NotificationView.svelte'

  const query = createQuery()
  let notifications: Notification[] = []

  $: query.query(
    notification.class.Notification,
    {
      attachedTo: (getCurrentAccount() as EmployeeAccount).employee
    },
    (res) => {
      notifications = res
    },
    {
      sort: { status: SortingOrder.Ascending, modifiedOn: SortingOrder.Descending }
    }
  )

  let viewlets: Map<ActivityKey, TxViewlet>

  const descriptors = createQuery()
  $: descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })
</script>

<div class="selectPopup notification" class:justify-center={notifications.length === 0}>
  {#if notifications.length > 0}
    <div class="header fs-title pl-4 pb-2">
      <Label label={notification.string.Notifications} />
    </div>
    <Scroller>
      <div class="flex-col px-4 clear-mins">
        {#each notifications as n (n._id)}
          <NotificationView notification={n} {viewlets} />
        {/each}
      </div>
    </Scroller>
  {:else}
    <div class="flex-center h-full">
      <Label label={notification.string.NoNotifications} />
    </div>
  {/if}
</div>

<style lang="scss">
  .notification {
    padding: 0.5rem 0;
    width: fit-content;
    min-width: 16rem;
    min-height: 12rem;
  }
</style>
