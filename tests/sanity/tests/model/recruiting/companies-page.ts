import { expect, type Locator, type Page } from '@playwright/test'
import { NewCompany } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class CompaniesPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly pageHeader = (): Locator =>
    this.page.locator('span[class*="hulyBreadcrumb-label"]', { hasText: 'Companies' })

  readonly buttonCreateNewCompanies = (): Locator =>
    this.page.locator('button[type="submit"] > span', { hasText: 'Company' })

  readonly inputCreateOrganizationModalName = (): Locator =>
    this.page.locator('form[id="contact:string:CreateOrganization"] input[type="text"]')

  readonly inputCreateOrganizationModalCreate = (): Locator =>
    this.page.locator('form[id="contact:string:CreateOrganization"] button[type="submit"]')

  readonly companyByName = (companyName: string): Locator => this.page.locator('tr a', { hasText: companyName })

  async createNewCompany (data: NewCompany): Promise<void> {
    await expect(this.pageHeader()).toBeVisible()
    await this.buttonCreateNewCompanies().click()

    await this.inputCreateOrganizationModalName().fill(data.name)

    if (data.socials != null && data.socials.length !== 0) {
      for (const social of data.socials) {
        await this.addSocialLink(social)
      }
    }

    await this.inputCreateOrganizationModalCreate().click()
  }

  async openCompanyByName (companyName: string): Promise<void> {
    await this.companyByName(companyName).click()
  }

  async checkCompanyNotExist (companyName: string): Promise<void> {
    await expect(this.companyByName(companyName)).toHaveCount(0)
  }
}
