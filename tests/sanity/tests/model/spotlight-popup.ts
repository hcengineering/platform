import { type Locator, type Page, expect } from '@playwright/test'
import { CommonPage } from './common-page'
import { StatusBar } from './statusbar'

export class SpotlightPopup extends CommonPage {
  readonly page: Page
  readonly popup: Locator
  readonly input: Locator
  readonly statusbar: StatusBar

  constructor (page: Page) {
    super()
    this.page = page
    this.popup = page.locator('div.popup')
    this.input = this.popup.locator('input')

    this.statusbar = new StatusBar(page)
  }

  async open (): Promise<void> {
    if (await this.popup.isVisible()) {
      await this.close()
    }
    await this.statusbar.clickButtonSearch()
    await expect(this.popup).toBeVisible()
  }

  async close (): Promise<void> {
    await this.page.keyboard.press('Escape')
    await expect(this.popup).not.toBeVisible()
  }

  async fillSearchInput (search: string): Promise<void> {
    await this.input.fill(search)
    await expect(this.input).toHaveValue(search)
    await this.page.waitForTimeout(500)
  }

  async checkSearchResult (search: string, count: number): Promise<void> {
    await expect(this.popup.locator('div.list-item', { hasText: search })).toHaveCount(count)
  }
}
