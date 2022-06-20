import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('project tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
  })
  test('create-project-issue', async ({ page }) => {
    await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')

    // Click text=Projects
    await page.click('text=Projects')
    await expect(page).toHaveURL(
      `${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/tracker%3Aapp%3ATracker/tracker%3Ateam%3ADefaultTeam/projects`
    )
    await page.click('button:has-text("Project")')
    await page.click('[placeholder="Project\\ name"]')
    const prjId = 'project-' + generateId()
    await page.fill('[placeholder="Project\\ name"]', prjId)

    await page.click('button:has-text("Create project")')

    await page.click(`text=${prjId}`)
    await page.click('button:has-text("New issue")')
    await page.fill('[placeholder="Issue\\ title"]', 'issue')
    await page.click('form button:has-text("Project")')
    await page.click(`button:has-text("${prjId}")`)
    await page.click('button:has-text("Save issue")')
    await page.click(`button:has-text("${prjId}")`)
    await page.click('button:has-text("No project")')
  })

  test('create-project-with-status', async ({ page }) => {
    await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
    await page.click('text=Projects')
    await expect(page).toHaveURL(
      `${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/tracker%3Aapp%3ATracker/tracker%3Ateam%3ADefaultTeam/projects`
    )
    await page.click('button:has-text("Project")')
    const prjId = 'project-' + generateId()
    await page.fill('[placeholder="Project\\ name"]', prjId)
    await page.click('text=Backlog Lead Members Start date Target date >> button')
    await page.click('button:has-text("In progress")')
    await page.click('button:has-text("Create project")')
    await page.click(`text=${prjId}`)
    await page.click('button:has-text("In progress")')
    await page.click('button:has-text("Completed")')
  })
})
