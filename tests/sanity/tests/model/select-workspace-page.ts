import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class SelectWorkspacePage extends CommonPage {
  readonly page: Page
  readonly buttonWorkspace: Locator
  readonly buttonCreateWorkspace: Locator
  readonly inputCreateWorkspaceName: Locator
  readonly buttonCreateNewWorkspace: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonWorkspace = page.locator('div[class*="workspace"]')
    this.buttonCreateWorkspace = page.locator('button.primary')
    this.inputCreateWorkspaceName = page.locator('input[type="text"]')
    this.buttonCreateNewWorkspace = page.locator('button.contrast')
  }

  async selectWorkspace (workspace: string): Promise<void> {
    await this.buttonWorkspace.filter({ hasText: workspace }).click()
  }

  async createWorkspace (workspaceName: string): Promise<void> {
    await this.inputCreateWorkspaceName.fill(workspaceName)
    await this.buttonCreateNewWorkspace.click()
  }
}
