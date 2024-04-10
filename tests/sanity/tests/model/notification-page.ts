import { expect, type Page } from '@playwright/test'
import { PlatformURI, generateId } from '../utils'
import { NewIssue } from './tracker/types'
import { IssuesPage } from './tracker/issues-page'

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

  async toggleNotificationsFilter() {
    await this.page.locator('.toggle').click()
  }

  async checkNotificationsNum(expected: number) {
    await expect(this.page.locator('.list-container > .list-item')).toHaveCount(expected, { timeout: 4000 })
  }

  async createNotifications(page: Page, n = 1) {
    await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`)
    const newIssue: NewIssue = {
      title: `Issue with all parameters and attachments-${generateId()}`,
      description: 'Created issue with all parameters and attachments description',
      status: 'In Progress',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      createLabel: true,
      labels: `CREATE-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
      duedate: 'today',
      filePath: 'cat.jpeg'
    }
    const issuesPage = new IssuesPage(page)
    for (let i = 0; i < n; i++) {
      await issuesPage.createNewIssue(newIssue)
    }
    return n
  }

  async archiveAllNotifications() {
    await this.page.locator('.ac-header button.sh-rectangle-left').click() // toggle actions menu
    await (await this.page.locator('.selectPopup .list-item').last()).click() // click "Archive" button
    await this.page.locator('.msgbox-container button.primary').click() // confirm action
  }

  async readAllNotifications() {
    await this.page.locator('.ac-header button.sh-rectangle-right').click()
  }
}
