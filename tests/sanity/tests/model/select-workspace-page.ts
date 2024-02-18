import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class SelectWorkspacePage extends CommonPage {
  readonly page: Page
  readonly buttonWorkspace: Locator
  readonly buttonCreateWorkspace: Locator
  readonly buttonWorkspaceName: Locator
  readonly buttonCreateNewWorkspace: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonWorkspace = page.locator('div[class*="workspace"]')
    this.buttonCreateWorkspace = page.locator('button > span', { hasText: 'Create workspace' })
    this.buttonWorkspaceName = page.locator('input')
    this.buttonCreateNewWorkspace = page.locator('div.form-row button')
  }

  async selectWorkspace (workspace: string): Promise<void> {
    await this.buttonWorkspace.filter({ hasText: workspace }).click()
  }

  async createWorkspace (workspaceName: string): Promise<void> {
    await this.buttonCreateWorkspace.waitFor({ state: 'visible' })
    await this.buttonWorkspaceName.fill(workspaceName)
    expect(await this.buttonCreateNewWorkspace.isEnabled()).toBe(true)
    await this.buttonCreateNewWorkspace.click()
  }
}
