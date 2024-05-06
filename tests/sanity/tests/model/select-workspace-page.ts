import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class SelectWorkspacePage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  buttonWorkspace = (): Locator => this.page.locator('div[class*="workspace"]')
  buttonCreateWorkspace = (): Locator => this.page.locator('button > span', { hasText: 'Create workspace' })
  buttonWorkspaceName = (): Locator => this.page.locator('input')
  buttonCreateNewWorkspace = (): Locator => this.page.locator('div.form-row button')

  workspaceButtonByName = (workspace: string): Locator => this.buttonWorkspace().filter({ hasText: workspace })

  async selectWorkspace (workspace: string): Promise<void> {
    await this.workspaceButtonByName(workspace).click()
  }

  async enterWorkspaceName (workspaceName: string): Promise<void> {
    await this.buttonWorkspaceName().fill(workspaceName)
  }

  async createWorkspace (workspaceName: string): Promise<void> {
    await this.buttonCreateWorkspace().waitFor({ state: 'visible' })
    await this.enterWorkspaceName(workspaceName)
    expect(await this.buttonCreateNewWorkspace().isEnabled()).toBe(true)
    await this.buttonCreateNewWorkspace().click()
  }
}
