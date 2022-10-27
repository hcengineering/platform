import { Writable } from 'svelte/store'
import { generateId } from '@hcengineering/core'

import { Notification } from './Notification'
import { NotificationPosition } from './NotificationPosition'
import { NotificationSeverity } from './NotificationSeverity'

export const addNotification = (notification: Notification, store: Writable<Notification[]>): void => {
  if (notification === undefined || notification === null) {
    return
  }

  const { update } = store

  const newNotification = {
    severity: NotificationSeverity.Info,
    ...notification,
    id: generateId()
  }

  update((notifications: Notification[]) =>
    [NotificationPosition.TopRight, NotificationPosition.TopLeft].includes(newNotification.position)
      ? [newNotification, ...notifications]
      : [...notifications, newNotification]
  )
}

export const removeNotification = (notificationId: string, { update }: Writable<Notification[]>): void => {
  if (notificationId === '') {
    return
  }

  update((notifications) => notifications.filter(({ id }) => id !== notificationId))
}
