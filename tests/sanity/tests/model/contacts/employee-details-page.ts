import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class EmployeeDetailsPage extends CommonPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly textActivity: Locator
  readonly textActivityContent: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.pageHeader = page.locator('span[class$="title"]', { hasText: 'Employee' })
    this.textActivity = page.locator('div.header')
    this.textActivityContent = page.locator('div.activityMessage div.content div[class*="content"]')
  }

  async checkActivityExist (activityHeader: string, activityContent: string): Promise<void> {
    await expect(this.textActivity.filter({ hasText: activityHeader }).first()).toBeVisible()
    await expect(this.textActivityContent.filter({ hasText: activityContent }).first()).toBeVisible()
  }
}
