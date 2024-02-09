import { type Locator, type Page } from '@playwright/test'

export class ContactsNavigationMenuPage {
  readonly page: Page
  readonly buttonEmployee: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonEmployee = page.locator('a[href$="employees"]', { hasText: 'Employee' })
  }
}
