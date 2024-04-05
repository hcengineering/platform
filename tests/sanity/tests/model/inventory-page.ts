import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'
import { PlatformURI } from '.././utils'

export class InventoryPage extends CommonPage {
  readonly page: Page
  readonly inventoryNavIcon: Locator
  readonly categoriesButton: Locator
  readonly createCategoryButton: Locator
  readonly categoryPlaceholder: Locator
  readonly createButton: Locator
  readonly createdCategory = (page: Page, categoryName: string): Locator => {
    return page.locator(`//td//div[text()='${categoryName}']`)
  }
  readonly categorySubMenu = (page: Page, categoryName: string): Locator => {
    return page.locator(`//div[text()='${categoryName}']/../../div`)
  }
  readonly createSubCategoryButton: Locator
  readonly deleteButton: Locator
  readonly expandCategoryArrowButton = (page: Page, categoryName: string): Locator => {
    return page.locator(`//div[text()='${categoryName}']/../../div[1]`)
  }

  constructor(page: Page) {
    super()
    this.page = page
    this.inventoryNavIcon = page.locator('[id="app-inventory:string:Inventory"]')
    this.categoriesButton = page.locator('span:has-text("Categories")')
    this.createCategoryButton = page.locator('span:has-text("Category")')
    this.categoryPlaceholder = page.getByPlaceholder('Category')
    this.createButton = page.locator('[id="inventory:string:CreateCategory"] button[type="submit"]')
    this.createSubCategoryButton = page.getByText('Create subcategory')
    this.deleteButton = page.getByText('Delete')
  }

  async openInventory(): Promise<void> {
    await this.inventoryNavIcon.click()
    await expect(this.page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/inventory`)
  }

  async openCategories(): Promise<void> {
    await this.categoriesButton.click()
    await expect(this.page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/inventory/Categories`)
  }

  async createCategory(categoryName: string): Promise<void> {
    await this.createCategoryButton.click()
    await this.categoryPlaceholder.fill(categoryName)
    await this.createButton.click()
  }

  async verifyCategoryOnTheListPage(categoryName: string): Promise<void> {
    await expect(this.createdCategory(this.page, categoryName)).toBeVisible({ timeout: 60000 })
  }

  async openCategorySubmenu(categoryName: string): Promise<void> {
    await this.createdCategory(this.page, categoryName).hover()
    await this.categorySubMenu(this.page, categoryName).click()
  }
  async expandCategory(categoryName: string): Promise<void> {
    await this.createdCategory(this.page, categoryName).hover()
    await this.expandCategoryArrowButton(this.page, categoryName).click()
  }
  async createSubCategory(subCategoryName: string): Promise<void> {
    await this.createSubCategoryButton.click()
    await this.categoryPlaceholder.fill(subCategoryName)
    await this.createButton.click()
  }

  async verifySubCategoryOnTheListPage(categoryName: string, subCategoryName: string): Promise<void> {
    await this.expandCategory(categoryName)
    await expect(this.createdCategory(this.page, subCategoryName)).toBeVisible({ timeout: 60000 })
  }

  async deleteSubCategory(categoryName: string, subCategoryName: string): Promise<void> {
    await this.expandCategory(categoryName)
    await this.openCategorySubmenu(subCategoryName)
    await this.deleteButton.click()
    await this.pressYesDeletePopup(this.page)
  }
  async deleteCategory(categoryName: string): Promise<void> {
    await this.openCategorySubmenu(categoryName)
    await this.deleteButton.click()
    await this.pressYesDeletePopup(this.page)
  }

  async verifyCategoryDeleted(categoryName: string): Promise<void> {
    await expect(this.createdCategory(this.page, categoryName)).toBeVisible({ timeout: 60000, visible: false })
  }
}
