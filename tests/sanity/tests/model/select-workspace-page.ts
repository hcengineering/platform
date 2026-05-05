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
  // The primary submit button lives in `.form-row.send` (Form.svelte). Without
  // the `.send` qualifier the locator also matches the secondary "Customize
  // workspace…" button which now sits in its own `.form-row`, breaking
  // strict-mode resolution.
  buttonCreateNewWorkspace = (): Locator => this.page.locator('div.form-row.send button')
  workspaceButtonByName = (workspace: string): Locator => this.buttonWorkspace().filter({ hasText: workspace }).first()
  createAnotherWorkspace = (): Locator => this.page.getByRole('link', { name: 'Create workspace' })
  workspaceLogo = (): Locator => this.page.getByText('N', { exact: true })
  workspaceList = (workspaceName: string): Locator => this.page.getByRole('button', { name: workspaceName })

  // Customize step (workspace creation initial-state configuration).
  // Customize is now a regular secondary form button rather than a bottom link.
  customizeWorkspaceLink = (): Locator => this.page.getByRole('button', { name: /Customize workspace/i })
  // Demo-content row is a `.config-row` <label> wrapping the row label and a
  // Toggle (which itself renders <input type="checkbox">). The locator picks
  // the row by its text, then drills to the checkbox inside.
  createSampleProjectsToggle = (): Locator =>
    this.page
      .locator('label.config-row', { hasText: 'Create sample projects and demo content' })
      .locator('input[type="checkbox"]')

  // Module cards are rendered via the shared `.plugin-card` component (in
  // compact mode here). Each card hosts a Toggle on the right.
  moduleCardByLabel = (label: string): Locator => this.page.locator('.plugin-card', { hasText: label })

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
      // The Toggle starts in the "on" state; click only if it's currently checked.
      // The underlying <input type="checkbox"> is visually hidden (width: 1px,
      // replaced by a styled span), so a regular click is rejected as
      // not-actionable. `force: true` bypasses the visibility check; the
      // checkbox state still flips correctly through the bound handler.
      if (await toggle.isChecked()) {
        await toggle.click({ force: true })
      }
    }

    for (const label of options.disableModuleLabels ?? []) {
      const card = this.moduleCardByLabel(label)
      await card.waitFor({ state: 'visible' })
      // Each card has a single Toggle (<input type="checkbox">) — click flips it.
      // Same visibility caveat as above; use force to click the hidden input.
      // The card may also contain an info (?) <button>, so we target the toggle
      // checkbox specifically rather than the first interactive element.
      await card.locator('input[type="checkbox"]').click({ force: true })
    }

    await this.customizeDoneButton().click()
  }
}
