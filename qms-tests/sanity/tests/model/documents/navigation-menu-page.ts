import { type Locator, type Page } from '@playwright/test'

export class NavigationMenuPage {
  readonly page: Page
  readonly buttonTemplates: Locator
  readonly buttonCategories: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonTemplates = page.locator('a[href$="templates"]', { hasText: 'Templates' })
    this.buttonCategories = page.locator('a[href$="categories"]', { hasText: 'Categories' })
  }
}
