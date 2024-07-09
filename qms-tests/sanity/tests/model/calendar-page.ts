import { Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class CalendarPage extends CommonPage {
  readonly page: Page
  readonly buttonDatePopupToday: Locator
  readonly inputPopupDateDay: Locator
  readonly inputPopupDateMonth: Locator
  readonly inputPopupDateYear: Locator
  readonly inputPopupTime: Locator
  readonly inputPopupDateSave: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonDatePopupToday = page.locator('div.popup div.today:not(.wrongMonth)')
    this.inputPopupDateDay = page.locator('div[class*="date-popup"] div.datetime-input span.digit:first-child')
    this.inputPopupDateMonth = page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(3)')
    this.inputPopupDateYear = page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(5)')
    this.inputPopupTime = page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(7)')
    this.inputPopupDateSave = page.locator('div[class*="date-popup"] div.footer button')
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

  async fillSelectDateByShortcut (shortcut: string): Promise<void> {
    await this.page.locator('div.shift-container div.btn > span', { hasText: shortcut }).click()
  }
}
