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
    await page.click('button:has-text("Contact")')
    await page.click('button:has-text("Organization")')
    await page.click('[placeholder="Organization name"]')
    const orgId = 'Organiation-' + generateId()
    await page.fill('[placeholder="Organization name"]', orgId)
    await page.click('button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await page.click(`text=${orgId}`)

    await page.click('[id="contact:string:AddMember"]')
    await page.click('button:has-text("Chen Rosamund")')
    await page.click('text=Chen Rosamund less than a minute ago >> span')
    await page.click(`:nth-match(:text("${orgId}"), 2)`)
  })
})
