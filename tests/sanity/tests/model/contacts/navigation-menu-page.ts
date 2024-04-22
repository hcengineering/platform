import { type Locator, type Page } from '@playwright/test'

export class ContactsNavigationMenuPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly pageHeader = (): Locator => this.page.locator('a[href$="employees"]', { hasText: 'Employee' })
}
