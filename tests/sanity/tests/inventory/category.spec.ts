import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI, PlatformUser } from '../utils'
import { InventoryCatagoriesPage } from '../model/inventory/categories-page'
import { InventoryNavigationPage } from '../model/inventory/inventory-navigation-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Inventory Category Tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test("Create category", async ({ page }) => {
    const categoryName = 'Category ' + generateId(4)
    
    const inventoryNavigationPage = new InventoryNavigationPage(page);
    await page.locator('[id="app-inventory\\:string\\:Inventory"]').click()
    await inventoryNavigationPage.buttonCategories.click();

    const inventoryCategoryPage = new InventoryCatagoriesPage(page)
    expect (inventoryCategoryPage.pageHeader).toBeVisible()

    await inventoryCategoryPage.buttonCreateNewCategory.click()
    await inventoryCategoryPage.inputCreateCategoryTitle.fill(categoryName)
    await inventoryCategoryPage.buttonCreateCategory.click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    
    expect (page.locator('tr', { hasText: categoryName })).toBeVisible();
  })
})