import { test } from '@playwright/test'
import { randomInt } from 'crypto'
import { NotificationPage } from './model/notification-page'
import { PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Notification Filter Tests', () => {
  let numOfTestNotifications = randomInt(5)

  test.beforeEach(async ({ page }) => {
    const notificationPage = new NotificationPage(page)
    await notificationPage.createNotifications(page, numOfTestNotifications)
    await page.goto(`${PlatformURI}/workbench/sanity-ws/notification`)
  })

  test.afterEach(async ({ page }) => {
    const notificationPage = new NotificationPage(page)
    await notificationPage.archiveAllNotifications()
  })

  test.describe('when there are unread notifications', () => {
    test("it should list the notifications when 'unread' toggle is enabled", async ({ page }) => {
      const notificationPage = new NotificationPage(page)
      await notificationPage.toggleNotificationsFilter()
      await notificationPage.checkNotificationsNum(numOfTestNotifications)
    })

    test("it should list all notifications when 'unread' toggle is NOT enabled", async ({ page }) => {
      const notificationPage = new NotificationPage(page)
      await notificationPage.checkNotificationsNum(numOfTestNotifications)
    })
  })

  test.describe('when there are no unread notifications', () => {
    test.beforeEach(async ({ page }) => {
      const notificationPage = new NotificationPage(page)
      await notificationPage.readAllNotifications()
    })

    test("it should not display any notifications when the 'unread' toggle is enabled", async ({ page }) => {
      const notificationPage = new NotificationPage(page)
      await notificationPage.toggleNotificationsFilter()
      await notificationPage.checkNotificationsNum(0)
    })

    test("it should list all notifications when 'unread' toggle is NOT enabled", async ({ page }) => {
      const notificationPage = new NotificationPage(page)
      await notificationPage.checkNotificationsNum(numOfTestNotifications)
    })
  })
})
