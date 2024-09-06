import { expect, type Locator } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'

export class AllProjectsPage extends CommonTrackerPage {
  projectTitleCells = (): Locator => this.page.locator('.antiTable-body__row .antiTable-cells__firstCell')

  async checkProjectExistInTable (projectName: string): Promise<void> {
    await expect(this.projectTitleCells().filter({ hasText: projectName })).toBeVisible()
  }

  async checkProjectNotExistInTable (projectName: string): Promise<void> {
    await expect(this.projectTitleCells().filter({ hasText: projectName })).toBeHidden()
  }

  async joinProject (title: string): Promise<void> {
    const projectRow = this.page.locator('.antiTable-body__row', { has: this.page.locator(`td:has-text("${title}")`) })
    const joinButton = projectRow.locator('button:has-text("Join")')
    await joinButton.click()
  }

  async unarchiveProject (title: string): Promise<void> {
    const projectRow = this.page.locator('.antiTable-body__row', { has: this.page.locator(`td:has-text("${title}")`) })
    await projectRow.click({ button: 'right' })
    await this.page.locator('.popup button:has-text("Unarchive")').click()
    await this.page.locator('.popup button:has-text("Ok")').click()
  }

  async checkProjecInTableIsNotArchived (title: string): Promise<void> {
    await this.projectTitleCells().filter({ hasText: title }).filter({ hasNotText: '(archived)' }).waitFor()
  }
}
