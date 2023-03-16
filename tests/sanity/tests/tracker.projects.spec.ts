import { expect, test } from '@playwright/test'
import { navigate } from './tracker.utils'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('component tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })
  test('create-component-issue', async ({ page }) => {
    await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')

    await navigate(page)
    await page.click('text=Components')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Ateam%3ADefaultTeam/components`)
    await page.click('button:has-text("Component")')
    await page.click('[placeholder="Component\\ name"]')
    const prjId = 'component-' + generateId()
    await page.fill('[placeholder="Component\\ name"]', prjId)

    await page.click('button:has-text("Create component")')

    await page.click(`text=${prjId}`)
    await page.click('button:has-text("New issue")')
    await page.fill('[placeholder="Issue\\ title"]', 'issue')
    await page.click('form button:has-text("Components")')
    await page.click(`.selectPopup button:has-text("${prjId}")`)
    await page.click('form button:has-text("Create issue")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    await page.click('.listGrid :has-text("issue")')
  })

  test('create-component-with-status', async ({ page }) => {
    await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
    await page.click('text=Components')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Ateam%3ADefaultTeam/components`)
    await page.click('button:has-text("Component")')
    const prjId = 'component-' + generateId()
    await page.fill('[placeholder="Component\\ name"]', prjId)
    await page.click('text=Backlog Lead Members Start date Target date >> button')
    await page.click('button:has-text("In progress")')
    await page.click('button:has-text("Create component")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await page.click(`text=${prjId}`)
    await page.click('button:has-text("In progress")')
    await page.click('button:has-text("Completed")')
  })
})
