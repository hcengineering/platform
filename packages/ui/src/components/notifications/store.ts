import { writable } from 'svelte/store'
import { getContext } from 'svelte'

import { Notification } from './Notification'
import { addNotification, removeNotification } from './actions'

const store = writable<Notification[]>([])

interface NotificationsContext {
  subscribe: typeof store.subscribe
  addNotification: (notification: Notification) => void
  removeNotification: (notificationId: string) => void
}

export const notificationsContextKey = 'notifications-context'
export const getNotificationsContext = (): NotificationsContext => getContext(notificationsContextKey)

export default {
  subscribe: store.subscribe,
  addNotification: (notification: Notification) => addNotification(notification, store),
  removeNotification: (notificationId: string) => removeNotification(notificationId, store)
}
