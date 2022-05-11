import { test, expect } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'
test.use({
  storageState: PlatformSetting
})
test('create-issue', async ({ page }) => {
  await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
  // Click [id="app-tracker\:string\:TrackerApplication"]
  await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
  await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/tracker%3Aapp%3ATracker`)
  // Click button:has-text("New issue")
  await page.click('button:has-text("New issue")')
  // Click [placeholder="Issue\ title"]
  await page.click('[placeholder="Issue\\ title"]')
  // Fill [placeholder="Issue\ title"]
  await page.fill('[placeholder="Issue\\ title"]', 'test-issue')
  // Click p
  await page.fill('.ProseMirror', 'some description')
  // Click button:has-text("Backlog")
  await page.click('button:has-text("Backlog")')
  // Click button:has-text("Todo")
  await page.click('button:has-text("Todo")')
  // Click button:has-text("No priority")
  await page.click('button:has-text("No priority")')
  // Click button:has-text("Urgent")
  await page.click('button:has-text("Urgent")')
  // Click button:has-text("Save issue")
  await page.click('button:has-text("Save issue")')
  // Click text=Issues Active Backlog Board Projects >> span
  await page.click('text=Issues Active Backlog Board Projects >> span')
  await expect(page).toHaveURL(
    `${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/tracker%3Aapp%3ATracker/tracker%3Ateam%3ADefaultTeam/issues`
  )
  // Click text=TSK-1
  await page.click('text=TSK-1')
})
