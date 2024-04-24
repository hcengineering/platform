import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class CalendarPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  buttonDatePopupToday = (): Locator => this.page.locator('div.popup div.today:not(.wrongMonth)')
  inputTargetDateDay = (): Locator =>
    this.page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(1)')

  inputTargetDateMonth = (): Locator =>
    this.page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(3)')

  inputTargetDateYear = (): Locator =>
    this.page.locator('div.date-popup-container div.datetime-input span.digit:nth-child(5)')

  buttonTargetDateSave = (): Locator => this.page.locator('div.date-popup-container div.footer button')
  inputPopupDateDay = (): Locator =>
    this.page.locator('div[class*="date-popup"] div.datetime-input span.digit:first-child')

  inputPopupDateMonth = (): Locator =>
    this.page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(3)')

  inputPopupDateYear = (): Locator =>
    this.page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(5)')

  inputPopupTime = (): Locator =>
    this.page.locator('div[class*="date-popup"] div.datetime-input span.digit:nth-child(7)')

  inputPopupDateSave = (): Locator => this.page.locator('div[class*="date-popup"] div.footer button')
  buttonInDays = (inDays: string): Locator =>
    this.page.locator('div.popup div.shift-container div.btn span', { hasText: inDays })

  async clickButtonDatePopupToday (): Promise<void> {
    await this.buttonDatePopupToday().click()
  }

  async fillDatePopup (day: string, month: string, year: string): Promise<void> {
    await expect(this.inputTargetDateDay()).toBeVisible()
    await this.inputTargetDateDay().pressSequentially(day)
    await this.inputTargetDateMonth().pressSequentially(month)
    await this.inputTargetDateYear().pressSequentially(year)
    await this.buttonTargetDateSave().click()
  }

  async fillDatePopupInDays (inDays: string): Promise<void> {
    await expect(this.inputTargetDateDay()).toBeVisible()
    await this.buttonInDays(inDays).click()
  }

  async fillSelectDatePopup (day: string, month: string, year: string, time: string): Promise<void> {
    await this.inputPopupDateDay().click()
    await this.inputPopupDateDay().pressSequentially(day)
    await this.inputPopupDateMonth().click()
    await this.inputPopupDateMonth().pressSequentially(month)
    await this.inputPopupDateYear().click()
    await this.inputPopupDateYear().pressSequentially(year)
    await this.inputPopupTime().click()
    await this.inputPopupTime().pressSequentially(time)
    await this.inputPopupDateSave().click()
  }
}
