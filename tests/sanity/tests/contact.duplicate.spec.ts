import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('duplicate-org-test', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })
  test('check-contact-exists', async ({ page }) => {
    await page.click('[id="app-lead\\:string\\:LeadApplication"]')

    // Click text=Customers
    await page.click('text=Customers')

    // Click button:has-text("New Customer")
    await page.click('button:has-text("New Customer")')

    // Click button:has-text("Person")
    await page.click('button:has-text("Person")')

    // Click button:has-text("Company")
    await page.click('button:has-text("Company")')

    // Click [placeholder="Apple"]
    await page.click('[placeholder="Company name"]')

    const genId = 'Asoft-' + generateId(4)
    // Fill [placeholder="Apple"]
    await page.fill('[placeholder="Company name"]', genId)

    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')

    await page.waitForSelector('form.antiCard', { state: 'detached' })

    // Click button:has-text("New Customer")
    await page.click('button:has-text("New Customer")')

    // Click button:has-text("Person")
    await page.click('button:has-text("Person")')

    // Click button:has-text("Company")
    await page.click('button:has-text("Company")')

    // Click [placeholder="Apple"]
    await page.click('[placeholder="Company name"]')

    // Fill [placeholder="Apple"]
    await page.fill('[placeholder="Company name"]', genId)

    // Click text=Person already exists...
    await page.click('text=Contact already exists...')
  })
})
