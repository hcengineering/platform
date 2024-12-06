import { expect, Page } from '@playwright/test'
import { generateId, PlatformURI } from '../utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'

export interface IssueProps {
  name: string
  description?: string
  status?: string
  labels?: string[]
  priority?: string
  assignee?: string
  component?: string
  milestone?: string
  estimation?: string
  dueDate?: string
  taskType?: string
}

export enum ViewletSelectors {
  Table = 'label[data-view*="List"]',
  Board = 'label[data-view*="Board"]'
}

export const PRIORITIES = ['No priority', 'Urgent', 'High', 'Medium', 'Low']
export const DEFAULT_STATUSES = ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled']
export const DEFAULT_USER = 'Appleseed John'

export const DEFAULT_STATUSES_ID = new Map([
  ['Backlog', 'task:statusCategory:UnStarted'],
  ['Todo', 'task:statusCategory:ToDo'],
  ['In Progress', 'task:statusCategory:Active'],
  ['Done', 'task:statusCategory:Won'],
  ['Canceled', 'task:statusCategory:Lost']
])

export async function navigate (page: Page): Promise<void> {
  await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
}

export async function setViewGroup (page: Page, groupName: string): Promise<void> {
  await page.click('button[data-id="btn-viewOptions"]')
  await page.click('.antiCard >> .grouping >> button >> nth=0')
  await page.click(`.menu-item:has-text("${groupName}")`)
  await expect(page.locator('.antiCard >> .grouping >> button >> nth=0')).toContainText(groupName)

  await page.keyboard.press('Escape')
}

export async function setViewOrder (page: Page, orderName: string): Promise<void> {
  await page.click('button[data-id="btn-viewOptions"]')
  await page.click('.antiCard >> .ordering >> button')
  await page.click(`.menu-item:has-text("${orderName}")`)
  await expect(page.locator('.antiCard >> .ordering >> button')).toContainText(orderName)

  await page.keyboard.press('Escape')
}

export async function fillIssueForm (page: Page, props: IssueProps): Promise<void> {
  const { name, description, status, assignee, labels, priority, component, milestone, taskType } = props
  const af = 'form '

  if (taskType !== undefined) {
    await page.click(af + 'button[data-id="btnSelectTaskType"]')
    await page.click(`.menu-item:has-text("${taskType}")`)
  }

  const issueTitle = page.locator(af + '[placeholder="Issue\\ title"]')
  await issueTitle.fill(name)
  await issueTitle.evaluate((e) => {
    e.blur()
  })

  if (description !== undefined) {
    const pm = page.locator(af + '.ProseMirror')
    await pm.fill(description)
    await pm.evaluate((e) => {
      e.blur()
    })
  }
  if (status !== undefined) {
    await page.click(af + '#status-editor')
    await page.click(`.menu-item:has-text("${status}")`)
  }
  if (priority !== undefined) {
    await page.click(af + 'button:has-text("No priority")')
    await page.click(`.selectPopup button:has-text("${priority}")`)
  }
  if (labels !== undefined) {
    await page.click(af + '.antiButton:has-text("Labels")')
    for (const label of labels) {
      await page.click(`.selectPopup button:has-text("${label}") >> nth=0`)
    }
    await page.keyboard.press('Escape')
  }
  if (assignee !== undefined) {
    await page.click(af + '.antiButton:has-text("Assignee")')
    await page.click(`.selectPopup button:has-text("${assignee}")`)
  }
  if (component !== undefined) {
    await page.click(af + '.antiButton:has-text("Component")')
    await page.click(`.selectPopup button:has-text("${component}")`)
  }
  if (milestone !== undefined) {
    await page.click(af + '.antiButton:has-text("Milestone")')
    await page.click(`.selectPopup button:has-text("${milestone}")`)
  }
}

export async function createIssue (page: Page, props: IssueProps): Promise<void> {
  await page.waitForSelector('span:has-text("Default")')
  await page.click('button:has-text("New issue")')
  await fillIssueForm(page, props)
  await page.click('form button:has-text("Create issue")')
  await page.waitForSelector('form.antiCard', { state: 'detached' })
}

export async function createComponent (page: Page, componentName: string): Promise<void> {
  await page
    .locator('[id="navGroup-tracker\\:project\\:DefaultProject"]')
    .getByRole('button', { name: 'Components' })
    .click()
  await expect(page).toHaveURL(
    `${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/components`
  )
  await page.getByRole('button', { name: 'Component', exact: true }).click()
  await page.click('[placeholder="Component\\ name"]')
  await page.fill('[placeholder="Component\\ name"]', componentName)
  await page.click('button:has-text("Create component")')
}

export async function createMilestone (page: Page, milestoneName: string): Promise<void> {
  await page
    .locator('[id="navGroup-tracker\\:project\\:DefaultProject"]')
    .getByRole('button', { name: 'Milestones' })
    .click()
  await expect(page).toHaveURL(
    `${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/milestones`
  )
  await page.getByRole('button', { name: 'Milestone', exact: true }).click()
  await page.click('[placeholder="Milestone\\ name"]')
  await page.fill('[placeholder="Milestone\\ name"]', milestoneName)
  await page.click('button:has-text("Create")')
}

export async function createSubissue (page: Page, props: IssueProps): Promise<void> {
  await page.click('button:has-text("Add sub-issue")')
  await fillIssueForm(page, props)
  await page.click('button:has-text("Create issue")')
}

export async function createLabel (page: Page, label: string): Promise<void> {
  await page.click('button:has-text("New issue")')
  await page.click('button:has-text("Labels")')
  await page.click('button:nth-child(3)')
  await page.fill('[id="tags:string:AddTag"] >> input >> nth=0', label)
  await page.click('[id="tags:string:AddTag"] >> button:has-text("Create")')
  await page.waitForSelector('form.antiCard[id="tags:string:AddTag"]', { state: 'detached' })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  await page.keyboard.press('Escape')
}

export async function checkIssue (page: Page, props: IssueProps): Promise<void> {
  const { name, description, status, assignee, labels, priority, component, milestone } = props

  if (name !== undefined) {
    await expect(page.locator('.popupPanel.panel')).toContainText(name)
  }
  if (description !== undefined) {
    await expect(page.locator('.popupPanel.panel')).toContainText(description)
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
  if (component !== undefined) {
    await expect(asideLocator).toContainText(component)
  }
  if (milestone !== undefined) {
    await expect(asideLocator).toContainText(milestone)
  }
}

export async function checkIssueDraft (page: Page, props: IssueProps): Promise<void> {
  await expect(page.locator('#issue-name input')).toHaveValue(props.name)

  if (props.description !== undefined) {
    await expect(page.locator('#issue-description')).toHaveText(props.description)
  }

  if (props.status !== undefined) {
    await expect(page.locator('#status-editor')).toHaveText(props.status)
  }

  if (props.priority !== undefined) {
    await expect(page.locator('#priority-editor')).toHaveText(props.priority)
  }

  if (props.assignee !== undefined) {
    await expect(page.locator('#assignee-editor')).toHaveText(props.assignee)
  }

  if (props.estimation !== undefined) {
    await expect(page.locator('#estimation-editor')).toHaveText(convertEstimation(props.estimation))
  }

  if (props.dueDate !== undefined) {
    await expect(page.locator('.antiCard >> .datetime-button')).toContainText(props.dueDate)
  }
}

export async function checkIssueFromList (page: Page, issueName: string): Promise<void> {
  await page.click(ViewletSelectors.Board)
  await expect(page.locator(`.panel-container:has-text("${issueName}")`)).toContainText(issueName)
}

export async function openIssue (page: Page, name: string): Promise<void> {
  await page.click(`.antiList__row:has-text("${name}") .presenter-label a`, {
    timeout: 15000
  })
}

export async function floorFractionDigits (n: number | string, amount: number): Promise<number> {
  return Number(Number(n).toFixed(amount))
}

export async function toTime (value: number): Promise<string> {
  if (value <= 0) {
    return '0h'
  }

  // TODO: Make configurable?
  const hoursInWorkingDay = 8

  const days = Math.floor(value / hoursInWorkingDay)
  const hours = Math.floor(value % hoursInWorkingDay)
  const minutes = Math.floor((value % 1) * 60)

  return [
    ...(days > 0 ? [`${days}d`] : []),
    ...(hours > 0 ? [`${hours}h`] : []),
    ...(minutes > 0 ? [`${minutes}m`] : [])
  ].join(' ')
}
export const getIssueName = (postfix: string = generateId()): string => `issue-${postfix}`

/**
 * Return random capitalized string like "AFJKD"
 *
 * @returns string
 */
export function generateProjectId (size: number = 5): string {
  return Array.from({ length: size }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
}

export async function performPanelTest (page: Page, statuses: string[], panel: string, mode: string): Promise<void> {
  const locator = page.locator('.list-container')
  const excluded = DEFAULT_STATUSES.filter((status) => !statuses.includes(status))
  await new TrackerNavigationMenuPage(page).openIssuesForProject('Default')
  await page.locator(`.switcher-container span:has-text("${mode}")`).click()
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

export function convertEstimation (estimation: number | string): string {
  const hoursInWorkingDay = 8
  const value = typeof estimation === 'string' ? parseFloat(estimation) : estimation

  const days = Math.floor(value / hoursInWorkingDay)
  const hours = Math.floor(value % hoursInWorkingDay)
  const minutes = Math.floor((value % 1) * 60)
  const result = [
    ...(days === 0 ? [] : [`${days}d`]),
    ...(hours === 0 ? [] : [`${hours}h`]),
    ...(minutes === 0 ? [] : [`${minutes}m`])
  ].join(' ')

  return result === '' ? '0h' : result
}
