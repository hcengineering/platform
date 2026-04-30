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
  workspaceButtonByName = (workspace: string): Locator => this.buttonWorkspace().filter({ hasText: workspace }).first()
  createAnotherWorkspace = (): Locator => this.page.getByRole('link', { name: 'Create workspace' })
  workspaceLogo = (): Locator => this.page.getByText('N', { exact: true })
  workspaceList = (workspaceName: string): Locator => this.page.getByRole('button', { name: workspaceName })

  // Customize step (workspace creation initial-state configuration)
  customizeWorkspaceLink = (): Locator => this.page.getByRole('link', { name: /Customize workspace/i })
  createSampleProjectsToggle = (): Locator =>
    this.page.locator('label', { hasText: 'Create sample projects and demo content' }).locator('input[type="checkbox"]')

  moduleCardByLabel = (label: string): Locator => this.page.locator('.cardBox', { hasText: label })

  customizeDoneButton = (): Locator => this.page.getByRole('button', { name: 'Create workspace' }).last()
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

  /**
   * Creates a workspace via the optional "Customize workspace…" flow.
   * Allows the test to opt out of demo content and/or disable specific modules
   * by their displayed label (e.g. "Tracker", "Drive").
   */
  async createWorkspaceCustomized (
    workspaceName: string,
    options: { withDemoContent?: boolean, disableModuleLabels?: string[] } = {}
  ): Promise<void> {
    await this.buttonCreateWorkspace().waitFor({ state: 'visible' })
    await this.enterWorkspaceName(workspaceName)

    await this.customizeWorkspaceLink().click()

    if (options.withDemoContent === false) {
      const toggle = this.createSampleProjectsToggle()
      // The MiniToggle starts in the "on" state; click only if it's currently checked.
      if (await toggle.isChecked()) {
        await toggle.click()
      }
    }

    for (const label of options.disableModuleLabels ?? []) {
      const card = this.moduleCardByLabel(label)
      await card.waitFor({ state: 'visible' })
      // Each card has a single Disable/Enable button — click toggles state.
      await card.getByRole('button').click()
    }

    await this.customizeDoneButton().click()
  }
}
