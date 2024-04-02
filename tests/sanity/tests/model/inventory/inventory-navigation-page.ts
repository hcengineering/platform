import { type Locator, type Page } from '@playwright/test'

export class InventoryNavigationPage {
  readonly page: Page
  readonly buttonCategories: Locator
  readonly buttonProducts: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonCategories = page.locator('a[href$="Categories"]', { hasText: 'Categories' })
    this.buttonProducts = page.locator('a[href$="Products"]', { hasText: 'Products' })
  }
}
