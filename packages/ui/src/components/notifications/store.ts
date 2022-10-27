import { writable } from 'svelte/store'

import { Notification } from './Notification'
import { addNotification, removeNotification } from './actions'

const store = writable<Notification[]>([])

export default {
  subscribe: store.subscribe,
  addNotification: (notification: Notification) => addNotification(notification, store),
  removeNotification: (notificationId: string) => removeNotification(notificationId, store)
}
