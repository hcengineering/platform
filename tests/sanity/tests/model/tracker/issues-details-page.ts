import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewIssue } from './types'

export class IssuesDetailsPage extends CommonTrackerPage {
  readonly page: Page
  readonly inputTitle: Locator
  readonly inputDescription: Locator
  readonly textStatus: Locator
  readonly textPriority: Locator
  readonly textAssignee: Locator
  readonly textLabels: Locator
  readonly textComponent: Locator
  readonly textMilestone: Locator
  readonly textEstimation: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputTitle = page.locator('div.popupPanel-body input[type="text"]')
    this.inputDescription = page.locator('div.popupPanel-body div.textInput p')
    this.textStatus = page.locator('//span[text()="Status"]/../button[1]//span')
    this.textPriority = page.locator('//span[text()="Status"]/../button[2]//span')
    this.textAssignee = page.locator('(//span[text()="Assignee"]/../div/button)[2]')
    this.textLabels = page.locator('div.step-container div.listitems-container')
    this.textComponent = page.locator('(//span[text()="Component"]/../div/div/button)[2]')
    this.textMilestone = page.locator('(//span[text()="Milestone"]/../div/div/button)[3]')
    this.textEstimation = page.locator('(//span[text()="Estimation"]/../div/button)[4]')
  }

  async checkIssueDescription (data: NewIssue): Promise<void> {
    await expect(this.inputTitle).toHaveValue(data.title)
    await expect(this.inputDescription).toHaveText(data.description)
    if (data.status != null) {
      await expect(this.textStatus).toHaveText(data.status)
    }
    if (data.priority != null) {
      await expect(this.textPriority).toHaveText(data.priority)
    }
    if (data.assignee != null) {
      await expect(this.textAssignee).toHaveText(data.assignee)
    }
    if (data.labels != null) {
      await expect(this.textLabels).toHaveText(data.labels)
    }
    if (data.component != null) {
      await expect(this.textComponent).toHaveText(data.component)
    }
    if (data.milestone != null) {
      await expect(this.textMilestone).toHaveText(data.milestone)
    }
    if (data.estimation != null) {
      await expect(this.textEstimation).toHaveText(data.estimation)
    }
  }
}
