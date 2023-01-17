import { expect, test } from '@playwright/test'
import { navigate } from './tracker.utils'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('project tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await page.goto(`${PlatformURI}/workbench/sanity-ws`)
  })
  test('create-project-issue', async ({ page }) => {
    await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')

    await navigate(page)
    // Click text=Projects
    await page.click('text=Projects')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Ateam%3ADefaultTeam/projects`)
    await page.click('button:has-text("Project")')
    await page.click('[placeholder="Project\\ name"]')
    const prjId = 'project-' + generateId()
    await page.fill('[placeholder="Project\\ name"]', prjId)

    await page.click('button:has-text("Create project")')

    await page.click(`text=${prjId}`)
    await page.click('button:has-text("New issue")')
    await page.fill('[placeholder="Issue\\ title"]', 'issue')
    await page.click('form button:has-text("Project")')
    await page.click(`.selectPopup button:has-text("${prjId}")`)
    await page.click('form button:has-text("Save issue")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    await page.click('.listGrid :has-text("issue")')
  })

  test('create-project-with-status', async ({ page }) => {
    await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
    await page.click('text=Projects')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Ateam%3ADefaultTeam/projects`)
    await page.click('button:has-text("Project")')
    const prjId = 'project-' + generateId()
    await page.fill('[placeholder="Project\\ name"]', prjId)
    await page.click('text=Backlog Lead Members Start date Target date >> button')
    await page.click('button:has-text("In progress")')
    await page.click('button:has-text("Create project")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await page.click(`text=${prjId}`)
    await page.click('button:has-text("In progress")')
    await page.click('button:has-text("Completed")')
  })
})
