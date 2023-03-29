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
  import contact, { EmployeeAccount } from '@hcengineering/contact'
  import { Doc, getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import {
    Notification as PlatformNotification,
    NotificationProvider,
    NotificationSetting,
    NotificationStatus,
    NotificationType
  } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { getCurrentLocation, showPanel } from '@hcengineering/ui'
  import view from '@hcengineering/view'
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
        status: { $nin: [NotificationStatus.Read] }
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
  const client = getClient()

  let clearTimer: number | undefined

  async function notify (text: string, notifyInstance: PlatformNotification): Promise<void> {
    if (notifyInstance.status !== NotificationStatus.New) {
      return
    }
    if (alreadyShown.has(notifyInstance._id)) {
      return
    }
    alreadyShown.add(notifyInstance._id)

    client.updateDoc(notifyInstance._class, notifyInstance.space, notifyInstance._id, {
      status: NotificationStatus.Notified
    })

    if (clearTimer) {
      clearTimeout(clearTimer)
    }

    clearTimer = setTimeout(() => {
      alreadyShown.clear()
    }, 5000)

    const lastView = $lastViews[lastViewId]
    if ((lastView ?? notifyInstance.modifiedOn) > 0) {
      await notificationClient.updateLastView(
        lastViewId,
        contact.class.Employee,
        notifyInstance.modifiedOn,
        lastView === undefined
      )
    }

    // eslint-disable-next-line
    const notification = new Notification(getCurrentLocation().path[1], {
      tag: notifyInstance._id,
      icon: '/favicon.png',
      body: text
    })

    notification.onclick = () => {
      if (notifyInstance.action !== undefined) {
        showPanel(
          notifyInstance.action.component,
          notifyInstance.action.objectId,
          notifyInstance.action.objectClass,
          'content'
        )
      } else {
        showPanel(view.component.EditDoc, notifyInstance.attachedTo, notifyInstance.attachedToClass, 'content')
      }
    }
  }
</script>
