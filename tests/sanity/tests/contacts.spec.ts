import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('contact tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })
  test('create-contact', async ({ page }) => {
    // Create a new context with the saved storage state.
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('button:has-text("Contact")')

    await (await page.locator('.ap-menuItem')).locator('text=Person').click()

    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)

    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)

    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
  })
  test('create-organization', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('button:has-text("Contact")')

    await (await page.locator('.ap-menuItem')).locator('text=Organization').click()

    const orgName = 'Organization' + generateId(5)

    const firstName = page.locator('[placeholder="Organization name"]')
    await firstName.click()
    await firstName.fill(orgName)

    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator(`text=${orgName}`)).toBeVisible()
  })
  test('contact-search', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await expect(page.locator('text=M. Marina')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(5)

    await page.waitForTimeout(1000)

    const searchBox = page.locator('[placeholder="Search"]')
    await searchBox.fill('Marina')
    await searchBox.press('Enter')

    await expect(page.locator('.antiTable-body__row')).toHaveCount(1, {
      timeout: 15000
    })

    await searchBox.fill('')
    await searchBox.press('Enter')

    await expect(page.locator('text=Chen Rosamund')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(5)
  })

  test('delete-contact', async ({ page }) => {
    // Create a new context with the saved storage state.
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('button:has-text("Contact")')

    await (await page.locator('.ap-menuItem')).locator('text=Person').click()

    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)

    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)

    await page.locator('.antiCard button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    // Click #context-menu svg
    await page.hover(`td:has-text("${last} ${first}")`)
    await page.click(`td:has-text("${last} ${first}")`, {
      button: 'right'
    })
    await page.click('text="Delete"')
    // Click text=Ok
    await page.click('text=Ok')

    await expect(page.locator(`td:has-text("${first} ${last}")`)).toHaveCount(0)
  })
})
