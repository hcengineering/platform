import type { PushData } from './index'

declare const self: any

interface PushEvent extends Event {
  data: PushMessageData
}

interface PushMessageData {
  json: () => any
}

self.addEventListener('push', (event: PushEvent) => {
  const payload: PushData = event.data.json()
  self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon,
    tag: payload.tag,
    data: {
      domain: payload.domain,
      url: payload.url,
      notificationId: payload.tag
    }
  })
})

async function handleNotificationClick (event: any): Promise<void> {
  event.notification.close()
  const clickedNotification = event.notification
  const notificationData = clickedNotification.data
  const notificationId = notificationData.notificationId
  const notificationUrl = notificationData.url
  const domain = notificationData.domain

  if (notificationUrl !== undefined && domain !== undefined) {
    const windowClients = (await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })) as ReadonlyArray<any>

    const targetUrl = new URL(notificationUrl)
    for (const client of windowClients) {
      const clientUrl = new URL(client.url, self.location.href)
      if (decodeURI(clientUrl.pathname) === targetUrl.pathname) {
        client.postMessage({
          type: 'notification-click',
          url: notificationUrl,
          _id: notificationId
        })
        await client.focus()
        return
      }
    }

    for (const client of windowClients) {
      if ((client.url as string)?.startsWith(domain)) {
        client.postMessage({
          type: 'notification-click',
          url: notificationUrl,
          _id: notificationId
        })
        await client.focus()
        return
      }
    }

    console.log('No matching client found')
    // If no client with the same URL origin is found, open a new window/tab
    await self.clients.openWindow(notificationUrl)
  }
}

self.addEventListener('notificationclick', (e: any) => e.waitUntil(handleNotificationClick(e)))
