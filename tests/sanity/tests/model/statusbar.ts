import { Locator, Page } from '@playwright/test'

export class StatusBar {
  readonly page: Page
  readonly statusbar: Locator
  readonly buttonBack: Locator
  readonly buttonForward: Locator
  readonly buttonSearch: Locator

  constructor (page: Page) {
    this.page = page
    this.statusbar = page.locator('div.antiStatusBar')
    this.buttonBack = this.statusbar.locator('button[id="statusbar-back"]')
    this.buttonForward = this.statusbar.locator('button[id="statusbar-forward"]')
    this.buttonSearch = this.statusbar.locator('button[id="statusbar-search"]')
  }

  async clickButtonBack (): Promise<void> {
    await this.buttonBack.click()
  }

  async clickButtonForward (): Promise<void> {
    await this.buttonForward.click()
  }

  async clickButtonSearch (): Promise<void> {
    await this.buttonSearch.click()
  }
}