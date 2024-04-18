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
  import { getCurrentAccount } from '@hcengineering/core'
  import notification, { BrowserNotification, NotificationStatus } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { checkPermission, pushAllowed, subscribePush } from '../utils'
  import { NotificationSeverity, addNotification } from '@hcengineering/ui'
  import Notification from './Notification.svelte'

  async function check (allowed: boolean) {
    if (allowed) {
      query.unsubscribe()
      return
    }
    const res = await checkPermission(true)
    if (res) {
      query.unsubscribe()
      return
    }
    const isSubscribed = await subscribePush()
    if (isSubscribed) {
      query.unsubscribe()
      return
    }
    query.query(
      notification.class.BrowserNotification,
      {
        user: getCurrentAccount()._id,
        status: NotificationStatus.New,
        createdOn: { $gt: Date.now() }
      },
      (res) => {
        if (res.length > 0) {
          notify(res[0])
        }
      }
    )
  }

  const client = getClient()

  async function notify (value: BrowserNotification): Promise<void> {
    addNotification(value.title, value.body, Notification, { value }, NotificationSeverity.Info)
    await client.update(value, { status: NotificationStatus.Notified })
  }

  const query = createQuery()

  $: check($pushAllowed)
</script>
