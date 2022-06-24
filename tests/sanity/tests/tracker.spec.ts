import { test, expect, Page } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
test.use({
  storageState: PlatformSetting
})

async function navigate (page: Page): Promise<void> {
  await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
  await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
  await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/tracker%3Aapp%3ATracker`)
}

interface IssueProps {
  name: string
  description?: string
  status?: string
  labels?: string[]
  priority?: string
  assignee?: string
}

async function fillIssueForm (
  page: Page,
  { name, description, status, assignee, labels, priority }: IssueProps
): Promise<void> {
  await page.fill('[placeholder="Issue\\ title"]', name)
  if (description !== undefined) {
    await page.fill('.ProseMirror', description)
  }
  if (status !== undefined) {
    await page.click('#status-editor')
    await page.click(`.menu-item:has-text("${status}")`)
  }
  if (priority !== undefined) {
    await page.click('button:has-text("No priority")')
    await page.click(`.selectPopup button:has-text("${priority}")`)
  }
  if (labels !== undefined) {
    await page.click('.button:has-text("Labels")')
    for (const label of labels) {
      await page.click(`.selectPopup button:has-text("${label}") >> nth=0`)
    }
    await page.keyboard.press('Escape')
  }
  if (assignee !== undefined) {
    await page.click('.button:has-text("Assignee")')
    await page.click(`.selectPopup button:has-text("${assignee}")`)
  }
}

async function createIssue (page: Page, props: IssueProps): Promise<void> {
  await page.click('button:has-text("New issue")')
  await fillIssueForm(page, props)
  await page.click('button:has-text("Save issue")')
}

async function createSubissue (page: Page, props: IssueProps): Promise<void> {
  await page.click('button:has-text("Add sub-issue")')
  await fillIssueForm(page, props)
  await page.click('button:has-text("Save")')
}

interface LabelProps {
  label: string
}
async function createLabel (page: Page, { label }: LabelProps): Promise<void> {
  await page.click('button:has-text("New issue")')
  await page.click('button:has-text("Labels")')
  await page.click('.buttons-group >> button >> nth=-1')
  await page.fill('[id="tags:string:AddTag"] >> input >> nth=0', label)
  await page.click('[id="tags:string:AddTag"] >> button:has-text("Create")')
  await page.waitForTimeout(100)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  await page.keyboard.press('Escape')
}

async function checkIssue (
  page: Page,
  { name, description, status, assignee, labels, priority }: IssueProps
): Promise<void> {
  if (name !== undefined) {
    await expect(page.locator('.popupPanel')).toContainText(name)
  }
  if (description !== undefined) {
    await expect(page.locator('.popupPanel')).toContainText(description)
  }
  const asideLocator = page.locator('.popupPanel-body__aside')
  if (status !== undefined) {
    await expect(asideLocator).toContainText(status)
  }
  if (labels !== undefined) {
    await expect(asideLocator).toContainText(labels)
  }
  if (priority !== undefined) {
    await expect(asideLocator).toContainText(priority)
  }
  if (assignee !== undefined) {
    await expect(asideLocator).toContainText(assignee)
  }
}

async function openIssue (page: Page, name: string): Promise<void> {
  await page.click(`.antiList__row:has-text("${name}") .issuePresenterRoot`)
}

const defaultStatuses = ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled']
const defaultUser = 'John Appleseed'
enum viewletSelectors {
  Table = '.tablist-container >> div.button:nth-child(1)',
  Board = '.tablist-container >> div.button:nth-child(2)'
}

test('create-issue-and-sub-issue', async ({ page }) => {
  const props = {
    name: getIssueName(),
    description: 'description',
    labels: ['label', 'another-label'],
    status: defaultStatuses[0],
    priority: 'Urgent',
    assignee: defaultUser
  }
  await navigate(page)
  for (const label of props.labels) {
    await createLabel(page, { label })
  }
  await createIssue(page, props)
  await page.click('text="Issues"')
  await openIssue(page, props.name)
  await checkIssue(page, props)
  props.name = `sub${props.name}`
  await createSubissue(page, props)
  await page.click(`span:has-text("${props.name}")`)
  await checkIssue(page, props)
})

const getIssueName = (postfix: string = generateId(5)): string => `issue-${postfix}`

test('issues-status-display', async ({ page }) => {
  const panelStatusMap = new Map([
    ['Issues', defaultStatuses],
    ['Active', ['Todo', 'In Progress']],
    ['Backlog', ['Backlog']]
  ])
  const locator = page.locator('.issueslist-container')
  await navigate(page)
  for (const status of defaultStatuses) {
    await createIssue(page, { name: getIssueName(status), status })
  }
  for (const [panel, statuses] of panelStatusMap) {
    const excluded = defaultStatuses.filter((status) => !statuses.includes(status))
    await page.locator(`text="${panel}"`).click()
    await page.click(viewletSelectors.Table)
    await expect(locator).toContainText(statuses)
    if (excluded.length > 0) await expect(locator).not.toContainText(excluded)
    await page.click(viewletSelectors.Board)
    if (excluded.length > 0) await expect(locator).not.toContainText(excluded)
    for (const status of statuses) {
      await expect(page.locator(`.panel-container:has-text("${status}")`)).toContainText(getIssueName(status))
    }
  }
})

test('save-view-options', async ({ page }) => {
  const panels = ['Issues', 'Active', 'Backlog']
  await navigate(page)
  for (const viewletSelector of [viewletSelectors.Board, viewletSelectors.Table]) {
    for (const panel of panels) {
      await page.click(`text="${panel}"`)
      await page.click(viewletSelector)
      await page.click('button:has-text("View")')
      await page.click('.antiCard >> button >> nth=0')
      await page.click('.menu-item:has-text("Assignee")')
      await page.keyboard.press('Escape')
    }
    for (const panel of panels) {
      await page.click(`text="${panel}"`)
      await expect(page.locator(viewletSelector)).toHaveClass(/selected/)
      await page.click('button:has-text("View")')
      await expect(page.locator('.antiCard >> button >> nth=0')).toContainText('Assignee')
      await page.keyboard.press('Escape')
    }
  }
})

test('my-issues', async ({ page }) => {
  const name = getIssueName()
  await navigate(page)
  await createIssue(page, { name })
  await page.click('text="My issues"')
  await page.click('button:has-text("Assigned")')
  await expect(page.locator('.antiPanel-component')).not.toContainText(name)
  await page.click('button:has-text("Created")')
  await expect(page.locator('.antiPanel-component')).toContainText(name)
  await page.click('button:has-text("Subscribed")')
  await expect(page.locator('.antiPanel-component')).toContainText(name)
  await openIssue(page, name)
  // click "Don't track"
  await page.click('.popupPanel-title :nth-child(3) >> button >> nth=1')
  await page.keyboard.press('Escape')
  await expect(page.locator('.antiPanel-component')).not.toContainText(name)
})
