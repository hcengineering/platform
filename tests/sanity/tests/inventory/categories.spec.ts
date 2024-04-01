import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'

test.use({
    storageState: PlatformSetting
})

test.describe('categories test', () => {
    test.beforeEach(async ({ page }) => {
        await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    })

    test('create then delete category', async ({ page }) => {
        await page.locator('[id="app-inventory\\:string\\:Inventory"]').click()

        await page.click('.antiNav-element:has-text("Categories")')
        await page.click('button:has-text("Category")')

        const categoryName = 'Category-' + generateId(5)

        const categoryNameInput = page.locator('[placeholder="Category"]')
        await categoryNameInput.click()
        await categoryNameInput.fill(categoryName)

        await page.locator('.antiCard').locator('button:has-text("Create")').click()
        await page.waitForSelector('form.antiCard', { state: 'detached' })

        await expect(page.locator(`text=${categoryName}`)).toBeVisible()

        await page.locator(`td:has-text("${categoryName}")`).hover()
        await page.locator(`td:has-text("${categoryName}")`).locator('.menuRow').click()
        await page.locator(`button:has-text("Delete")`).click()
        await page.locator(`button.antiButton:has-text("Yes")`).click()
        await page.waitForSelector('form.antiCard', { state: 'detached' })

        await expect(page.locator(`text=${categoryName}`)).not.toBeVisible()
    })
})
