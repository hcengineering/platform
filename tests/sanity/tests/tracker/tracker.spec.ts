import { expect, test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { PlatformSetting, fillSearch, generateId } from '../utils'
import {
  DEFAULT_STATUSES,
  ViewletSelectors,
  checkIssueDraft,
  createIssue,
  navigate,
  openIssue,
  toTime
} from './tracker.utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'

test.use({
  storageState: PlatformSetting
})

const getIssueName = (postfix: string = generateId()): string => `issue-${postfix}`

const panelStatusMap = new Map([
  ['Issues/All', DEFAULT_STATUSES],
  ['Issues/Active', ['Todo', 'In Progress']],
  ['Issues/Backlog', ['Backlog']]
])

test.describe('Tracker tests', () => {
  test('issues-status-display', async ({ page }) => {
    const locator = page.locator('.list-container')
    await navigate(page)
    for (const status of DEFAULT_STATUSES) {
      await createIssue(page, { name: getIssueName(status), status })
    }
    for (const [panel, statuses] of panelStatusMap) {
      const pPage = panel.split('/')
      await performPanelTest(statuses, pPage[0], pPage[1])
    }

    async function performPanelTest (statuses: string[], panel: string, mode: string): Promise<void> {
      const excluded = DEFAULT_STATUSES.filter((status) => !statuses.includes(status))
      await new TrackerNavigationMenuPage(page).openIssuesForProject('Default')
      await page.locator(`.ac-header .overflow-label:has-text("${mode}")`).click()
      await page.click(ViewletSelectors.Table)
      for (const s of statuses) {
        await expect(locator).toContainText(s)
      }
      if (excluded.length > 0) {
        await expect(locator).not.toContainText(excluded)
      }
      await page.click(ViewletSelectors.Board)

      if (excluded.length > 0) {
        await expect(locator).not.toContainText(excluded)
      }
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
    const issuesPage = new IssuesPage(page)
    await issuesPage.searchIssueByName(name)

    await page.click('[data-id="tab-assigned"]')
    await expect(page.locator('.antiPanel-component')).not.toContainText(name)
    await page.click('[data-id="tab-created"]')
    await page.waitForTimeout(3000)
    await expect(page.locator('.antiPanel-component')).toContainText(name)
    await page.click('[data-id="tab-subscribed"]')
    await page.waitForTimeout(3000)
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
    const values = [2, 4, 6, 8]
    for (let i = 0; i < 5; i++) {
      const random = Math.floor(Math.random() * values.length)
      const time = values[random]
      const name = getIssueName()
      try {
        await page.evaluate(() => {
          localStorage.setItem('#platform.notification.timeout', '5000')
        })
        await createIssue(page, { name, assignee, status })
        await page.waitForSelector(`text="${name}"`)
        await page.waitForSelector('text="View issue"')
        await page.click('text="View issue"')
      } finally {
        await page.evaluate(() => {
          localStorage.setItem('#platform.notification.timeout', '0')
        })
      }

      await page.click('#ReportedTimeEditor')
      await page.waitForSelector('text="Time spent reports"')
      await page.click('#ReportsPopupAddButton')
      await page.waitForSelector('text="Add time report"')
      await expect(page.locator('button:has-text("Create")')).toBeDisabled()
      await page.fill('[placeholder="Spent time"]', `${time}`)
      await expect(page.locator('button:has-text("Create")')).toBeEnabled()
      await page.click('button:has-text("Create")')
      await page.click('#card-close')

      await expect(page.locator('#ReportedTimeEditor')).toContainText(await toTime(time))
    }
  })

  test('report-multiple-time-from-issue-card', async ({ page }) => {
    await navigate(page)
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const time = 0.25

    const name = getIssueName()

    try {
      await page.evaluate(() => {
        localStorage.setItem('#platform.notification.timeout', '5000')
      })
      await createIssue(page, { name, assignee, status })
      await page.waitForSelector(`text="${name}"`)
      await page.waitForSelector('text="View issue"')
      await page.click('text="View issue"')
    } finally {
      await page.evaluate(() => {
        localStorage.setItem('#platform.notification.timeout', '0')
      })
    }

    await page.click('#ReportedTimeEditor')

    for (let i = 0; i < 5; i++) {
      await expect(page.locator('.antiCard-content >> .footer')).toContainText(`Total: ${i}`)
      await page.waitForSelector('text="Time spent reports"')
      await page.click('#ReportsPopupAddButton')
      await page.waitForSelector('text="Add time report"')
      await expect(page.locator('button:has-text("Create")')).toBeDisabled()
      await page.fill('[placeholder="Spent time"]', `${time}`)
      await expect(page.locator('button:has-text("Create")')).toBeEnabled()
      await page.click('button:has-text("Create")')
      await expect(page.locator('.antiCard-content >> .footer')).toContainText(`Total: ${i + 1}`)
    }
  })

  test('report-time-from-main-view', async ({ page }) => {
    await navigate(page)

    await page.click('text="Issues"')
    await page.keyboard.press('Escape')

    const values = [2, 4, 6, 8]
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const name = getIssueName()
    try {
      await page.evaluate(() => {
        localStorage.setItem('#platform.notification.timeout', '5000')
      })
      await createIssue(page, { name, assignee, status })
      await page.waitForSelector(`text="${name}"`)
      await page.waitForSelector('text="View issue"')
      await page.click('text="View issue"')
    } finally {
      await page.evaluate(() => {
        localStorage.setItem('#platform.notification.timeout', '0')
      })
    }

    // await page.click('.close-button > .antiButton')

    // We need to fait for indexer to complete indexing.
    await fillSearch(page, name)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.waitDetailsOpened(name)

    let count = 0
    for (let j = 0; j < 5; j++) {
      const random = Math.floor(Math.random() * values.length)
      const time = values[random]
      count += time
      await page.click('text="Issues"')
      const issuesPage = new IssuesPage(page)
      await issuesPage.modelSelectorAll.click()
      await page.click('button:has-text("View")')
      await page.click('.ordering >> nth=0')
      await page.locator('button.menu-item', { hasText: 'Modified date' }).click()
      await page.keyboard.press('Escape')

      await page.locator('.estimation-container').first().click()
      await page.waitForSelector('text="Estimation"')

      await page.click('button:has-text("Add time report")')
      await page.waitForSelector('[id="tracker\\:string\\:TimeSpendReportAdd"] >> text=Add time report')
      await expect(page.locator('button:has-text("Create")')).toBeDisabled()
      await page.fill('[placeholder="Spent time"]', `${time}`)
      await expect(page.locator('button:has-text("Create")')).toBeEnabled()
      await page.click('button:has-text("Create")')
      await page.click('#card-close')

      await expect(page.locator('.estimation-container >> span').first()).toContainText(await toTime(count))
    }
  })

  test('create-issue-draft', async ({ page }) => {
    await navigate(page)

    const issueName = 'Draft issue'

    // Click text=Issues >> nth=1
    await page.locator('text=Issues').nth(2).click()
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
    await page.locator('.ml-2 > .antiButton').click()

    // Click button:has-text("No due date")
    await page.locator('button:has-text("Due date")').click()
    // Click text=24 >> nth=0
    await page.locator('.date-popup-container div.day >> text=24').first().click()

    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')

    await page.locator('#new-issue').click()
    await checkIssueDraft(page, {
      name: issueName,
      description: issueName,
      status: 'Todo',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      estimation: '1h',
      dueDate: '24'
    })
  })
})
