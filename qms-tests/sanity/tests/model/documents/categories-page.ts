import { type Locator, type Page, expect } from '@playwright/test'
import { CalendarPage } from '../calendar-page'

export class CategoriesPage extends CalendarPage {
  readonly page: Page
  readonly buttonCreateCategory: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonCreateCategory = page.getByRole('button', { name: 'Category' })
  }

  async openCategory (categoryTitle: string): Promise<void> {
    await this.page
      .locator(`//span[text()='${categoryTitle}']/../..//div[contains(@class, "antiTable-cells__firstCell")]/a`)
      .click()
  }

  async checkCategoryNotExist (categoryTitle: string): Promise<void> {
    await expect(
      this.page.locator(
        `//span[text()='${categoryTitle}']/../..//div[contains(@class, "antiTable-cells__firstCell")]/a`
      )
    ).toBeVisible({ visible: false })
  }
}
