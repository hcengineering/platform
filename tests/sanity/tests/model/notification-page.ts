import { expect, type Page, Locator } from '@playwright/test'

export class NotificationPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  notificationLocator = (name: string): Locator =>
    this.page.locator('div[class*="inbox-activity"] span', { hasText: name })

  async clickOnNotification (name: string): Promise<void> {
    await this.notificationLocator(name).click()
  }

  async checkNotificationIssue (name: string, assignee: string): Promise<void> {
    const notification = this.notificationLocator(name)
    await expect(notification.locator('xpath=../../..').locator('a span.ap-label')).toHaveText(assignee)
  }

  async checkNotificationCollaborators (name: string, text: string): Promise<void> {
    const notification = this.notificationLocator(name)
    await expect(notification.locator('xpath=../../..').locator('div[class*="title"]')).toHaveText(text)
  }
}
