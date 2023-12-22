import { expect, type Locator, type Page } from '@playwright/test'
import { NewCompany } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class CompaniesPage extends CommonRecruitingPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateNewCompanies: Locator
  readonly inputCreateOrganizationModalName: Locator
  readonly inputCreateOrganizationModalCreate: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Companies' })
    this.buttonCreateNewCompanies = page.locator('button[type="submit"] > span', { hasText: 'Company' })
    this.inputCreateOrganizationModalName = page.locator(
      'form[id="contact:string:CreateOrganization"] input[type="text"]'
    )
    this.inputCreateOrganizationModalCreate = page.locator(
      'form[id="contact:string:CreateOrganization"] button[type="submit"]'
    )
  }

  async createNewCompany (data: NewCompany): Promise<void> {
    await expect(this.pageHeader).toBeVisible()
    await this.buttonCreateNewCompanies.click()

    await this.inputCreateOrganizationModalName.fill(data.name)

    if (data.socials != null && data.socials.length !== 0) {
      for (const social of data.socials) {
        await this.addSocialLink(social)
      }
    }

    await this.inputCreateOrganizationModalCreate.click()
  }

  async openCompanyByName (companyName: string): Promise<void> {
    await this.page.locator('tr a', { hasText: companyName }).click()
  }

  async checkCompanyNotExist (companyName: string): Promise<void> {
    await expect(this.page.locator('tr a', { hasText: companyName })).toHaveCount(0)
  }
}
