import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('contact tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
  })
  test('create-contact', async ({ page }) => {
    // Create a new context with the saved storage state.
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('button:has-text("Contact")')

    await (await page.locator('.ap-menuItem')).locator('text=Person').click()

    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)

    const firstName = page.locator('[placeholder="John"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Appleseed"]')
    await lastName.click()
    await lastName.fill(last)

    await page.locator('.antiCard').locator('button:has-text("Create")').click()
  })
  test('create-organization', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('button:has-text("Contact")')

    await (await page.locator('.ap-menuItem')).locator('text=Organization').click()

    const orgName = 'Organization' + generateId(5)

    const firstName = page.locator('[placeholder="Apple"]')
    await firstName.click()
    await firstName.fill(orgName)

    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.isHidden('button:has-text("Create")')
    await expect(page.locator(`text=${orgName}`)).toBeVisible()
  })
  test('contact-search', async ({ page }) => {
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

  test('delete-contact', async ({ page }) => {
    // Create a new context with the saved storage state.
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('button:has-text("Contact")')

    await (await page.locator('.ap-menuItem')).locator('text=Person').click()

    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)

    const firstName = page.locator('[placeholder="John"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Appleseed"]')
    await lastName.click()
    await lastName.fill(last)

    await page.locator('.antiCard').locator('button:has-text("Create")').click()

    // Click #context-menu svg
    await page.hover(`td:has-text("${first} ${last}")`)
    await page.click(`td:has-text("${first} ${last}")`, {
      button: 'right'
    })
    await page.click('text="Delete"')
    // Click text=Ok
    await page.click('text=Ok')

    await expect(page.locator(`td:has-text("${first} ${last}")`)).toHaveCount(0)
  })
})
