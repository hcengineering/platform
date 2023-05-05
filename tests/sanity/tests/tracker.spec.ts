import { expect, test } from '@playwright/test'
import {
  DEFAULT_STATUSES,
  DEFAULT_USER,
  ViewletSelectors,
  checkIssue,
  createIssue,
  createLabel,
  createSubissue,
  fillIssueForm,
  navigate,
  openIssue
} from './tracker.utils'
import { PlatformSetting, generateId } from './utils'
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

  await page.locator('[placeholder="Search"]').click()
  await page.locator('[placeholder="Search"]').fill(props.name)
  await page.locator('[placeholder="Search"]').press('Enter')

  await openIssue(page, props.name)
  await checkIssue(page, props)
  props.name = `sub${props.name}`
  await createSubissue(page, props)
  await page.click(`span[title=${props.name}]`)
  await checkIssue(page, props)
})

const getIssueName = (postfix: string = generateId(5)): string => `issue-${postfix}`

const panelStatusMap = new Map([
  ['Issues', DEFAULT_STATUSES],
  ['Active', ['Todo', 'In Progress']],
  ['Backlog', ['Backlog']]
])

test('issues-status-display', async ({ page }) => {
  const locator = page.locator('.list-container')
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
      await expect(
        page.locator('.panel-container', {
          has: page.locator(`.header:has-text("${status}")`)
        })
      ).toContainText(getIssueName(status), { timeout: 15000 })
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
  await page.click('[data-id="tab-assigned"]')
  await expect(page.locator('.antiPanel-component')).not.toContainText(name)
  await page.click('[data-id="tab-created"]')
  await expect(page.locator('.antiPanel-component')).toContainText(name)
  await page.click('[data-id="tab-subscribed"]')
  await expect(page.locator('.antiPanel-component')).toContainText(name)
  await openIssue(page, name)
  // click "Don't track"
  await page.click('button:has-text("Appleseed John") >> nth=1')
  await page.click('.selectPopup >> button:has-text("Appleseed John")')
  await page.waitForTimeout(100)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(page.locator('.antiPanel-component')).not.toContainText(name)
})

test('report-time-from-issue-card', async ({ page }) => {
  await navigate(page)
  const assignee = 'Chen Rosamund'
  const status = 'In Progress'
  const values = [0.25, 0.5, 0.75, 1]
  for (let i = 0; i < 5; i++) {
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
    await page.fill('[placeholder="Reported\\ days"]', `${time}`)
    await expect(page.locator('button:has-text("Create")')).toBeEnabled()
    await page.click('button:has-text("Create")')
    await page.click('#card-close')

    await expect(page.locator('#ReportedTimeEditor')).toContainText(`${time}d`)
  }
})

test('report-time-from-main-view', async ({ page }) => {
  await navigate(page)

  await page.click('text="Issues"')
  await page.click('button:has-text("View")')
  await page.click('.ordering >> nth=0')
  await page.click('text="Modified date"')
  await page.keyboard.press('Escape')

  const values = [0.25, 0.5, 0.75, 1]
  const assignee = 'Chen Rosamund'
  const status = 'In Progress'
  const name = getIssueName()

  await createIssue(page, { name, assignee, status })

  // await page.click('.close-button > .button')

  // We need to fait for indexer to complete indexing.
  await page.locator('[placeholder="Search"]').click()
  await page.locator('[placeholder="Search"]').fill(name)
  await page.locator('[placeholder="Search"]').press('Enter')

  await page.waitForSelector(`text="${name}"`, { timeout: 15000 })

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
    await page.fill('[placeholder="Reported\\ days"]', `${time}`)
    await expect(page.locator('button:has-text("Create")')).toBeEnabled()
    await page.click('button:has-text("Create")')
    await page.click('#card-close')

    await expect(page.locator('.estimation-container >> span').first()).toContainText(`${Number(count.toFixed(2))}d`)
  }
})

test('create-issue-draft', async ({ page }) => {
  await navigate(page)

  const issueName = 'Draft issue'
  const subIssueName = 'Sub issue draft'

  // Click text=Issues >> nth=1
  await page.locator('text=Issues').nth(1).click()
  await expect(page).toHaveURL(/.*\/workbench\/sanity-ws\/tracker\/tracker%3Aproject%3ADefaultProject\/issues/)
  await expect(page.locator('#new-issue')).toHaveText('New issue')
  // Click button:has-text("New issue")
  await page.locator('#new-issue').click()

  // Click [placeholder="Issue title"]
  await page.locator('#issue-name').click()
  // Fill [placeholder="Issue title"]
  await page.locator('#issue-name >> input').fill(issueName)
  await expect(page.locator('#new-issue')).toHaveText('Resume draft')

  await page.locator('#issue-description').click()
  await page.locator('#issue-description >> [contenteditable]').fill(issueName)

  // Click button:has-text("Backlog")
  await page.locator('#status-editor').click()
  // Click button:has-text("Todo")
  await page.locator('button:has-text("Todo")').click()

  // Click button:has-text("No priority")
  await page.locator('#priority-editor').click()
  // Click button:has-text("Urgent")
  await page.locator('button:has-text("Urgent")').click()
  // Click button:has-text("Assignee")
  await page.locator('#assignee-editor').click()
  // Click button:has-text("Appleseed John")
  await page.locator('button:has-text("Appleseed John")').click()
  // Click button:has-text("0d")
  await page.locator('#estimation-editor').click()
  // Click [placeholder="Type text\.\.\."]
  await page.locator('[placeholder="Type text\\.\\.\\."]').click()
  // Fill [placeholder="Type text\.\.\."]
  await page.locator('[placeholder="Type text\\.\\.\\."]').fill('1')
  await page.locator('.ml-2 > .button').click()

  // Click button:nth-child(8)
  await page.locator('#more-actions').click()
  // Click button:has-text("Set due date…")
  await page.locator('button:has-text("Set due date…")').click()
  // Click text=24 >> nth=0
  await page.locator('.date-popup-container >> text=24').first().click()
  // Click button:has-text("+ Add sub-issues")
  await page.locator('button:has-text("+ Add sub-issues")').click()
  // Click [placeholder="Sub-issue title"]
  await page.locator('#sub-issue-name').click()
  // Fill [placeholder="Sub-issue title"]
  await page.locator('#sub-issue-name >> input').fill(subIssueName)

  await page.locator('#sub-issue-description').click()
  await page.locator('#sub-issue-description >> [contenteditable]').fill(subIssueName)

  // Click button:has-text("Backlog")
  await page.locator('#sub-issue-status-editor').click()
  // Click button:has-text("In Progress")
  await page.locator('button:has-text("In Progress")').click()
  // Click button:has-text("No priority")
  await page.locator('#sub-issue-priority-editor').click()
  // Click button:has-text("High")
  await page.locator('button:has-text("High")').click()
  // Click button:has-text("Assignee")
  await page.locator('#sub-issue-assignee-editor').click()
  // Click button:has-text("Chen Rosamund")
  await page.locator('button:has-text("Chen Rosamund")').click()
  // Click button:has-text("0d")
  await page.locator('#sub-issue-estimation-editor').click()
  // Double click [placeholder="Type text\.\.\."]
  await page.locator('[placeholder="Type text\\.\\.\\."]').dblclick()
  // Fill [placeholder="Type text\.\.\."]
  await page.locator('[placeholder="Type text\\.\\.\\."]').fill('2')
  await page.locator('.ml-2 > .button').click()

  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  await page.locator('#new-issue').click()
  await expect(page.locator('#issue-name')).toHaveText(issueName)
  await expect(page.locator('#issue-description')).toHaveText(issueName)
  await expect(page.locator('#status-editor')).toHaveText('Todo')
  await expect(page.locator('#priority-editor')).toHaveText('Urgent')
  await expect(page.locator('#assignee-editor')).toHaveText('Appleseed John')
  await expect(page.locator('#estimation-editor')).toHaveText('1d')
  await expect(page.locator('.antiCard >> .datetime-button')).toContainText('24')
  await expect(page.locator('#sub-issue-name')).toHaveText(subIssueName)
  await expect(page.locator('#sub-issue-description')).toHaveText(subIssueName)
  await expect(page.locator('#sub-issue-status-editor')).toHaveText('In Progress')
  await expect(page.locator('#sub-issue-priority-editor')).toHaveText('High')
  await expect(page.locator('#sub-issue-assignee-editor')).toHaveText('Chen Rosamund')
  await expect(page.locator('#sub-issue-estimation-editor')).toHaveText('2d')
})

test('sub-issue-draft', async ({ page }) => {
  await navigate(page)

  const props = {
    name: getIssueName(),
    description: 'description',
    status: DEFAULT_STATUSES[1],
    priority: 'Urgent',
    assignee: DEFAULT_USER
  }
  const originalName = props.name
  await navigate(page)
  await createIssue(page, props)
  await page.click('text="Issues"')

  await page.locator('[placeholder="Search"]').click()
  await page.locator('[placeholder="Search"]').fill(props.name)
  await page.locator('[placeholder="Search"]').press('Enter')

  await openIssue(page, props.name)
  await checkIssue(page, props)
  props.name = `sub${props.name}`
  await page.click('button:has-text("Add sub-issue")')
  await fillIssueForm(page, props, false)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  await openIssue(page, originalName)
  await expect(page.locator('#sub-issue-child-editor >> #sub-issue-name')).toHaveText(props.name)
  await expect(page.locator('#sub-issue-child-editor >> #sub-issue-description')).toHaveText(props.description)
  await expect(page.locator('#sub-issue-child-editor >> #sub-issue-priority')).toHaveText(props.priority)
  await expect(page.locator('#sub-issue-child-editor >> #sub-issue-assignee')).toHaveText(props.assignee)
})
