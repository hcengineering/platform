import { test, expect, Page } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
test.use({
  storageState: PlatformSetting
})

async function navigate (page: Page): Promise<void> {
  await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/sanity-ws`)
  await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')
  await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/sanity-ws/tracker`)
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
  await page.waitForSelector('span:has-text("Default")')
  await page.click('button:has-text("New issue")')
  await fillIssueForm(page, props)
  await page.click('button:has-text("Save issue")')
  await page.waitForSelector('form.antiCard', { state: 'detached' })
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
  await page.waitForSelector('form.antiCard[id="tags:string:AddTag"]', { state: 'detached' })
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
const defaultUser = 'Appleseed John'
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
  await page.click('.buttons-group > div > .button')
  await page.waitForTimeout(100)
  await page.keyboard.press('Escape')
  await expect(page.locator('.antiPanel-component')).not.toContainText(name)
})

test('report-time-from-issue-card', async ({ page }) => {
  await navigate(page)
  const assignee = 'Chen Rosamund'
  const status = 'In Progress'
  const values = [0.25, 0.5, 0.75, 1]
  for (let i = 0; i < 10; i++) {
    const random = Math.floor(Math.random() * values.length)
    const time = values[random]
    const name = getIssueName()
    await createIssue(page, { name, assignee, status })
    await page.waitForSelector(`text="${name}"`)
    await page.waitForSelector('text="View issue"')
    await page.click('text="View issue"')

    await page.click('#ReportedTimeEditor')
    await page.waitForSelector('text="Time spend reports"')
    await page.click('#ReportsPopupAddButton')
    await page.waitForSelector('text="Add time report"')
    await expect(page.locator('button:has-text("Create")')).toBeDisabled()
    await page.fill('[placeholder="Reported\\ time"]', `${time}`)
    await expect(page.locator('button:has-text("Create")')).toBeEnabled()
    await page.click('button:has-text("Create")')
    await page.click('#card-close')

    await expect(page.locator('#TimeSpendReportValue')).toContainText(`${time}d`)
  }
})

test('report-time-from-main-view', async ({ page }) => {
  await navigate(page)

  await page.click('text="Issues"')
  await page.click('button:has-text("View")')
  await page.click('text="Status" >> nth=1')
  await page.click('text="Last updated"')
  await page.keyboard.press('Escape')

  const values = [0.25, 0.5, 0.75, 1]
  const assignee = 'Chen Rosamund'
  const status = 'In Progress'
  const name = getIssueName()

  await createIssue(page, { name, assignee, status })
  await page.waitForSelector(`text="${name}"`)
  await page.click('.close-button > .button')

  let count = 0
  for (let j = 0; j < 5; j++) {
    const random = Math.floor(Math.random() * values.length)
    const time = values[random]
    count += time
    await page.locator('.estimation-container').first().click()
    await page.waitForSelector('text="Estimation"')

    await page.click('button:has-text("Add time report")')
    await page.waitForSelector('.antiCard-header >> .antiCard-header__title-wrap >> span:has-text("Add time report")')
    await expect(page.locator('button:has-text("Create")')).toBeDisabled()
    await page.fill('[placeholder="Reported\\ time"]', `${time}`)
    await expect(page.locator('button:has-text("Create")')).toBeEnabled()
    await page.click('button:has-text("Create")')
    await page.click('#card-close')

    await expect(page.locator('.estimation-container >> span').first()).toContainText(`${Number(count.toFixed(2))}d`)
  }
})
