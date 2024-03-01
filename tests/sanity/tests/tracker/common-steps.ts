import { Page, test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { NewIssue } from '../model/tracker/types'

export async function prepareNewIssueStep (page: Page, issue: NewIssue): Promise<string> {
  return await test.step('Prepare document', async () => {
    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()

    await issuesPage.createNewIssue(issue)
    await issuesPage.searchIssueByName(issue.title)
    return await issuesPage.getIssueId(issue.title)
  })
}

export async function prepareNewIssueWithOpenStep (page: Page, issue: NewIssue): Promise<string> {
  return await test.step('Prepare document', async () => {
    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()

    await issuesPage.createNewIssue(issue)
    await issuesPage.searchIssueByName(issue.title)
    await issuesPage.openIssueByName(issue.title)
    return await issuesPage.getIssueId(issue.title)
  })
}
