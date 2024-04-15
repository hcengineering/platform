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
      url: payload.url
    }
  })
})

// Listen for notification click event
self.addEventListener('notificationclick', (event: any) => {
  const clickedNotification = event.notification
  const notificationData = clickedNotification.data
  const notificationUrl = notificationData.url
  const domain = notificationData.domain
  if (notificationUrl !== undefined && domain !== undefined) {
    // Check if any client with the same origin is already open
    event.waitUntil(
      // Check all active clients (browser windows or tabs)
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true
        })
        .then((clientList: any) => {
          // Loop through each client
          for (const client of clientList) {
            // If a client has the same URL origin, focus and navigate to it
            if ((client.url as string)?.startsWith(domain)) {
              client.postMessage({
                type: 'notification-click',
                url: notificationUrl
              })
              return client.focus()
            }
          }
          // If no client with the same URL origin is found, open a new window/tab
          return self.clients.openWindow(notificationUrl)
        })
    )
  }
})
