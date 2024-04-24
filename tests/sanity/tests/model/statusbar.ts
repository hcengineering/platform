import { Locator, Page } from '@playwright/test'

export class StatusBar {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  statusbar = (): Locator => this.page.locator('div.antiStatusBar')
  buttonBack = (): Locator => this.statusbar().locator('button[id="statusbar-back"]')
  buttonForward = (): Locator => this.statusbar().locator('button[id="statusbar-forward"]')
  buttonSearch = (): Locator => this.statusbar().locator('button[id="statusbar-search"]')

  async clickButtonBack (): Promise<void> {
    await this.buttonBack().click()
  }

  async clickButtonForward (): Promise<void> {
    await this.buttonForward().click()
  }

  async clickButtonSearch (): Promise<void> {
    await this.buttonSearch().click()
  }
}
