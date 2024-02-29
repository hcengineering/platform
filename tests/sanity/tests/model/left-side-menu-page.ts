import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class LeftSideMenuPage extends CommonPage {
  readonly page: Page
  readonly buttonChunter: Locator
  readonly buttonContacts: Locator
  readonly buttonTracker: Locator
  readonly buttonNotification: Locator
  readonly buttonDocuments: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonChunter = page.locator('button[id$="ApplicationLabelChunter"]')
    this.buttonContacts = page.locator('button[id$="Contacts"]')
    this.buttonTracker = page.locator('button[id$="TrackerApplication"]')
    this.buttonNotification = page.locator('button[id$="Inbox"]')
    this.buttonDocuments = page.locator('button[id$="DocumentApplication"]')
  }
}
