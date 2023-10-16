import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('recruit tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })
  test('create-candidate', async ({ page, context }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.click('text=Talents')

    await page.click('button:has-text("New Talent")')

    const first = 'Elton-' + generateId(4)
    const last = 'John-' + generateId(4)
    const loc = 'Cupertino'
    const email = `ej-${generateId(4)}@test.com`

    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)

    const title = page.locator('[placeholder="Title"]')
    await title.click()
    await title.fill('Super Candidate')

    const location = page.locator('[placeholder="Location"]')
    await location.click()
    await location.fill(loc)

    await page.locator('[id="presentation\\:string\\:AddSocialLinks"]').click()
    await page.locator('.antiPopup').locator('text=Email').click()
    const emailInput = page.locator('[placeholder="john\\.appleseed@apple\\.com"]')
    await emailInput.fill(email)
    await page.locator('#channel-ok.antiButton').click()

    await page.locator('.antiCard button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    await page.click(`text="${last} ${first}"`)

    await expect(page.locator(`text=${first}`).first()).toBeVisible()
    await expect(page.locator(`text=${last}`).first()).toBeVisible()
    await expect(page.locator(`text=${loc}`).first()).toBeVisible()

    const panel = page.locator('.popupPanel')
    await panel.locator('[id="gmail\\:string\\:Email"]').scrollIntoViewIfNeeded()
    await panel.locator('[id="gmail\\:string\\:Email"]').click()
    expect(await page.locator('.cover-channel >> input').inputValue()).toEqual(email)
  })
})
