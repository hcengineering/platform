import { expect, test } from '@playwright/test'
import { navigate } from './tracker.utils'
import { generateId, PlatformSetting, PlatformURI, fillSearch } from './utils'

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
    await expect(page).toHaveURL(
      `${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/components`
    )
    await page.click('button:has-text("Component")')
    await page.click('[placeholder="Component\\ name"]')
    const componentName = 'component-' + generateId()
    await page.fill('[placeholder="Component\\ name"]', componentName)

    await page.click('button:has-text("Create component")')

    await fillSearch(page, componentName)

    await page.click(`text=${componentName}`)
    await page.click('button:has-text("New issue")')
    await page.fill('[placeholder="Issue\\ title"]', 'issue')
    await page.click('form button:has-text("Component")')
    await page.click(`.selectPopup button:has-text("${componentName}")`)
    await page.click('form button:has-text("Create issue")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
  })
})
