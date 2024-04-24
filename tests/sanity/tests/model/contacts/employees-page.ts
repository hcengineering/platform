import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class EmployeesPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly pageHeader = (): Locator => this.page.locator('span[class$="title"]', { hasText: 'Employee' })
  readonly employeeName = (employeeName: string): Locator => this.page.locator('tr a', { hasText: employeeName })

  async openEmployeeByName (employeeName: string): Promise<void> {
    await this.employeeName(employeeName).click()
  }
}
