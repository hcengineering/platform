import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'
import { Employee } from './types'

export class EmployeeDetailsPage extends CommonPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly textActivity: Locator
  readonly textActivityContent: Locator
  readonly textEmployeeFirstName: Locator
  readonly textEmployeeLastName: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.pageHeader = page.locator('span[class$="title"]', { hasText: 'Employee' })
    this.textActivity = page.locator('div.header')
    this.textActivityContent = page.locator('div.activityMessage div[class*="content"]')
    this.textEmployeeFirstName = page.locator('input[placeholder="First name"]')
    this.textEmployeeLastName = page.locator('input[placeholder="Last name"]')
  }

  async checkActivityExist (activityHeader: string, activityContent: string): Promise<void> {
    await expect(this.textActivity.filter({ hasText: activityHeader }).first()).toBeVisible()
    await expect(this.textActivityContent.filter({ hasText: activityContent }).first()).toBeVisible()
  }

  async checkEmployee (employee: Employee): Promise<void> {
    await expect(this.textEmployeeFirstName).toHaveValue(employee.firstName)
    await expect(this.textEmployeeLastName).toHaveValue(employee.lastName)
  }
}
