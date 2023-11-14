import { expect, type Locator, type Page } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'

export class ApplicationsDetailsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly textApplicationId: Locator
  readonly buttonState: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.textApplicationId = page.locator('div.popupPanel-title div.title.not-active')
    this.buttonState = page
      .locator('div[class*="collapsed-container"]')
      .nth(0)
      .locator('div[class*="aside-grid"] > div:nth-of-type(1) > button')
  }

  async getApplicationId (): Promise<string> {
    const applicationId = await this.textApplicationId.textContent()
    await expect(applicationId !== null).toBeTruthy()
    return applicationId != null ? applicationId : ''
  }

  async changeState (status: string): Promise<void> {
    await this.buttonState.click()
    await this.selectFromDropdown(this.page, status)
    await expect(await this.buttonState).toContainText(status)
  }
}
