import { type Locator, type Page } from '@playwright/test'

export class LeftSideMenuPage {
  readonly page: Page
  readonly buttonChunter: Locator
  readonly buttonContacts: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonChunter = page.locator('button[id$="ApplicationLabelChunter"]')
    this.buttonContacts = page.locator('button[id$="Contacts"]')
  }
}
