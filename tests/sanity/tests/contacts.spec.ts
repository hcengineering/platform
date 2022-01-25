import { test } from '@playwright/test'
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
})
