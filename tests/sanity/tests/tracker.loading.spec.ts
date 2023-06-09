import { test, expect } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'
test.use({
  storageState: PlatformSetting
})

test('check-status-loading', async ({ page }) => {
  await (
    await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
  )?.finished()

  await expect(page.locator('.categoryHeader :text-is("In Progress")').first()).toBeVisible()
  await expect(page.locator('.categoryHeader :text-is("Backlog")').first()).toBeVisible()
  await expect(page.locator('.categoryHeader :text-is("Todo")').first()).toBeVisible()
  await expect(page.locator('.categoryHeader :text-is("Done")').first()).toBeVisible()
})
