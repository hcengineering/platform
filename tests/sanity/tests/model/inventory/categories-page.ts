import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from './../common-page'

export class InventoryCatagoriesPage extends CommonPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateNewCategory: Locator
  readonly inputCreateCategoryTitle: Locator
  readonly buttonCreateCategory: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Categories' })
    this.buttonCreateNewCategory = page.locator('button > span', { hasText: 'Category' })
    this.inputCreateCategoryTitle = page.locator(
      'form[id="inventory:string:CreateCategory"] input[placeholder="Category"]'
    )
    this.buttonCreateCategory = page.locator('form[id="inventory:string:CreateCategory"] button[type="submit"]')
  }

  async createNewInventoryCategory (title: string): Promise<void> {
    await this.buttonCreateNewCategory.click()
    await this.inputCreateCategoryTitle.fill(title)
    await this.buttonCreateCategory.click()
  }

  async openACategory (categoryName: string): Promise<void> {
    await this.page
      .locator('tr', { hasText: categoryName })
      .locator('div[class$="firstCell"]')
      .click({ button: 'right' })
  }
}
