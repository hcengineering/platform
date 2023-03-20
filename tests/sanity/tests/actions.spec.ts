import { expect, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('actions tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/sanity-ws`))?.finished()
  })
  test('action-new-candidate', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)

    await page.click('td:has-text("Frontend Engineer")')

    await page.press('body', 'Meta+k')
    await page.fill('[placeholder="type\\ to\\ filter\\.\\.\\."]', 'Talent')
    expect(await page.locator('div.selectPopup :text("New Talent")').count()).toBe(1)
    await page.click('div.selectPopup :text("New Talent")')
    await page.click('button#card-close')
  })

  test('action-switch-vacancies', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)

    await page.press('body', 'Meta+k')
    await page.fill('[placeholder="type\\ to\\ filter\\.\\.\\."]', 'go to')
    expect(await page.locator('div.selectPopup :text("Go To Vacancies")').count()).toBe(1)
    await page.click('div.selectPopup :text("Go To Vacancies")')

    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/vacancies`)
  })
  test('action-switch-applications', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)

    await page.press('body', 'Meta+k')
    await page.fill('[placeholder="type\\ to\\ filter\\.\\.\\."]', 'go to')
    expect(await page.locator('div.selectPopup :text("Go To Applications")').count()).toBe(1)
    await page.click('div.selectPopup :text("Go To Applications")')

    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/candidates`)
  })
})
