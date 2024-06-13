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
}
