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
  import notification from '@hcengineering/notification'
  import { getMetadata } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { getCurrentLocation, navigate, parseLocation } from '@hcengineering/ui'

  const client = getClient()

  const publicKey = getMetadata(notification.metadata.PushPublicKey)

  async function subscribe (): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window && publicKey !== undefined) {
      try {
        const loc = getCurrentLocation()
        const registration = await navigator.serviceWorker.register('/serviceWorker.js', {
          scope: `./${loc.path[0]}/${loc.path[1]}`
        })
        const current = await registration.pushManager.getSubscription()
        if (current == null) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey
          })
          await client.createDoc(notification.class.PushSubscription, notification.space.Notifications, {
            user: getCurrentAccount()._id,
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth'))
            }
          })
        } else {
          const exists = await client.findOne(notification.class.PushSubscription, {
            user: getCurrentAccount()._id,
            endpoint: current.endpoint
          })
          if (exists === undefined) {
            await client.createDoc(notification.class.PushSubscription, notification.space.Notifications, {
              user: getCurrentAccount()._id,
              endpoint: current.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(current.getKey('p256dh')),
                auth: arrayBufferToBase64(current.getKey('auth'))
              }
            })
          }
        }
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'notification-click') {
            const { url } = event.data
            if (url !== undefined) {
              navigate(parseLocation(new URL(url)))
            }
          }
        })
      } catch (err) {
        console.error('Service Worker registration failed:', err)
      }
    }
  }

  function arrayBufferToBase64 (buffer: ArrayBuffer | null): string {
    if (buffer) {
      const bytes = new Uint8Array(buffer)
      const array = Array.from(bytes)
      const binary = String.fromCharCode.apply(null, array)
      return btoa(binary)
    } else {
      return ''
    }
  }

  subscribe()
</script>
