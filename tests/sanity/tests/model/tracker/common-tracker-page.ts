import { expect, Locator, Page } from '@playwright/test'
import { CalendarPage } from '../calendar-page'

export class CommonTrackerPage extends CalendarPage {
  readonly page: Page
  readonly buttonFilter: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonFilter = page.locator('div.search-start > div:first-child button')
  }

  async selectFilter (filter: string, filterSecondLevel?: string): Promise<void> {
    await this.buttonFilter.click()
    await this.page.locator('div.selectPopup [class*="menu"]', { hasText: filter }).click()
    if (filterSecondLevel !== null) {
      await this.page.locator('div.selectPopup [class*="menu"]', { hasText: filterSecondLevel }).click()
    }
  }

  async checkFilter (filter: string, filterSecondLevel?: string, filterThirdLevel?: string): Promise<void> {
    await expect(this.page.locator('div.filter-section button:nth-child(1)')).toHaveText(filter)
    if (filterSecondLevel !== undefined) {
      await expect(this.page.locator('div.filter-section button:nth-child(2)')).toContainText(filterSecondLevel)
    }
    if (filterThirdLevel !== undefined) {
      await expect(this.page.locator('div.filter-section button:nth-child(3)')).toContainText(filterThirdLevel)
    }
  }

  async updateFilterDimension (filterSecondLevel: string, dateStart?: string): Promise<void> {
    await this.page.locator('div.filter-section button:nth-child(2)').click()
    await this.page.locator('div.selectPopup [class*="menu"]', { hasText: filterSecondLevel }).click()

    if (dateStart !== undefined) {
      switch (dateStart) {
        case 'Today':
          await this.page.locator('div.month-container div.today').click()
          break
        default:
          await this.page.locator('div.month-container div.day', { hasText: dateStart }).click()
          break
      }
    }
  }

  async fillBetweenDate (dateStart: string, dateEnd: string): Promise<void> {
    await this.page
      .locator('div.date-popup-container div.input:first-child span.digit:first-child')
      .click({ delay: 100 })
    await this.page.type('div.date-popup-container div.input:first-child', dateStart)

    await this.page
      .locator('div.date-popup-container div.input:last-child span.digit:first-child')
      .click({ delay: 100 })
    await this.page.type('div.date-popup-container div.input:last-child', dateEnd)

    await this.page.locator('div.date-popup-container button[type="submit"]').click({ delay: 100 })
  }
}
