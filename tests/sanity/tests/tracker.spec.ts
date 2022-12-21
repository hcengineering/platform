import { test, expect } from '@playwright/test'
import {
  checkIssue,
  createIssue,
  createLabel,
  createSubissue,
  DEFAULT_STATUSES,
  DEFAULT_USER,
  navigate,
  openIssue,
  ViewletSelectors
} from './tracker.utils'
import { generateId, PlatformSetting } from './utils'
test.use({
  storageState: PlatformSetting
})

test('create-issue-and-sub-issue', async ({ page }) => {
  const props = {
    name: getIssueName(),
    description: 'description',
    labels: ['label', 'another-label'],
    status: DEFAULT_STATUSES[0],
    priority: 'Urgent',
    assignee: DEFAULT_USER
  }
  await navigate(page)
  for (const label of props.labels) {
    await createLabel(page, label)
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
    ['Issues', DEFAULT_STATUSES],
    ['Active', ['Todo', 'In Progress']],
    ['Backlog', ['Backlog']]
  ])
  const locator = page.locator('.issueslist-container')
  await navigate(page)
  for (const status of DEFAULT_STATUSES) {
    await createIssue(page, { name: getIssueName(status), status })
  }
  for (const [panel, statuses] of panelStatusMap) {
    const excluded = DEFAULT_STATUSES.filter((status) => !statuses.includes(status))
    await page.locator(`text="${panel}"`).click()
    await page.click(ViewletSelectors.Table)
    await expect(locator).toContainText(statuses)
    if (excluded.length > 0) await expect(locator).not.toContainText(excluded)
    await page.click(ViewletSelectors.Board)
    if (excluded.length > 0) await expect(locator).not.toContainText(excluded)
    for (const status of statuses) {
      await expect(page.locator(`.panel-container:has-text("${status}")`)).toContainText(getIssueName(status))
    }
  }
})

test('save-view-options', async ({ page }) => {
  const panels = ['Issues', 'Active', 'Backlog']
  await navigate(page)
  for (const viewletSelector of [ViewletSelectors.Board, ViewletSelectors.Table]) {
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
