import { test, expect, Page } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
test.use({
  storageState: PlatformSetting
})
test('create-issue-and-sub-issue', async ({ page }) => {
  await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
  await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
  await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/tracker%3Aapp%3ATracker`)
  await page.click('button:has-text("New issue")')
  await page.click('[placeholder="Issue\\ title"]')
  await page.fill('[placeholder="Issue\\ title"]', 'test-issue')
  await page.fill('.ProseMirror', 'some description')
  await page.click('button:has-text("Backlog")')
  await page.click('button:has-text("Todo")')
  await page.click('button:has-text("No priority")')
  await page.click('button:has-text("Urgent")')
  await page.click('button:has-text("Save issue")')

  await page.click('.antiNav-element__dropbox :text("Issues")')
  await page.click('.antiList__row :has-text("test-issue") .issuePresenter')
  await page.click('#add-sub-issue')
  await page.click('[placeholder="Issue\\ title"]')
  await page.fill('[placeholder="Issue\\ title"]', 'sub-issue')
  await page.fill('.ProseMirror', 'sub-issue description')
  await page.click('#status-editor')
  await page.click('.selectPopup button:has-text("In Progress")')
  await page.click('.button:has-text("Assignee")')
  await page.click('.selectPopup button:has-text("John Appleseed")')
  await page.click('button:has-text("No priority")')
  await page.click('.selectPopup button:has-text("High")')
  await page.click('button:has-text("Save")')
  await page.click('span.name:text("sub-issue")')
})

async function navigate (page: Page): Promise<void> {
  await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
  await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
  await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/tracker%3Aapp%3ATracker`)
}

async function createIssue (page: Page, props: { [p: string]: string } = {}): Promise<void> {
  await page.click('button:has-text("New issue")')
  await page.click('[placeholder="Issue\\ title"]')
  await page.fill('[placeholder="Issue\\ title"]', props.name ?? '')
  if (props.status !== undefined) {
    await page.click('button:has-text("Backlog")')
    await page.click(`.menu-item:has-text("${props.status}")`)
  }
  await page.click('button:has-text("Save issue")')
}

const getIssueName = (postfix: string = generateId(5)): string => `issue-${postfix}`

test('use-kanban', async ({ page }) => {
  await navigate(page)
  const name = getIssueName()
  const status = 'In Progress'
  await createIssue(page, { name, status })

  await page.locator('text="Issues"').click()
  await page.click('[name="tooltip-tracker:string:Board"]')
  await expect(page.locator(`.panel-container:has-text("${status}")`)).toContainText(name)
})

const defaultStatuses = ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled']

test.describe('issues-status-display', () => {
  const panelStatusMap = new Map([
    ['Issues', defaultStatuses],
    ['Active', ['Todo', 'In Progress']],
    ['Backlog', ['Backlog']]
  ])
  test.beforeEach(async ({ page }) => {
    await navigate(page)
    for (const status of defaultStatuses) {
      await createIssue(page, { name: getIssueName(status), status })
    }
  })
  for (const [panel, statuses] of panelStatusMap) {
    const excluded = defaultStatuses.filter((status) => !statuses.includes(status))
    test(`${panel}-panel`, async ({ page }) => {
      const locator = page.locator('.antiPanel-component >> .antiPanel-component')
      await page.locator(`text="${panel}"`).click()
      await page.click('[name="tooltip-view:string:Table"]')
      await expect(locator).toContainText(statuses)
      if (excluded.length > 0) await expect(locator).not.toContainText(excluded)
      await page.click('[name="tooltip-tracker:string:Board"]')
      if (excluded.length > 0) await expect(locator).not.toContainText(excluded)
      for (const status of statuses) {
        await expect(page.locator(`.panel-container:has-text("${status}")`)).toContainText(getIssueName(status))
      }
    })
  }
})
