import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'
import { Employee } from './types'

export class EmployeeDetailsPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly pageHeader = (): Locator => this.page.locator('span[class$="title"]', { hasText: 'Employee' })
  readonly textActivity = (): Locator => this.page.locator('div.header')
  readonly textActivityContent = (): Locator => this.page.locator('div.activityMessage div[class*="content"]')
  readonly textEmployeeFirstName = (): Locator => this.page.locator('input[placeholder="First name"]')
  readonly textEmployeeLastName = (): Locator => this.page.locator('input[placeholder="Last name"]')

  async checkActivityExist (activityHeader: string, activityContent: string): Promise<void> {
    await expect(this.textActivity().filter({ hasText: activityHeader }).first()).toBeVisible()
    await expect(this.textActivityContent().filter({ hasText: activityContent }).first()).toBeVisible()
  }

  async checkEmployee (employee: Employee): Promise<void> {
    await expect(this.textEmployeeFirstName()).toHaveValue(employee.firstName)
    await expect(this.textEmployeeLastName()).toHaveValue(employee.lastName)
  }
}
