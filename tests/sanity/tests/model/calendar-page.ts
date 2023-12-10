import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class CalendarPage extends CommonPage {
  readonly page: Page
  readonly buttonDatePopupToday: Locator
  readonly inputTargetDateDay: Locator
  readonly inputTargetDateMonth: Locator
  readonly inputTargetDateYear: Locator
  readonly buttonTargetDateSave: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonDatePopupToday = page.locator('div.popup div.today:not(.wrongMonth)')
    this.inputTargetDateDay = page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(1)')
    this.inputTargetDateMonth = page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(3)')
    this.inputTargetDateYear = page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(5)')
    this.buttonTargetDateSave = page.locator('div.date-popup-container div.footer button')
  }

  async fillDatePopup (day: string, month: string, year: string): Promise<void> {
    await expect(this.inputTargetDateDay).toBeVisible()
    await this.inputTargetDateDay.fill(day)
    await this.inputTargetDateMonth.fill(month)
    await this.inputTargetDateDay.fill(year)
    await this.buttonTargetDateSave.click()
  }

  async fillDatePopupInDays (inDays: string): Promise<void> {
    await expect(this.inputTargetDateDay).toBeVisible()
    await this.page.locator('div.popup div.shift-container div.btn span', { hasText: inDays }).click()
  }
}
