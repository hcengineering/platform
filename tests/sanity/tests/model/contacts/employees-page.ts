import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class EmployeesPage extends CommonPage {
  readonly page: Page
  readonly pageHeader: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.pageHeader = page.locator('span[class$="title"]', { hasText: 'Employee' })
  }

  async openEmployeeByName (employeeName: string): Promise<void> {
    await this.page.locator('tr a', { hasText: employeeName }).click()
  }
}
