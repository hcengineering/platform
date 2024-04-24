import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class LeftSideMenuPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  buttonChunter = (): Locator => this.page.locator('button[id$="ApplicationLabelChunter"]')
  buttonContacts = (): Locator => this.page.locator('button[id$="Contacts"]')
  buttonTracker = (): Locator => this.page.locator('button[id$="TrackerApplication"]')
  buttonNotification = (): Locator => this.page.locator('button[id$="Inbox"]')
  buttonDocuments = (): Locator => this.page.locator('button[id$="DocumentApplication"]')

  async clickChunter (): Promise<void> {
    await this.buttonChunter().click()
  }

  async clickContacts (): Promise<void> {
    await this.buttonContacts().click()
  }

  async clickTracker (): Promise<void> {
    await this.buttonTracker().click()
  }

  async clickNotification (): Promise<void> {
    await this.buttonNotification().click()
  }

  async clickDocuments (): Promise<void> {
    await this.buttonDocuments().click()
  }
}
