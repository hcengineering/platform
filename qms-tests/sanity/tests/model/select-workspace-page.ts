import { expect, type Locator, type Page } from '@playwright/test'

export class SelectWorkspacePage {
  readonly page: Page
  readonly buttonWorkspace: Locator
  readonly buttonCreateWorkspace: Locator
  readonly inputWorkspaceName: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonWorkspace = page.locator('div[class*="workspace"]')
    this.buttonCreateWorkspace = page.locator('button > span', { hasText: 'Create workspace' })
    this.inputWorkspaceName = page.locator('div.form input')
  }

  async selectWorkspace (workspace: string): Promise<void> {
    await this.buttonWorkspace.filter({ hasText: workspace }).click()
  }

  async createWorkspace (workspaceName: string): Promise<void> {
    await this.buttonCreateWorkspace.waitFor({ state: 'visible' })
    await expect(this.inputWorkspaceName).toBeVisible()
    await this.inputWorkspaceName.fill(workspaceName)
  }
}
