import { getPersonBySocialId, formatName } from '@hcengineering/contact'
import { Ref, TxOperations } from '@hcengineering/core'
import notification, { DocNotifyContext, CommonInboxNotification, ActivityInboxNotification, InboxNotification } from '@hcengineering/notification'
import { IntlString, addEventListener, translate } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { location } from '@hcengineering/ui'
import workbench, { workbenchId } from '@hcengineering/workbench'
import desktopPreferences, { defaultNotificationPreference } from '@hcengineering/desktop-preferences'
import { activePreferences } from '@hcengineering/desktop-preferences-resources'
import { InboxNotificationsClientImpl, getDisplayInboxData } from '@hcengineering/notification-resources'

import { IPCMainExposed } from './types'

let client: TxOperations

async function hydrateNotificationAsYouCan (lastNotification: InboxNotification): Promise<{ title: string, body: string } | undefined> {
  // Let's try to do our best and figure out from who we have an notification

  if (client === undefined) {
    return undefined
  }

  if (lastNotification === undefined) {
    return undefined
  }

  let intlTitle: IntlString | undefined
  let titleParams

  if (lastNotification._class === notification.class.CommonInboxNotification) {
    intlTitle = (lastNotification as CommonInboxNotification).message
    titleParams = (lastNotification as CommonInboxNotification).props
  } else if (lastNotification._class === notification.class.ActivityInboxNotification) {
    intlTitle = (lastNotification as ActivityInboxNotification).title
    titleParams = (lastNotification as ActivityInboxNotification).intlParams
  }

  if (intlTitle !== undefined && lastNotification.body !== undefined) {
    const intlParams = lastNotification.intlParams ?? {}

    if (lastNotification.intlParamsNotLocalized !== undefined) {
      for (const param in lastNotification.intlParamsNotLocalized) {
        const value = lastNotification.intlParamsNotLocalized[param]
        intlParams[param] = await translate(value, {})
      }
    }
    const title = await translate(intlTitle, titleParams ?? {})
    const body = await translate(lastNotification.body, lastNotification.intlParams ?? {})

    // Do not show notification if there is no translate
    if (title === intlTitle as string || body === lastNotification.body as string) {
      return undefined
    }

    return { title, body }
  }

  const title = await translate(desktopPreferences.string.HaveGotANotification, {})

  // Do not show notification if there is no translate
  if (title === lastNotification.title as string) {
    return undefined
  }

  const noPersonData = {
    title,
    body: ''
  }

  const person = await getPersonBySocialId(client, lastNotification.modifiedBy)
  if (person == null) {
    return noPersonData
  }

  return {
    title,
    body: formatName(person.name)
  }
}

function getLasUnViewedNotification (
  notifications: InboxNotification[],
  notificationHistory: Map<string, number>
): InboxNotification | undefined {
  let lastNotification
  let lastTime = 0

  for (const n of notifications) {
    if (notificationHistory.has(n._id as string)) {
      continue
    }

    const createdOn = n.createdOn ?? n.modifiedOn

    notificationHistory.set(n._id as string, createdOn)

    if (createdOn > lastTime) {
      lastTime = createdOn
      lastNotification = n
    }
  }

  return lastNotification
}

/**
 * @public
 */
export function configureNotifications (): void {
  let preferences = defaultNotificationPreference
  let prevUnViewdNotificationsCount = 0

  // For now we want to track all notifications which happends after the launch
  // because we generate them on a client
  let initTimestamp = 0
  const notificationHistory = new Map<string, number>()

  addEventListener(workbench.event.NotifyConnection, async () => {
    client = getClient()
    const electronAPI: IPCMainExposed = (window as any).electron

    const inboxClient = InboxNotificationsClientImpl.getClient()

    async function handleNotifications (notificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>): Promise<void> {
      const inboxData = await getDisplayInboxData(notificationsByContext)

      if (notificationHistory.size === 0) {
        for (const [, notifications] of inboxData) {
          for (const n of notifications) {
            notificationHistory.set(n._id as string, n.createdOn ?? n.modifiedOn)
          }
        }
      }

      const unViewedNotifications: InboxNotification[] = Array.from(inboxData.values()).flat().filter(({ isViewed }) => !isViewed)
      // const notificationsAfterLaunch = notifications.filter((p) => p.txes.some((p) => p.modifiedOn > initTimestamp))
      // We need to get the most recent notifications

      if (prevUnViewdNotificationsCount !== unViewedNotifications.length) {
        if (preferences.showUnreadCounter) {
          electronAPI.setBadge(unViewedNotifications.length)
        }
        if (preferences.bounceAppIcon) {
          electronAPI.dockBounce()
        }
        prevUnViewdNotificationsCount = unViewedNotifications.length
      }

      const notification = getLasUnViewedNotification(unViewedNotifications, notificationHistory)

      if (preferences.showNotifications && initTimestamp > 0 && notification !== undefined) {
        // const notification = notificationsAfterLaunch[notificationsAfterLaunch.length - 1]
        const notificationData = await hydrateNotificationAsYouCan(notification)
        if (notificationData !== undefined) {
          if (notificationData.body === '') {
            notificationData.body = await translate(desktopPreferences.string.TotalNotificationsCount, {
              count: prevUnViewdNotificationsCount
            })
          }

          electronAPI.sendNotification({
            silent: !preferences.playSound,
            ...notificationData
          })
        }
      }

      if (initTimestamp === 0) {
        initTimestamp = Date.now()
      }
    }

    inboxClient.inboxNotificationsByContext.subscribe(data => {
      void handleNotifications(data)
    })

    activePreferences.subscribe((newPreferences) => {
      if (preferences.showUnreadCounter && !newPreferences.showUnreadCounter) {
        electronAPI.setBadge(0)
      }
      if (!preferences.showUnreadCounter && newPreferences.showUnreadCounter) {
        electronAPI.setBadge(prevUnViewdNotificationsCount)
      }
      preferences = newPreferences
    })
  })

  addEventListener(workbench.event.NotifyTitle, async (event, title: string) => {
    ;((window as any).electron as IPCMainExposed).setTitle(title)
  })

  location.subscribe((location) => {
    if (!(location.path[0] === workbenchId || location.path[0] === workbench.component.WorkbenchApp)) {
      // We need to clear badge
      ;((window as any).electron as IPCMainExposed).setBadge(0)
    }
  })
}
