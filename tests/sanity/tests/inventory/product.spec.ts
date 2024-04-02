import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI, PlatformUser } from '../utils'
import { InventoryCatagoriesPage } from '../model/inventory/categories-page'
import { InventoryProductsPage } from '../model/inventory/products-page'
import { InventoryNavigationPage } from '../model/inventory/inventory-navigation-page'
import { LoginPage } from '../model/login-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Inventory Product Tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    const login = new LoginPage(page)
    login.login(PlatformUser, '1234')
  })

  test('Create product', async ({ page }) => {
    const productName = 'product ' + generateId(4)
    const categoryName = 'category' + generateId(4)

    await page.locator('[id="app-inventory\\:string\\:Inventory"]').click()
    const inventoryNavigationPage = new InventoryNavigationPage(page)
    await inventoryNavigationPage.buttonCategories.click()

    const inventoryCategoryPage = new InventoryCatagoriesPage(page)
    expect(inventoryCategoryPage.pageHeader).toBeVisible()
    await inventoryCategoryPage.createNewInventoryCategory(categoryName)
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    expect(page.locator('tr', { hasText: categoryName })).toBeVisible()
    await inventoryNavigationPage.buttonProducts.click()

    const inventoryProductsPage = new InventoryProductsPage(page)
    expect(inventoryProductsPage.pageHeader).toBeVisible()

    await inventoryProductsPage.buttonCreateNewProduct.click()
    await inventoryProductsPage.inputCreateProductTitle.fill(productName)
    await inventoryProductsPage.buttonSelectCategory.click()
    await inventoryProductsPage.selectMenuItem(page, categoryName)
    expect(page.locator('button>span', { hasText: categoryName })).toBeVisible()

    await inventoryProductsPage.buttonCreateProduct.click()

    expect(page.locator('tr', { hasText: productName })).toBeVisible()
  })
})
