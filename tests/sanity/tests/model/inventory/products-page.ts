import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from './../common-page'

export class InventoryProductsPage extends CommonPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateNewProduct: Locator
  readonly inputCreateProductTitle: Locator
  readonly buttonCreateProduct: Locator
  readonly buttonSelectCategory: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Products' })
    this.buttonCreateNewProduct = page.locator('button > span', { hasText: 'Product' })
    this.inputCreateProductTitle = page.locator(
      'form[id="inventory:string:CreateProduct"] input[placeholder="Product"]'
    )
    this.buttonCreateProduct = page.locator('form[id="inventory:string:CreateProduct"] button[type="submit"]')
    this.buttonSelectCategory = page.locator('div.antiCard-pool button')
  }

  async createNewInventoryProduct (productName: string, categoryName: string): Promise<void> {
    await this.buttonCreateProduct.click()
    await this.inputCreateProductTitle.fill(productName)
    await this.buttonSelectCategory.click()
    await this.selectMenuItem(this.page, categoryName)
    await this.buttonCreateProduct.click()
  }

  async openAProduct (productName: string): Promise<void> {
    await this.page
      .locator('tr', { hasText: productName })
      .locator('div[class$="firstCell"]')
      .click({ button: 'right' })
  }
}
