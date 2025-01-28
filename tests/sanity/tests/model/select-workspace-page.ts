import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class SelectWorkspacePage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  title = (): Locator => this.page.locator('div.title', { hasText: 'Select workspace' })
  buttonWorkspace = (): Locator => this.page.locator('div[class*="workspace"]')
  buttonCreateWorkspace = (): Locator => this.page.locator('button > span', { hasText: 'Create workspace' })
  buttonWorkspaceName = (): Locator => this.page.locator('input')
  buttonCreateNewWorkspace = (): Locator => this.page.locator('div.form-row button')
  workspaceButtonByName = (workspace: string): Locator => this.buttonWorkspace().filter({ hasText: workspace })
  createAnotherWorkspace = (): Locator => this.page.getByRole('link', { name: 'Create workspace' })
  workspaceLogo = (): Locator => this.page.getByText('N', { exact: true })
  workspaceList = (workspaceName: string): Locator => this.page.getByRole('button', { name: workspaceName })
  async selectWorkspace (workspace: string): Promise<void> {
    await this.workspaceButtonByName(workspace).click()
  }

  async enterWorkspaceName (workspaceName: string): Promise<void> {
    await this.buttonWorkspaceName().fill(workspaceName)
  }

  async clickCreateWorkspaceLogo (): Promise<void> {
    await this.workspaceLogo().click()
  }

  async createWorkspace (workspaceName: string, worskpaceNew: boolean = true): Promise<void> {
    if (worskpaceNew) {
      await this.buttonCreateWorkspace().waitFor({ state: 'visible' })
      await this.enterWorkspaceName(workspaceName)
      expect(await this.buttonCreateNewWorkspace().isEnabled()).toBe(true)
      await this.buttonCreateNewWorkspace().click()
    } else {
      await this.createAnotherWorkspace().click()
      await this.enterWorkspaceName(workspaceName)
      expect(await this.buttonCreateNewWorkspace().isEnabled()).toBe(true)
      await this.buttonCreateNewWorkspace().click()
    }
  }

  async checkIfWorkspaceExists (workspace: string): Promise<void> {
    await expect(this.workspaceList(workspace)).toBeVisible()
  }
}
