import { expect, test } from '@playwright/test'
import { generateId, iterateLocator, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { NewIssue } from '../model/tracker/types'
import { DateDivided } from '../model/types'
import { DEFAULT_STATUSES, DEFAULT_STATUSES_ID, PRIORITIES } from './tracker.utils'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe.only('Tracker filters tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  const initialIssue: NewIssue = {
    title: `Issue for filtering-${generateId()}`,
    description: 'Issue to filter',
    assignee: 'Appleseed John',
    status: 'In progress'
  }

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()

    await leftSideMenuPage.clickTracker()
    await issuesPage.clickModelSelectorAll()
  })

  // Modified date tests

  test('Filter by Modified date: Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'Today')
    await issuesPage.checkFilter('Modified date', 'Today')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Modified date: Yesterday', async () => {
    const title = `Issue ${generateId()}`

    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'Yesterday')
    await issuesPage.checkFilter('Modified date', 'Yesterday')

    await issuesPage.checkFilteredIssueNotExist(title)
  })

  test('Filter by Modified date: This week', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'This week')
    await issuesPage.checkFilter('Modified date', 'This week')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Modified date: This month', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'This month')
    await issuesPage.checkFilter('Modified date', 'This month')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Modified date: Exact Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'Today')
    await issuesPage.updateFilterDimension('Exact date', 'Today')
    await issuesPage.checkFilter('Modified date', 'is', 'Today')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Modified date: Before Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'Today')
    await issuesPage.updateFilterDimension('Before date', 'Today')
    await issuesPage.checkFilter('Modified date', 'Before', 'Today')

    await issuesPage.checkFilteredIssueNotExist(title)
  })

  test('Filter by Modified date: After Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'Today')
    await issuesPage.updateFilterDimension('After date', 'Today')
    await issuesPage.checkFilter('Modified date', 'After', 'Today')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Modified date: Between dates', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Modified date', 'Today')
    await issuesPage.updateFilterDimension('Between dates')

    const dateYesterday = new Date()
    dateYesterday.setDate(dateYesterday.getDate() - 1)

    const dateTomorrow = new Date()
    dateTomorrow.setDate(dateTomorrow.getDate() + 1)

    const dateYesterdayDivided: DateDivided = {
      day: dateYesterday.getDate().toString(),
      month: (dateYesterday.getMonth() + 1).toString(),
      year: dateYesterday.getFullYear().toString()
    }

    const dateTomorrowDivided: DateDivided = {
      day: dateTomorrow.getDate().toString(),
      month: (dateTomorrow.getMonth() + 1).toString(),
      year: dateTomorrow.getFullYear().toString()
    }

    await issuesPage.fillBetweenDate(dateYesterdayDivided, dateTomorrowDivided)
    await issuesPage.checkFilter('Modified date', 'is between', dateYesterday.getDate().toString())
    await issuesPage.checkFilter('Modified date', 'is between', dateTomorrow.getDate().toString())

    await issuesPage.checkFilteredIssueExist(title)
  })

  // Created date tests

  test('Filter by Created date: Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'Today')
    await issuesPage.checkFilter('Created date', 'Today')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Created date: Yesterday', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'Yesterday')
    await issuesPage.checkFilter('Created date', 'Yesterday')

    await issuesPage.checkFilteredIssueNotExist(title)
  })

  test('Filter by Created date: This week', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'This week')
    await issuesPage.checkFilter('Created date', 'This week')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Created date: This month', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'This month')
    await issuesPage.checkFilter('Created date', 'This month')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Created date: Exact Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'Today')
    await issuesPage.updateFilterDimension('Exact date', 'Today')
    await issuesPage.checkFilter('Created date', 'is', 'Today')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Created date: Before Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'Today')
    await issuesPage.updateFilterDimension('Before date', 'Today')
    await issuesPage.checkFilter('Created date', 'Before', 'Today')

    await issuesPage.checkFilteredIssueNotExist(title)
  })

  test('Filter by Created date: After Today', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'Today')
    await issuesPage.updateFilterDimension('After date', 'Today')
    await issuesPage.checkFilter('Created date', 'After', 'Today')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Created date: Between dates', async () => {
    const title = `Issue ${generateId()}`
    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await issuesPage.selectFilter('Created date', 'Today')
    await issuesPage.updateFilterDimension('Between dates')

    const dateYesterday = new Date()
    dateYesterday.setDate(dateYesterday.getDate() - 1)

    const dateTomorrow = new Date()
    dateTomorrow.setDate(dateTomorrow.getDate() + 1)

    const dateYesterdayDivided: DateDivided = {
      day: dateYesterday.getDate().toString(),
      month: (dateYesterday.getMonth() + 1).toString(),
      year: dateYesterday.getFullYear().toString()
    }

    const dateTomorrowDivided: DateDivided = {
      day: dateTomorrow.getDate().toString(),
      month: (dateTomorrow.getMonth() + 1).toString(),
      year: dateTomorrow.getFullYear().toString()
    }

    await issuesPage.fillBetweenDate(dateYesterdayDivided, dateTomorrowDivided)
    await issuesPage.checkFilter('Created date', 'is between', dateYesterday.getDate().toString())
    await issuesPage.checkFilter('Created date', 'is between', dateTomorrow.getDate().toString())

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by Status', async () => {
    await leftSideMenuPage.clickTracker()

    await issuesPage.linkSidebarAll().click()
    await issuesPage.clickModelSelectorAll()

    for (const status of DEFAULT_STATUSES) {
      await test.step(`Status Filter ${status}`, async () => {
        await issuesPage.selectFilter('Status', status)
        await issuesPage.inputSearch().press('Escape')

        await issuesPage.checkFilter('Status', 'is')
        await issuesPage.checkAllIssuesInStatus(DEFAULT_STATUSES_ID.get(status), status)
        await issuesPage.buttonClearFilers().click()
      })
    }
  })

  test('Filter by Priority', async () => {
    await leftSideMenuPage.clickTracker()

    await issuesPage.clickModelSelectorAll()

    for (const priority of PRIORITIES) {
      await test.step(`Priority Filter ${priority}`, async () => {
        await issuesPage.selectFilter('Priority', priority)
        await issuesPage.inputSearch().press('Escape')
        await issuesPage.checkFilter('Priority', 'is')
        await issuesPage.checkAllIssuesByPriority(priority.toLowerCase().replaceAll(' ', ''))
        await issuesPage.buttonClearFilers().click()
      })
    }
  })

  test('Filter by "Created by"', async () => {
    const createdBy = 'Appleseed John'
    await leftSideMenuPage.clickTracker()

    await issuesPage.clickModelSelectorAll()

    await issuesPage.selectFilter('Created by', createdBy)
    await issuesPage.inputSearch().press('Escape')

    await issuesPage.checkFilter('Created by', 'is')
    for await (const issue of iterateLocator(issuesPage.issuesList())) {
      await issue.locator('span.list > a').click()

      await issuesDetailsPage.checkIfButtonCreatedByHaveTextCreatedBy(createdBy)
      await issuesDetailsPage.clickCloseIssueButton()
    }
  })

  test('Filter by component', async () => {
    const defaultComponent = 'Default component'
    await leftSideMenuPage.clickTracker()

    await issuesPage.clickModelSelectorAll()

    await issuesPage.selectFilter('Component', defaultComponent)
    await issuesPage.inputSearch().press('Escape')

    await issuesPage.checkFilter('Component', 'is')
    for await (const issue of iterateLocator(issuesPage.issuesList())) {
      await issue.locator('span.list > a').click()

      await issuesDetailsPage.checkIfButtonComponentHasTextDefaultComponent(defaultComponent)

      await issuesDetailsPage.clickCloseIssueButton()
    }
  })

  test('Filter by Title', async () => {
    const firstSearch = 'issue'
    const secondSearch = 'done'
    await leftSideMenuPage.clickTracker()

    await issuesPage.clickModelSelectorAll()

    await test.step(`Check Title filter for ${firstSearch}`, async () => {
      await issuesPage.selectFilter('Title', firstSearch)
      await issuesPage.checkFilter('Title', 'contains', firstSearch)

      for await (const issue of iterateLocator(issuesPage.issuesList())) {
        await expect(issue.locator('span.presenter-label > a')).toContainText(firstSearch, { ignoreCase: true })
      }
    })

    await test.step(`Check Title filter for ${secondSearch}`, async () => {
      await issuesPage.buttonClearFilters().click()
      await issuesPage.selectFilter('Title', secondSearch)
      await issuesPage.checkFilter('Title', 'contains', secondSearch)

      for await (const issue of iterateLocator(issuesPage.issuesList())) {
        await expect(issue.locator('span.presenter-label > a')).toContainText(secondSearch, { ignoreCase: true })
      }
    })
  })

  test('Filter by "Modified by"', async () => {
    const modifierName = 'Appleseed John'
    await leftSideMenuPage.clickTracker()

    await issuesPage.clickModelSelectorAll()

    await issuesPage.selectFilter('Modified by', modifierName)
    await issuesPage.inputSearch().press('Escape')
    await issuesPage.checkFilter('Modified by', 'is')

    for await (const issue of iterateLocator(issuesPage.issuesList())) {
      await issue.locator('span.list > a').click()

      await issuesDetailsPage.checkIfButtonCreatedByHaveRealName(modifierName)

      await issuesDetailsPage.clickCloseIssueButton()
    }
  })

  test('Filter by Milestone: "Filter Milestone"', async () => {
    const title = `Issue with milestone-${generateId()}`
    const milestone = 'Filter Milestone'

    await issuesPage.createNewIssue({ ...initialIssue, ...{ title, milestone } })
    await leftSideMenuPage.clickTracker()
    await issuesPage.clickModelSelectorAll()

    await issuesPage.selectFilter('Milestone', milestone)
    await issuesPage.page.keyboard.press('Escape')
    await issuesPage.checkFilter('Milestone', 'is', '1 state')

    for await (const issue of iterateLocator(issuesPage.issuesList())) {
      await expect(issue.locator('div.compression-bar #milestone span.label')).toContainText(milestone)
    }
  })

  test('Filter by Milestone: Not selected', async () => {
    const title = `Issue without milestone-${generateId()}`

    await issuesPage.createNewIssue({ ...initialIssue, ...{ title } })
    await leftSideMenuPage.clickTracker()
    await issuesPage.clickModelSelectorAll()

    await issuesPage.selectFilter('Milestone', 'Not selected')
    await issuesPage.page.keyboard.press('Escape')
    await issuesPage.checkFilter('Milestone', 'is', '1 state')

    await issuesPage.checkFilteredIssueExist(title)
  })

  test('Filter by label', async () => {
    const labels = 'Filter Label'
    const title = `Issue with label ${generateId()}`
    const createLabel = true

    await issuesPage.createNewIssue({ ...initialIssue, ...{ title, labels, createLabel } })

    await test.step('Check Label filter for exist Label', async () => {
      await issuesPage.selectFilter('Labels', labels)
      await issuesPage.page.keyboard.press('Escape')
      await issuesPage.checkFilter('Labels', 'is', labels)
      for await (const issue of iterateLocator(issuesPage.issuesList())) {
        await expect(issue.locator('div.compression-bar > div.label-box span.label')).toContainText(labels)
      }
    })
  })

  // TODO: We need to split them into separate one's and fix.
  test('Filter by Due date', async () => {
    const plusSevenDate = new Date()
    const currentMonth = plusSevenDate.getMonth()
    plusSevenDate.setDate(plusSevenDate.getDate() + 7)
    const afterWeekMonth = plusSevenDate.getMonth()
    const dueDateOverdueIssue: NewIssue = {
      title: `Issue for the Due date yesterday filter-${generateId()}`,
      description: 'Issue for the Due date yesterday filter',
      duedate: 'yesterday'
    }
    const dueDateTodayIssue: NewIssue = {
      title: `Issue for the Due date today filter-${generateId()}`,
      description: 'Issue for the Due date today filter',
      duedate: 'today'
    }
    const dueDateNextWeekIssue: NewIssue = {
      title: `Issue for the Due date next week filter-${generateId()}`,
      description: 'Issue for the Due date next week filter',
      duedate: 'nextWeek'
    }
    const dueDateNextMonthIssue: NewIssue = {
      title: `Issue for the Due date next month filter-${generateId()}`,
      description: 'Issue for the Due date next month filter',
      duedate: 'nextMonth'
    }

    await issuesPage.createNewIssue(dueDateOverdueIssue)
    await issuesPage.createNewIssue(dueDateTodayIssue)
    await issuesPage.createNewIssue(dueDateNextWeekIssue)
    await issuesPage.createNewIssue(dueDateNextMonthIssue)

    await test.step('Check Filter Overdue', async () => {
      await issuesPage.selectFilter('Due date', 'Overdue')
      await issuesPage.checkFilter('Due date', 'Overdue')

      await issuesPage.checkFilteredIssueExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Today', async () => {
      await issuesPage.updateFilterDimension('Today')
      await issuesPage.checkFilter('Due date', 'Today')

      await issuesPage.checkFilteredIssueNotExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Yesterday', async () => {
      await issuesPage.updateFilterDimension('Yesterday')
      await issuesPage.checkFilter('Due date', 'Yesterday')

      await issuesPage.checkFilteredIssueExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter This week', async () => {
      await issuesPage.updateFilterDimension('This week')
      await issuesPage.checkFilter('Due date', 'This week')

      if (new Date().getDay() !== 1) {
        await issuesPage.checkFilteredIssueExist(dueDateOverdueIssue.title)
      } else {
        await issuesPage.checkFilteredIssueNotExist(dueDateOverdueIssue.title)
      }

      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Next week', async () => {
      await issuesPage.updateFilterDimension('Next week')
      await issuesPage.checkFilter('Due date', 'Next week')

      await issuesPage.checkFilteredIssueNotExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter This month', async () => {
      await issuesPage.updateFilterDimension('This month')
      await issuesPage.checkFilter('Due date', 'This month')

      await issuesPage.checkFilteredIssueExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      if (currentMonth === afterWeekMonth) {
        await issuesPage.checkFilteredIssueExist(dueDateNextWeekIssue.title)
      } else {
        await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      }
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Next month', async () => {
      await issuesPage.updateFilterDimension('Next month')
      await issuesPage.checkFilter('Due date', 'Next month')

      await issuesPage.checkFilteredIssueNotExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateTodayIssue.title)
      if (currentMonth === afterWeekMonth) {
        await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      } else {
        await issuesPage.checkFilteredIssueExist(dueDateNextWeekIssue.title)
      }
      await issuesPage.checkFilteredIssueExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Exact date - Today', async () => {
      await issuesPage.updateFilterDimension('Exact date', 'Today')
      await issuesPage.checkFilter('Due date', 'is', 'Today')

      await issuesPage.checkFilteredIssueNotExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Before date - Today', async () => {
      await issuesPage.updateFilterDimension('Before date')
      await issuesPage.checkFilter('Due date', 'Before', 'Today')

      await issuesPage.checkFilteredIssueExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter After date - Today', async () => {
      await issuesPage.updateFilterDimension('After date')
      await issuesPage.checkFilter('Due date', 'After', 'Today')

      await issuesPage.checkFilteredIssueNotExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Between Dates', async () => {
      await issuesPage.updateFilterDimension('Between dates')
      const dateYesterday = new Date()
      dateYesterday.setDate(dateYesterday.getDate() - 1)
      const dateTomorrow = new Date()
      dateTomorrow.setDate(dateTomorrow.getDate() + 1)
      const dateYesterdayDivided: DateDivided = {
        day: dateYesterday.getDate().toString(),
        month: (dateYesterday.getMonth() + 1).toString(),
        year: dateYesterday.getFullYear().toString()
      }
      const dateTomorrowDivided: DateDivided = {
        day: dateTomorrow.getDate().toString(),
        month: (dateTomorrow.getMonth() + 1).toString(),
        year: dateTomorrow.getFullYear().toString()
      }

      await issuesPage.fillBetweenDate(dateYesterdayDivided, dateTomorrowDivided)
      await issuesPage.checkFilter('Due date', 'is between', dateYesterday.getDate().toString())
      await issuesPage.checkFilter('Due date', 'is between', dateTomorrow.getDate().toString())

      await issuesPage.checkFilteredIssueExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })

    await test.step('Check Filter Not specified', async () => {
      await issuesPage.updateFilterDimension('Not specified')
      await issuesPage.checkFilter('Due date', 'Not specified')
      await issuesPage.checkFilteredIssueNotExist(dueDateOverdueIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateTodayIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextWeekIssue.title)
      await issuesPage.checkFilteredIssueNotExist(dueDateNextMonthIssue.title)
    })
  })
})
