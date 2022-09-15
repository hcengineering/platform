<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact, { EmployeeAccount } from '@anticrm/contact'
  import { Doc, getCurrentAccount, Ref, Space } from '@anticrm/core'
  import {
    Notification as PlatformNotification,
    NotificationProvider,
    NotificationSetting,
    NotificationStatus,
    NotificationType
  } from '@anticrm/notification'
  import { createQuery } from '@anticrm/presentation'
  import { getCurrentLocation } from '@anticrm/ui'
  import notification from '../plugin'
  import { NotificationClientImpl } from '../utils'

  const query = createQuery()
  const settingQuery = createQuery()
  const providersQuery = createQuery()
  const accountId = getCurrentAccount()._id
  const space = accountId as string as Ref<Space>
  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()
  const lastViewId: Ref<Doc> = ((getCurrentAccount() as EmployeeAccount).employee + 'notification') as Ref<Doc>

  let settingsReceived = false
  let settings: Map<Ref<NotificationType>, NotificationSetting> = new Map<Ref<NotificationType>, NotificationSetting>()
  let provider: NotificationProvider | undefined

  $: enabled = 'Notification' in window && Notification?.permission !== 'denied'

  $: enabled &&
    providersQuery.query(
      notification.class.NotificationProvider,
      { _id: notification.ids.BrowserNotification },
      (res) => {
        provider = res[0]
      }
    )

  $: enabled &&
    settingQuery.query(
      notification.class.NotificationSetting,
      {
        space
      },
      (res) => {
        settings = new Map(
          res.map((setting) => {
            return [setting.type, setting]
          })
        )
        settingsReceived = true
      }
    )

  const alreadyShown = new Set<Ref<PlatformNotification>>()

  $: enabled &&
    settingsReceived &&
    provider !== undefined &&
    query.query(
      notification.class.Notification,
      {
        attachedTo: (getCurrentAccount() as EmployeeAccount).employee,
        status: NotificationStatus.New
      },
      (res) => {
        process(res.reverse())
      },
      {
        sort: {
          modifiedOn: 1
        }
      }
    )

  async function process (notifications: PlatformNotification[]): Promise<void> {
    for (const notification of notifications) {
      await tryNotify(notification)
    }
  }

  async function tryNotify (notification: PlatformNotification): Promise<void> {
    const text = notification.text.replace(/<[^>]*>/g, '').trim()
    if (text === '') return
    const setting = settings.get(notification.type)
    const enabled = setting?.enabled ?? provider?.default
    if (!enabled) return
    if ((setting?.modifiedOn ?? notification.modifiedOn) < 0) return

    if (Notification?.permission !== 'granted') {
      await Notification?.requestPermission()
    }

    if (Notification?.permission === 'granted') {
      await notify(text, notification)
    }
  }

  let clearTimer: number | undefined

  async function notify (text: string, notifyInstance: PlatformNotification): Promise<void> {
    if (alreadyShown.has(notifyInstance._id)) {
      return
    }
    alreadyShown.add(notifyInstance._id)

    if (clearTimer) {
      clearTimeout(clearTimer)
    }

    clearTimer = setTimeout(() => {
      alreadyShown.clear()
    }, 5000)

    const lastView = $lastViews.get(lastViewId)
    if ((lastView ?? notifyInstance.modifiedOn) > 0) {
      // eslint-disable-next-line
      new Notification(getCurrentLocation().path[1], { tag: notifyInstance._id, icon: '/favicon.png', body: text })
      await notificationClient.updateLastView(
        lastViewId,
        contact.class.Employee,
        notifyInstance.modifiedOn,
        lastView === undefined
      )
    }
  }
</script>
