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

const defaultStatuses = ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled']
const defaultPriorities = ['No priority', 'Urgent', 'High', 'Medium', 'Low']
const defaultUser = 'John Appleseed'

test.describe('create-issue-and-sub-issue', () => {
  const labels = ['label', 'another-label']
  async function testIssue (page: Page, props: IssueProps): Promise<void> {
    await createIssue(page, props)
    await page.click('text="Issues"')
    await page.click(`.antiList__row :has-text("${props.name}") .issuePresenter`)
    await checkIssue(page, props)
    props.name = `sub${props.name}`
    await createSubissue(page, props)
    await page.click(`span:has-text("${props.name}")`)
    await checkIssue(page, props)
  }
  test.beforeEach(async ({ page }) => await navigate(page))

  test('with-description', async ({ page }) =>
    await testIssue(page, { name: getIssueName(), description: 'some-description' }))

  test('with-assignee', async ({ page }) => await testIssue(page, { name: getIssueName(), assignee: defaultUser }))

  test.describe('with-status', () => {
    for (const status of defaultStatuses) {
      test(status, async ({ page }) => await testIssue(page, { name: getIssueName(), status }))
    }
  })

  test.describe('with-priority', () => {
    for (const priority of defaultPriorities) {
      test(priority, async ({ page }) => await testIssue(page, { name: getIssueName(), priority }))
    }
  })

  test('with-labels', async ({ page }) => {
    for (const label of labels) {
      await createLabel(page, { label })
    }
    await testIssue(page, { name: getIssueName(), labels })
  })

  test('with-all-props', async ({ page }) => {
    for (const label of labels) {
      await createLabel(page, { label })
    }
    await testIssue(page, {
      name: getIssueName(),
      description: 'description',
      labels,
      status: defaultStatuses[0],
      priority: defaultPriorities[0],
      assignee: defaultUser
    })
  })
})

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
      await page.click('[name="tooltip-tracker:string:List"]')
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

test('save-active-viewlet', async ({ page }) => {
  const panels = ['Issues', 'Active', 'Backlog']
  const viewletTooltips = ['Board', 'List']
  await navigate(page)
  for (const viewletTooltip of viewletTooltips) {
    for (const panel of panels) {
      await page.click(`text="${panel}"`)
      await page.click(`[name="tooltip-tracker:string:${viewletTooltip}"]`)
    }
    for (const panel of panels) {
      await page.click(`text="${panel}"`)
      await expect(page.locator(`[name="tooltip-tracker:string:${viewletTooltip}"] >> button`)).toHaveClass(/selected/)
    }
  }
})
