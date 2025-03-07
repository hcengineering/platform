import { expect, type Locator, type Page } from '@playwright/test'

export class ContactPage {
  page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly appContact = (): Locator => this.page.locator('[id="app-contact\\:string\\:Contacts"]')
  readonly employeeNavElement = (Employee: string): Locator =>
    this.page.locator(`.hulyNavItem-container:has-text("${Employee}")`)

  readonly employeeEntry = (first: string, last: string): Locator =>
    this.page.locator(`td:has-text("${last} ${first}")`)

  async clickAppContact (): Promise<void> {
    await this.appContact().click()
  }

  async clickEmployeeNavElement (Employee: string): Promise<void> {
    await this.employeeNavElement(Employee).click()
  }

  async checkIfPersonIsCreated (first: string, last: string): Promise<void> {
    await expect(this.employeeEntry(first, last)).toBeVisible()
  }
}
