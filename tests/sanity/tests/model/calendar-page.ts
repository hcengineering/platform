import { Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class CalendarPage extends CommonPage {
  readonly page: Page
  readonly buttonDatePopupToday: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonDatePopupToday = page.locator('div.popup div.today:not(.wrongMonth)')
  }
}
