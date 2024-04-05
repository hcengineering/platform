import { expect, test, type Page } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'
import { LoginPage } from './model/login-page'
import { PlatformUser } from './utils'
import { SelectWorkspacePage } from './model/select-workspace-page'
import { InventoryPage } from './model/inventory-page'

test.use({
  storageState: PlatformSetting
})

test.describe('inventory tests', () => {
  let category = 'TestCategory'
  let subCategory = 'TestSubCategory'
  let page: Page
  let inventoryPage: InventoryPage

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(PlatformUser, '1234')

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.selectWorkspace('SanityTest')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws`)

    inventoryPage = new InventoryPage(page)
  })

  test('create category test', async () => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()

    await inventoryPage.openInventory()
    await inventoryPage.openCategories()
    await inventoryPage.createCategory(category)
  })

  test('create sub category test', async () => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/inventory/Categories`))?.finished()

    await inventoryPage.openCategorySubmenu(category)
    await inventoryPage.createSubCategory(category)
    await inventoryPage.verifySubCategoryOnTheListPage(category, subCategory)
  })

  test('delete sub category test', async () => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/inventory/Categories`))?.finished()

    await inventoryPage.deleteSubCategory(category, subCategory)
    await inventoryPage.verifyCategoryDeleted(subCategory)
  })

  test('delete category test', async () => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/inventory/Categories`))?.finished()

    await inventoryPage.deleteCategory(category)
    await inventoryPage.verifyCategoryDeleted(category)
  })
})
