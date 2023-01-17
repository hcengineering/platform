import { expect, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})
test.describe('workbench tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await page.goto(`${PlatformURI}/workbench/sanity-ws`)
  })
  test('navigator', async ({ page }) => {
    // Click [id="app-recruit\:string\:RecruitApplication"]
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit`)
    // Click text=Applications
    await page.click('text=Applications')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/candidates`)
    // Click text=Applications Application >> span
    await expect(page.locator('text=Applications Filter')).toBeVisible()
    await expect(page.locator('text="APP-1')).toBeDefined()

    // Click text=Talents
    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)

    await expect(page.locator('text=P. Andrey')).toBeVisible()

    // Click text=Vacancies
    await page.click('text=Vacancies')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/vacancies`)
    // Click text=Software Engineer
    await page.click('text=Software Engineer')
    await expect(page.locator('text=Software Engineer')).toBeVisible()
    await expect(page.locator('text="APP-1"')).toBeDefined()
    // await page.click('[name="tooltip-task:string:Kanban"]')
    await page.click('.tablist-container div:nth-child(2)')

    // Click [id="app-chunter\:string\:ApplicationLabelChunter"]
    await page.click('[id="app-chunter\\:string\\:ApplicationLabelChunter"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/chunter`)

    await page.click('text=general')

    // Click .textInput
    await expect(page.locator('.textInput')).toBeVisible()

    await page.click('[id="app-contact\\:string\\:Contacts"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/contact`)
    // Click text=John Appleseed
    await expect(page.locator('text=Appleseed John')).toBeVisible()
  })
})
