import { test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { PlatformSetting, PlatformURI } from '../utils'
test.use({
  storageState: PlatformSetting
})

test('check-status-loading', async ({ page }) => {
  await (
    await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
  )?.finished()
  const issuesPage = new IssuesPage(page)
  await issuesPage.clickModelSelectorAll()
  await issuesPage.verifyCategoryHeadersVisibility()
})
