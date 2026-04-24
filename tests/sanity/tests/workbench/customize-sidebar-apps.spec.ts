import { expect, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Customize sidebar applications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`)
  })

  test('sidebar apps match Customize visibility toggles', async ({ page }) => {
    const recruitSidebar = page.getByTestId('app-sidebar-recruit')
    const customize = page.getByTestId('workbench-app-customize')
    const recruitRow = page.getByTestId('app-switcher-row-recruit')

    await expect(recruitSidebar).toBeVisible()

    await customize.click()
    await expect(recruitRow).toBeVisible()
    await recruitRow.click()
    await page.keyboard.press('Escape')

    await expect(recruitSidebar).toHaveCount(0)

    await customize.click()
    await expect(recruitRow).toBeVisible()
    await recruitRow.click()
    await page.keyboard.press('Escape')

    await expect(recruitSidebar).toBeVisible()
  })
})
