import { type Locator, type Page } from '@playwright/test'

export class SelectWorkspacePage {
  readonly page: Page
  readonly buttonWorkspace: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonWorkspace = page.locator('div[class*="workspace"]')
  }

  async selectWorkspace (workspace: string): Promise<void> {
    await this.buttonWorkspace.filter({ hasText: workspace }).click()
  }
}
