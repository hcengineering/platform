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
  import { getCurrentLocation, navigate } from '@hcengineering/ui'
  import { askPermission } from '../utils'

  let notifications: BrowserNotification[] = []

  const query = createQuery()
  query.query(
    notification.class.BrowserNotification,
    {
      user: getCurrentAccount()._id,
      status: NotificationStatus.New
    },
    (res) => {
      notifications = res
    }
  )

  const client = getClient()

  $: process(notifications)

  async function process (notifications: BrowserNotification[]): Promise<void> {
    if (notifications.length === 0) return
    await askPermission()
    if ('Notification' in window && Notification?.permission === 'granted') {
      for (const value of notifications) {
        const req: NotificationOptions = {
          body: value.body,
          tag: value._id,
          silent: false
        }
        const notification = new Notification(value.title, req)
        if (value.onClickLocation !== undefined) {
          const loc = getCurrentLocation()
          loc.path.length = 3
          loc.path[2] = value.onClickLocation.path[2]
          if (value.onClickLocation.path[3]) {
            loc.path[3] = value.onClickLocation.path[3]
            if (value.onClickLocation.path[4]) {
              loc.path[4] = value.onClickLocation.path[4]
            }
          }
          loc.query = value.onClickLocation.query
          loc.fragment = value.onClickLocation.fragment
          const onClick = () => {
            navigate(loc)
            window.parent.parent.focus()
          }
          notification.onclick = onClick
        }
        await client.update(value, { status: NotificationStatus.Notified })
      }
    }
  }
</script>
