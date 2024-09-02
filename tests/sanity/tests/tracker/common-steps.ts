import { Page, test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { NewIssue } from '../model/tracker/types'
import { faker } from '@faker-js/faker'

export async function prepareNewIssueStep (page: Page, issue: NewIssue): Promise<string> {
  return await test.step('Prepare document', async () => {
    const issuesPage = new IssuesPage(page)
    await issuesPage.clickModelSelectorAll()

    await issuesPage.createNewIssue(issue)
    await issuesPage.searchIssueByName(issue.title)
    return await issuesPage.getIssueId(issue.title)
  })
}

export async function prepareNewIssueWithOpenStep (page: Page, issue: NewIssue): Promise<string> {
  return await test.step('Prepare Issue', async () => {
    const issuesPage = new IssuesPage(page)
    await issuesPage.linkSidebarAll().click()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(issue)
    await issuesPage.searchIssueByName(issue.title)
    await issuesPage.openIssueByName(issue.title)
    return await issuesPage.getIssueId(issue.title)
  })
}

export function createNewIssueData (firstName: string, lastName: string, replace?: object): NewIssue {
  return {
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    status: 'In Progress',
    priority: 'Urgent',
    assignee: `${lastName} ${firstName}`,
    createLabel: true,
    labels: faker.lorem.words(1),
    component: 'No component',
    estimation: '2',
    milestone: 'No Milestone',
    duedate: 'today',
    filePath: 'cat.jpeg',
    ...replace
  }
}
