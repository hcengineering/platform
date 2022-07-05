import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('duplicate-org-test', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/sanity-ws`)
  })
  test('test', async ({ page }) => {
    await page.click('[id="app-lead\\:string\\:LeadApplication"]')

    // Click text=Customers
    await page.click('text=Customers')

    // Click button:has-text("New Customer")
    await page.click('button:has-text("New Customer")')

    // Click button:has-text("Person")
    await page.click('button:has-text("Person")')

    // Click button:has-text("Organization")
    await page.click('button:has-text("Organization")')

    // Click [placeholder="Apple"]
    await page.click('[placeholder="Apple"]')

    const genId = 'Asoft-' + generateId(4)
    // Fill [placeholder="Apple"]
    await page.fill('[placeholder="Apple"]', genId)

    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')

    // Click button:has-text("New Customer")
    await page.click('button:has-text("New Customer")')

    // Click button:has-text("Person")
    await page.click('button:has-text("Person")')

    // Click button:has-text("Organization")
    await page.click('button:has-text("Organization")')

    // Click [placeholder="Apple"]
    await page.click('[placeholder="Apple"]')

    // Fill [placeholder="Apple"]
    await page.fill('[placeholder="Apple"]', genId)

    // Click text=Person already exists...
    await page.click('text=Contact already exists...')
  })
})
