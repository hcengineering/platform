import { expect, type Locator, type Page } from '@playwright/test'
import { NewCompany } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class CompanyDetailsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly inputName: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputName = page.locator('div.antiEditBox input')
  }

  async checkCompany (data: NewCompany): Promise<void> {
    await expect(this.inputName).toHaveValue(data.name)
    if (data.socials != null) {
      for (const social of data.socials) {
        await this.checkSocialLinks(social.type, social.value)
      }
    }
  }
}
