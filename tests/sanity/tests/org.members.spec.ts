import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('recruit tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('org-add-member', async ({ page }) => {
    await page.click('[id="app-contact\\:string\\:Contacts"]')
    await page.click('.antiNav-element:has-text("Company")')
    await page.click('button:has-text("Company")')
    await page.click('[placeholder="Company name"]')
    const orgId = 'Company-' + generateId()
    await page.fill('[placeholder="Company name"]', orgId)
    await page.click('[id="contact\\:string\\:CreateOrganization"] button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await page.click(`text=${orgId}`)

    await page.click('[id="contact:string:AddMember"]')
    await page.click('button:has-text("Chen Rosamund")')
    await page.click('text=Chen Rosamund less than a minute ago >> span')
    await page.click(`.card a:has-text("${orgId}")`)
  })
})
