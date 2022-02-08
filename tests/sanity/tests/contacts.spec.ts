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

    await page.locator('.card-container').locator('button:has-text("Create")').click()
  })
  test('contact-search', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await expect(page.locator('text=Elton John')).toBeVisible()
    expect(await page.locator('.tr-body').count()).toBeGreaterThan(5)

    const searchBox = page.locator('[placeholder="Search"]')
    await searchBox.fill('Elton')
    await searchBox.press('Enter')

    await expect(page.locator('.tr-body')).toHaveCount(1)

    await searchBox.fill('')
    await searchBox.press('Enter')

    await expect(page.locator('text=Rosamund Chen')).toBeVisible()
    expect(await page.locator('.tr-body').count()).toBeGreaterThan(5)
  })
})
