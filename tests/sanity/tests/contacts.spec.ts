import { test, expect } from '@playwright/test'
import { openWorkbench } from './utils'

test.describe('contact tests', () => {
  test('create-contact', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('button:has-text("Contact")')

    await (await page.locator('.ap-menuItem')).locator('text=Person').click()

    const firstName = page.locator('[placeholder="John"]')
    await firstName.click()
    await firstName.fill('Elton')

    const lastName = page.locator('[placeholder="Appleseed"]')
    await lastName.click()
    await lastName.fill('John')

    await page.locator('.antiCard').locator('button:has-text("Create")').click()
  })
  test('contact-search', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await expect(page.locator('text=Marina M.')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(5)

    const searchBox = page.locator('[placeholder="Search"]')
    await searchBox.fill('Marina')
    await searchBox.press('Enter')

    await expect(page.locator('.antiTable-body__row')).toHaveCount(1)

    await searchBox.fill('')
    await searchBox.press('Enter')

    await expect(page.locator('text=Rosamund Chen')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(5)
  })
})
