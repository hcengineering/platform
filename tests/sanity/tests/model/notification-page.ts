import { expect, type Page } from '@playwright/test'

export class NotificationPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  // TODO: rewrite functions according to new inbox

  async checkNotificationIssue (name: string, assignee: string): Promise<void> {
    const notification = this.page.locator('div[class*="inbox-activity"] span', { hasText: name })
    await expect(notification.locator('xpath=../../..').locator('a span.ap-label')).toHaveText(assignee)
  }

  async checkNotificationCollaborators (name: string, text: string): Promise<void> {
    const notification = this.page.locator('div[class*="inbox-activity"] span', { hasText: name })
    await expect(notification.locator('xpath=../../..').locator('div[class*="title"]')).toHaveText(text)
  }
}
