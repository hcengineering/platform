import { expect, type Locator, type Page } from '@playwright/test'

export class InboxPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly taskName = (taskName: string): Locator => this.page.getByRole('paragraph').getByTitle(taskName)
  readonly toDoName = (): Locator => this.page.getByRole('paragraph')
  readonly leftSidePanelOpen = (): Locator => this.page.locator('#btnPAside')
  readonly leftSidePanelClose = (): Locator => this.page.locator('#btnPClose')
  readonly inboxChat = (text: string): Locator => this.page.getByText(text)
  readonly issueTitle = (issueTitle: string): Locator => this.page.getByText(issueTitle).first()

  // ACTIONS

  async clickOnTask (taskName: string): Promise<void> {
    await this.taskName(taskName).click()
  }

  async clickOnToDo (toDoName: string): Promise<void> {
    await this.toDoName().filter({ hasText: toDoName }).click()
  }

  async clickLeftSidePanelOpen (): Promise<void> {
    await this.leftSidePanelOpen().click()
  }

  async clickCloseLeftSidePanel (): Promise<void> {
    await this.leftSidePanelClose().click()
  }

  async checkIfTaskIsPresentInInbox (toDoText: string): Promise<void> {
    await expect(this.toDoName()).toContainText(toDoText)
  }

  async clickOnInboxChat (text: string): Promise<void> {
    await this.inboxChat(text).click()
  }

  async clickOnInboxFilter (text: string): Promise<void> {
    await this.inboxChat(text).click()
  }

  async checkIfIssueIsPresentInInbox (issueTitle: string): Promise<void> {
    await expect(this.issueTitle(issueTitle)).toBeVisible()
  }

  async clickIssuePresentInInbox (issueTitle: string): Promise<void> {
    await this.issueTitle(issueTitle).click()
  }

  async checkIfInboxChatExists (text: string, exists: boolean): Promise<void> {
    if (exists) {
      await expect(this.inboxChat(text)).toBeVisible()
    } else {
      await expect(this.inboxChat(text)).not.toBeVisible()
    }
  }

  async checkIfTextInChatIsPresent (text: string): Promise<void> {
    await expect(this.inboxChat(text).nth(1)).toBeVisible()
  }
}
