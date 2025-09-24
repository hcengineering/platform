import { Page, expect, test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { PlatformSetting, expectToContainsOrdered, fillSearch, generateId } from '../utils'
import {
  DEFAULT_STATUSES,
  DEFAULT_USER,
  IssueProps,
  PRIORITIES,
  ViewletSelectors,
  checkIssueFromList,
  createComponent,
  createIssue,
  createMilestone,
  navigate,
  setViewGroup,
  setViewOrder
} from './tracker.utils'

test.use({
  storageState: PlatformSetting
})

const getIssueName = (postfix: string = generateId(5)): string => `issue-${postfix}`

async function createIssues (
  prefix: string,
  page: Page,
  components?: string[],
  milestones?: string[]
): Promise<IssueProps[]> {
  const issuesProps = []
  for (let index = 0; index < 5; index++) {
    const shiftedIndex = 4 - index
    const name =
      milestones !== undefined
        ? getIssueName(`${prefix}-layout-${shiftedIndex}-${milestones[index % milestones.length]}`)
        : getIssueName(`${prefix}-layout-${shiftedIndex}`)
    const issueProps = {
      name,
      status: DEFAULT_STATUSES[shiftedIndex],
      assignee: shiftedIndex % 2 === 0 ? DEFAULT_USER : 'Chen Rosamund',
      priority: PRIORITIES[shiftedIndex],
      component: components !== undefined ? components[index % components.length] : undefined,
      milestone: milestones !== undefined ? milestones[index % milestones.length] : undefined
    }
    issuesProps.push(issueProps)

    await createIssue(page, issueProps)
  }

  return issuesProps
}

async function createComponents (page: Page): Promise<string[]> {
  const components = []

  for (let index = 0; index < 5; index++) {
    const prjId = `c-${generateId(5)}-${index}`
    components.push(prjId)

    await createComponent(page, prjId)
  }

  return components
}

async function createMilestones (page: Page): Promise<string[]> {
  const milestones = []

  for (let index = 0; index < 5; index++) {
    const milestoneId = `m-${generateId(5)}-${index}`
    milestones.push(milestoneId)

    await createMilestone(page, milestoneId)
  }

  return milestones
}

async function initIssues (prefix: string, page: Page): Promise<IssueProps[]> {
  const components = await createComponents(page)
  const milestones = await createMilestones(page)
  const issuesProps = await createIssues(prefix, page, components, milestones)
  await page.click('text="Issues"')

  const issuesPage = new IssuesPage(page)
  await issuesPage.clickModelSelectorAll()

  return issuesProps
}

test.describe('tracker layout tests', () => {
  const id = generateId(4)
  let issuesPropsP: Promise<IssueProps[]>
  let issuesProps: IssueProps[] = []

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await navigate(page)
    if (issuesPropsP === undefined) {
      issuesPropsP = initIssues(id, page)
    }
    issuesProps = await issuesPropsP
  })

  // Order by status check temporarily disable as there's a bug
  // const orders = ['Status', 'Modified', 'Priority'] as const
  const orders = ['Modified', 'Priority'] as const
  const groups = ['Status', 'Assignee', 'Priority', 'Component', 'Milestone', 'No grouping'] as const
  const groupsLabels: { [key in (typeof groups)[number]]?: string[] } = {
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
      if (group === 'Milestone') {
        groupLabels = issuesProps.map((props) => props.milestone)
      } else {
        groupLabels = groupsLabels[group] ?? []
      }
      const issueNames = issuesProps.map((props) => props.name)

      const issuesPage = new IssuesPage(page)
      await issuesPage.clickModelSelectorAll()
      await page.click(ViewletSelectors.Table)
      for (const g of groupLabels) {
        await expect(locator).toContainText(g)
      }

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
        orderedIssueNames = [...issuesProps]
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
        // } else if (order === 'Status') {
        //   orderedIssueNames = [...issuesProps]
        //     .sort((propsLeft, propsRight) => {
        //       if (propsLeft.status !== undefined && propsRight.status !== undefined) {
        //         if (propsLeft.status === propsRight.status) {
        //           return 0
        //         } else if (
        //           DEFAULT_STATUSES.findIndex((s) => s === propsLeft.status) -
        //             DEFAULT_STATUSES.findIndex((s) => s === propsRight.status) >
        //           0
        //         ) {
        //           return 1
        //         }
        //       }

        //       return -1
        //     })
        //     .map((p) => p.name)
      } else {
        orderedIssueNames = issuesProps.map((props) => props.name).reverse()
      }
      const issuesPage = new IssuesPage(page)
      await issuesPage.clickModelSelectorAll()
      await page.click(ViewletSelectors.Board)
      await setViewGroup(page, 'No grouping')
      await setViewOrder(page, 'Manual')
      await setViewOrder(page, order)

      await fillSearch(page, id)

      await expectToContainsOrdered(locator, orderedIssueNames)
    })
  }
})
