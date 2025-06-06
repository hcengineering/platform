import { expect, type Locator, type Page } from '@playwright/test'
import { NewCompany } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class CompanyDetailsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly inputName = (): Locator => this.page.locator('div.antiEditBox input')
  readonly buttonCompanyDetails = (): Locator => this.page.locator('.popupPanel-body__aside').locator('text=Company')
  readonly buttonLocation = (): Locator =>
    this.page.locator('//span[text()="Location"]/following-sibling::div[1]/button/span')

  readonly addMemberButton = (): Locator =>
    this.page.locator('div.antiSection[id="members"]').locator('[id="contact\\:string\\:AddMember"]')

  readonly selectMember = (memberName: string): Locator => this.page.getByRole('button', { name: memberName })
  readonly member = (memberName: string): Locator =>
    this.page.locator('div.antiSection[id="members"]').getByRole('link', { name: memberName })

  async checkCompany (data: NewCompany): Promise<void> {
    await expect(this.inputName()).toHaveValue(data.name)
    if (data.socials != null) {
      for (const social of data.socials) {
        await this.checkSocialLinks(social.type, social.value)
      }
    }
    if (data.location != null) {
      await expect(this.buttonLocation()).toHaveText(data.location)
    }
  }

  async editCompany (data: NewCompany): Promise<void> {
    await this.inputName().fill(data.name)
    if (data.socials != null && data.socials.length !== 0) {
      for (const social of data.socials) {
        await this.addSocialLink(social)
      }
    }

    if (data.location != null) {
      await this.buttonCompanyDetails().click()
      await this.buttonLocation().click()
      await this.fillToSelectPopup(this.page, data.location)
    }
  }

  async addMember (member: string): Promise<void> {
    await this.addMemberButton().click()
    await this.selectMember(member).click()
    await this.member(member).click()
  }
}
