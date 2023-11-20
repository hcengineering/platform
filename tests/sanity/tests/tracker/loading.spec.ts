import { test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
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

  const issuesPage = new IssuesPage(page)
  await issuesPage.modelSelectorAll.click()

  // TODO: Test should create issues before checking for status loading
  // await expect(page.locator('.categoryHeader :text-is("In Progress")').first()).toBeVisible()
  // await expect(page.locator('.categoryHeader :text-is("Backlog")').first()).toBeVisible()
  // await expect(page.locator('.categoryHeader :text-is("Todo")').first()).toBeVisible()
  // await expect(page.locator('.categoryHeader :text-is("Done")').first()).toBeVisible()
  // await expect(page.locator('.categoryHeader :text-is("Canceled")').first()).toBeVisible()
})
