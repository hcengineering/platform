import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class CalendarPage extends CommonPage {
  readonly page: Page
  readonly buttonDatePopupToday: Locator
  readonly inputTargetDateDay: Locator
  readonly inputTargetDateMonth: Locator
  readonly inputTargetDateYear: Locator
  readonly buttonTargetDateSave: Locator
  readonly inputPopupDateDay: Locator
  readonly inputPopupDateMonth: Locator
  readonly inputPopupDateYear: Locator
  readonly inputPopupTime: Locator
  readonly inputPopupDateSave: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonDatePopupToday = page.locator('div.popup div.today:not(.wrongMonth)')
    this.inputTargetDateDay = page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(1)')
    this.inputTargetDateMonth = page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(3)')
    this.inputTargetDateYear = page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(5)')
    this.buttonTargetDateSave = page.locator('div.date-popup-container div.footer button')
    this.inputPopupDateDay = page.locator('div[class*="date-popup"] div.datetime-input span.digit:first-child')
    this.inputPopupDateMonth = page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(3)')
    this.inputPopupDateYear = page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(5)')
    this.inputPopupTime = page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(7)')
    this.inputPopupDateSave = page.locator('div[class*="date-popup"] div.footer button')
  }

  async fillDatePopup (day: string, month: string, year: string): Promise<void> {
    await expect(this.inputTargetDateDay).toBeVisible()
    await this.inputTargetDateDay.pressSequentially(day)
    await this.inputTargetDateMonth.pressSequentially(month)
    await this.inputTargetDateYear.pressSequentially(year)
    await this.buttonTargetDateSave.click()
  }

  async fillDatePopupInDays (inDays: string): Promise<void> {
    await expect(this.inputTargetDateDay).toBeVisible()
    await this.page.locator('div.popup div.shift-container div.btn span', { hasText: inDays }).click()
  }

  async fillSelectDatePopup (day: string, month: string, year: string, time: string): Promise<void> {
    await this.inputPopupDateDay.click()
    await this.inputPopupDateDay.pressSequentially(day)
    await this.inputPopupDateMonth.click()
    await this.inputPopupDateMonth.pressSequentially(month)
    await this.inputPopupDateYear.click()
    await this.inputPopupDateYear.pressSequentially(year)

    await this.inputPopupTime.click()
    await this.inputPopupTime.pressSequentially(time)

    await this.inputPopupDateSave.click()
  }
}
