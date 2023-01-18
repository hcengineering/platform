import { test, expect, Page } from '@playwright/test'
import {
  checkIssueFromList,
  createIssue,
  createProject,
  createSprint,
  DEFAULT_STATUSES,
  DEFAULT_USER,
  IssueProps,
  navigate,
  PRIORITIES,
  setViewGroup,
  setViewOrder,
  ViewletSelectors
} from './tracker.utils'
import { generateId, PlatformSetting } from './utils'
test.use({
  storageState: PlatformSetting
})

const getIssueName = (postfix: string = generateId(5)): string => `issue-${postfix}`

async function createIssues (page: Page, projects?: string[], sprints?: string[]): Promise<IssueProps[]> {
  const issuesProps = []
  for (let index = 0; index < 5; index++) {
    const shiftedIndex = 4 - index
    const name =
      sprints !== undefined
        ? getIssueName(`layout-${shiftedIndex}-${sprints[index % sprints.length]}`)
        : getIssueName(`layout-${shiftedIndex}`)
    const issueProps = {
      name,
      status: DEFAULT_STATUSES[shiftedIndex],
      assignee: shiftedIndex % 2 === 0 ? DEFAULT_USER : 'Chen Rosamund',
      priority: PRIORITIES[shiftedIndex],
      project: projects !== undefined ? projects[index % projects.length] : undefined,
      sprint: sprints !== undefined ? sprints[index % sprints.length] : undefined
    }
    issuesProps.push(issueProps)

    await createIssue(page, issueProps)
  }

  return issuesProps
}

async function createProjects (page: Page): Promise<string[]> {
  const projects = []

  for (let index = 0; index < 5; index++) {
    const prjId = `project-${generateId()}-${index}`
    projects.push(prjId)

    await createProject(page, prjId)
  }

  return projects
}

async function createSprints (page: Page): Promise<string[]> {
  const sprints = []

  for (let index = 0; index < 5; index++) {
    const sprintId = `sprint-${generateId()}-${index}`
    sprints.push(sprintId)

    await createSprint(page, sprintId)
  }

  return sprints
}

async function initIssues (page: Page): Promise<IssueProps[]> {
  const projects = await createProjects(page)
  const sprints = await createSprints(page)
  const issuesProps = await createIssues(page, projects, sprints)
  await page.click('text="Issues"')

  return issuesProps
}

test.describe('tracker layout tests', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await navigate(page)
    issuesProps = await initIssues(page)
  })

  let issuesProps: IssueProps[] = []
  const orders = ['Status', 'Modified', 'Priority'] as const
  const groups = ['Status', 'Assignee', 'Priority', 'Project', 'Sprint', 'No grouping'] as const
  const groupsLabels: { [key in typeof groups[number]]?: string[] } = {
    Status: DEFAULT_STATUSES,
    Assignee: [DEFAULT_USER, 'Chen Rosamund'],
    Priority: PRIORITIES,
    'No grouping': ['No grouping']
  }

  for (const group of groups) {
    test(`issues-${group.toLowerCase()}-grouping-layout`, async ({ page }) => {
      const locator = page.locator('.list-container')
      await setViewGroup(page, group)

      let groupLabels: any[]
      if (group === 'Sprint') {
        groupLabels = issuesProps.map((props) => props.sprint)
      } else if (group === 'Project') {
        groupLabels = issuesProps.map((props) => props.project)
      } else {
        groupLabels = groupsLabels[group] ?? []
      }
      const issueNames = issuesProps.map((props) => props.name)

      await page.click(ViewletSelectors.Table)
      await expect(locator).toContainText(groupLabels)

      for (const issueName of issueNames) {
        await checkIssueFromList(page, issueName)
      }
    })
  }

  for (const order of orders) {
    test(`issues-${order.toLowerCase()}-ordering-layout`, async ({ page }) => {
      const locator = page.locator('.panel-container')
      let orderedIssueNames: string[]

      if (order === 'Priority') {
        orderedIssueNames = issuesProps
          .sort((propsLeft, propsRight) => {
            if (propsLeft.priority === undefined || propsRight.priority === undefined) {
              return -1
            }

            if (propsLeft.priority === propsRight.priority) {
              return 0
            } else if (
              PRIORITIES.findIndex((p) => p === propsLeft.priority) -
                PRIORITIES.findIndex((p) => p === propsRight.priority) >
              0
            ) {
              return 1
            }
            return -1
          })
          .map((p) => p.name)
      } else if (order === 'Status') {
        orderedIssueNames = issuesProps
          .sort((propsLeft, propsRight) => {
            if (propsLeft.status !== undefined && propsRight.status !== undefined) {
              if (propsLeft.status === propsRight.status) {
                return 0
              } else if (
                DEFAULT_STATUSES.findIndex((s) => s === propsLeft.status) -
                  DEFAULT_STATUSES.findIndex((s) => s === propsRight.status) >
                0
              ) {
                return 1
              }
            }

            return -1
          })
          .map((p) => p.name)
      } else {
        orderedIssueNames = issuesProps.map((props) => props.name).reverse()
      }
      await setViewOrder(page, order)
      await page.click(ViewletSelectors.Board)
      await expect(locator).toContainText(orderedIssueNames)
    })
  }
})
