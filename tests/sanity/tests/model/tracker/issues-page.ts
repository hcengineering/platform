import { expect, type Locator, type Page } from '@playwright/test'
import { NewIssue } from './types'
import path from 'path'
import { CommonTrackerPage } from './common-tracker-page'

export class IssuesPage extends CommonTrackerPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateNewIssue: Locator
  readonly inputPopupCreateNewIssueTitle: Locator
  readonly inputPopupCreateNewIssueDescription: Locator
  readonly buttonPopupCreateNewIssueStatus: Locator
  readonly buttonPopupCreateNewIssuePriority: Locator
  readonly buttonPopupCreateNewIssueAssignee: Locator
  readonly buttonPopupCreateNewIssueLabels: Locator
  readonly buttonPopupCreateNewIssueComponent: Locator
  readonly buttonPopupCreateNewIssueEstimation: Locator
  readonly buttonPopupCreateNewIssueMilestone: Locator
  readonly buttonPopupCreateNewIssueDuedate: Locator
  readonly buttonDatePopupToday: Locator
  readonly inputPopupCreateNewIssueFile: Locator
  readonly textPopupCreateNewIssueFile: Locator
  readonly buttonCreateIssue: Locator
  readonly inputSearch: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Issues' })
    this.buttonCreateNewIssue = page.locator('button > span', { hasText: 'New issue' })
    this.inputPopupCreateNewIssueTitle = page.locator('form[id="tracker:string:NewIssue"] input[type="text"]')
    this.inputPopupCreateNewIssueDescription = page.locator('form[id="tracker:string:NewIssue"] div.tiptap')
    this.buttonPopupCreateNewIssueStatus = page.locator('form[id="tracker:string:NewIssue"] div#status-editor button')
    this.buttonPopupCreateNewIssuePriority = page.locator(
      'form[id="tracker:string:NewIssue"] div#priority-editor button'
    )
    this.buttonPopupCreateNewIssueAssignee = page.locator(
      'form[id="tracker:string:NewIssue"] div#assignee-editor button'
    )
    this.buttonPopupCreateNewIssueLabels = page.locator('form[id="tracker:string:NewIssue"] button span', {
      hasText: 'Labels'
    })
    this.buttonPopupCreateNewIssueComponent = page.locator(
      'form[id="tracker:string:NewIssue"] button span[title="No component"]'
    )
    this.buttonPopupCreateNewIssueEstimation = page.locator(
      'form[id="tracker:string:NewIssue"] div#estimation-editor button'
    )
    this.buttonPopupCreateNewIssueMilestone = page.locator(
      'form[id="tracker:string:NewIssue"] div#milestone-editor button'
    )
    this.buttonPopupCreateNewIssueDuedate = page.locator('form[id="tracker:string:NewIssue"] div#duedate-editor button')
    this.buttonDatePopupToday = page.locator('div.popup div.today')
    this.inputPopupCreateNewIssueFile = page.locator('form[id="tracker:string:NewIssue"] input[type="file"]')
    this.textPopupCreateNewIssueFile = page.locator('div[class*="attachments"] > div[class*="attachment"]')
    this.buttonCreateIssue = page.locator('button > span', { hasText: 'Create issue' })
    this.inputSearch = page.locator('input[placeholder="Search"]')
  }

  async createNewIssue (data: NewIssue): Promise<void> {
    await this.buttonCreateNewIssue.click()

    await this.inputPopupCreateNewIssueTitle.fill(data.title)
    await this.inputPopupCreateNewIssueDescription.fill(data.description)
    if (data.status != null) {
      await this.buttonPopupCreateNewIssueStatus.click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.priority != null) {
      await this.buttonPopupCreateNewIssuePriority.click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonPopupCreateNewIssueAssignee.click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      await this.buttonPopupCreateNewIssueLabels.click()
      if (data.createLabel) {
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from createNewIssue')
      }
      await this.checkFromDropdown(this.page, data.labels)
      await this.inputPopupCreateNewIssueTitle.click({ force: true })
    }
    if (data.component != null) {
      await this.buttonPopupCreateNewIssueComponent.click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.estimation != null) {
      await this.buttonPopupCreateNewIssueEstimation.click({ delay: 100 })
      await this.fillToSelectPopup(this.page, data.estimation)
    }
    if (data.milestone != null) {
      await this.buttonPopupCreateNewIssueMilestone.click()
      await this.selectMenuItem(this.page, data.milestone)
    }
    if (data.duedate != null) {
      await this.buttonPopupCreateNewIssueDuedate.click()
      if (data.duedate === 'today') {
        await this.buttonDatePopupToday.click()
      } else {
        await this.fillToSelectPopup(this.page, data.duedate)
      }
    }
    if (data.filePath != null) {
      await this.inputPopupCreateNewIssueFile.setInputFiles(path.join(__dirname, `../../files/${data.filePath}`))
      await expect(await this.textPopupCreateNewIssueFile.filter({ hasText: data.filePath })).toBeVisible()
    }

    await this.buttonCreateIssue.click()
  }

  async searchIssueByName (issueName: string): Promise<void> {
    await this.inputSearch.fill(issueName)
    await this.page.waitForTimeout(3000)
  }

  async openIssueByName (issueName: string): Promise<void> {
    await this.page.locator('a', { hasText: issueName }).click()
  }

  async checkIssueNotExist (issueName: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: issueName })).toHaveCount(0)
  }
}
