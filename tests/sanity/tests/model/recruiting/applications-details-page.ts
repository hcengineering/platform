import { expect, type Locator, type Page } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'

export class ApplicationsDetailsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly textApplicationId = (): Locator =>
    this.page.locator('div.hulyHeader-container div.hulyHeader-titleGroup > *').last()

  readonly buttonState = (): Locator =>
    this.page
      .locator('div[class*="collapsed-container"]')
      .nth(0)
      .locator('div[class*="aside-grid"] > div:nth-of-type(1) > button')

  readonly buttonSelectCollaborators = (): Locator =>
    this.page.locator('xpath=//span[text()="Collaborators"]/..//button')

  async getApplicationId (): Promise<string> {
    const applicationId = await this.textApplicationId().textContent()
    expect(applicationId !== null).toBeTruthy()
    return applicationId ?? ''
  }

  async changeState (status: string): Promise<void> {
    await this.buttonState().click()
    await this.selectFromDropdown(this.page, status)
    await expect(this.buttonState()).toContainText(status)
  }

  async addCollaborators (name: string): Promise<void> {
    await this.buttonSelectCollaborators().click()
    if (name === 'all') {
      const checks = this.page.locator('div.popup button.menu-item')
      const count = await checks.count()
      for (let i = 0; i < count; i++) {
        await checks.nth(i).click()
      }
    } else {
      await this.page.locator('div.popup button.menu-item div.label', { hasText: name }).click()
    }
    await this.buttonSelectCollaborators().press('Escape')
  }

  async waitApplicationDetailsOpened (applicationId: string): Promise<void> {
    await expect(this.textApplicationId()).toHaveText(applicationId)
  }
}
