import { expect, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('actions tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/sanity-ws`))?.finished()
  })

  test('action-new-candidate', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)

    await page.click('td:has-text("Frontend Engineer")')

    await page.press('body', 'Meta+k')
    await page.fill('[placeholder="Search\\ or\\ run\\ a\\ command\\.\\.\\."]', 'Talent')
    expect(await page.locator('div.selectPopup :text("New Talent")').count()).toBe(1)
    await page.click('div.selectPopup :text("New Talent")')
    await page.click('button#card-close')
  })

  test('action-switch-vacancies', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    await expect(page.locator('a[href$="talents"] > div.selected')).toBeVisible()

    await page.press('body', 'Meta+k')

    await expect(page.locator('input.actionsInput')).toBeVisible()

    await page.click('div.actionsHeader input.actionsInput')
    await page.fill('div.actionsHeader input.actionsInput', 'go to ')
    await page.waitForTimeout(1000)

    expect(await page.locator('div.selectPopup div.list-item :text("Go To Vacancies")').count()).toBe(1)
    await page.click('div.selectPopup div.list-item :text("Go To Vacancies")', { delay: 100 })

    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/vacancies`)
  })

  test('action-switch-applications', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    await expect(page.locator('a[href$="talents"] > div.selected')).toBeVisible()

    await page.press('body', 'Meta+k')

    await expect(page.locator('input.actionsInput')).toBeVisible()

    await page.click('div.actionsHeader input.actionsInput')
    await page.fill('div.actionsHeader input.actionsInput', 'go to ')
    await page.waitForTimeout(1000)

    expect(await page.locator('div.selectPopup :text("Go To Applications")').count()).toBe(1)
    await page.click('div.selectPopup :text("Go To Applications")', { delay: 100 })

    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/candidates`)
  })
})
