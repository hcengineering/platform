import { test, expect } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
test.use({
  storageState: PlatformSetting
})

test('check-status-loading', async ({ page }) => {
  await allure.parentSuite('Tracker tests')
  await (
    await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
  )?.finished()

  await expect(page.locator('.categoryHeader :text-is("In Progress")').first()).toBeVisible()
  await expect(page.locator('.categoryHeader :text-is("Backlog")').first()).toBeVisible()
  await expect(page.locator('.categoryHeader :text-is("Todo")').first()).toBeVisible()
  await expect(page.locator('.categoryHeader :text-is("Done")').first()).toBeVisible()
  await expect(page.locator('.categoryHeader :text-is("Canceled")').first()).toBeVisible()
})
