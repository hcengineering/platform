import { expect, test } from '@playwright/test'
import { fillSearch, generateId, PlatformSetting, PlatformURI } from './utils'

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

    await page.click('.antiNav-element:has-text("Person")')
    await page.click('button:has-text("Person")')

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
  test('create-company', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('.antiNav-element:has-text("Company")')
    await page.click('button:has-text("Company")')

    const orgName = 'Company' + generateId(5)

    const firstName = page.locator('[placeholder="Company name"]')
    await firstName.click()
    await firstName.fill(orgName)

    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator(`text=${orgName}`)).toBeVisible()
  })
  test('contact-search', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('.antiNav-element:has-text("Person")')

    await expect(page.locator('text=M. Marina')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThanOrEqual(5)

    await fillSearch(page, 'Marina')

    await expect(page.locator('.antiTable-body__row')).toHaveCount(1, {
      timeout: 15000
    })

    await fillSearch(page, '')

    await expect(page.locator('text=P. Andrey')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(3)
  })

  test('delete-contact', async ({ page }) => {
    // Create a new context with the saved storage state.
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    await page.click('.antiNav-element:has-text("Person")')
    await page.click('button:has-text("Person")')

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

    await expect(page.locator(`td:has-text("${last} ${first}")`)).toHaveCount(1)

    // Click #context-menu svg
    await page.hover(`td:has-text("${last} ${first}")`)
    await page.click(`td:has-text("${last} ${first}")`, {
      button: 'right'
    })
    await page.click('text="Delete"')
    // Click text=Yes
    await page.click('text=Yes')

    await expect(page.locator(`td:has-text("${last} ${first}")`)).toHaveCount(0)
  })

  test('kick-and-delete-employee', async ({ page }) => {
    // Create a new context with the saved storage state.
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()

    // Create employee
    await page.click('.antiNav-element:has-text("Employee")')
    await page.click('button:has-text("Employee")')

    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)
    const mail = 'eltonjohn@' + generateId(5)

    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)

    const email = page.locator('[placeholder="Email"]')
    await email.click()
    await email.fill(mail)

    await page.locator('.antiCard button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    // Kick employee

    // Click #context-menu svg
    await page.hover(`td:has-text("${last} ${first}")`)
    await page.click(`td:has-text("${last} ${first}")`, { button: 'right' })
    await page.click('text="Kick employee"')
    // Click text=Ok
    await page.click('text=Ok')

    await expect(page.locator(`td:has-text("${last} ${first}")`)).toHaveCount(1)
  })
})
