import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewIssue } from './types'

export class TemplateDetailsPage extends CommonTrackerPage {
  readonly page: Page
  readonly inputTitle: Locator
  readonly inputDescription: Locator
  readonly buttonPriority: Locator
  readonly buttonAssignee: Locator
  readonly buttonAddLabel: Locator
  readonly textLabels: Locator
  readonly buttonComponent: Locator
  readonly textEstimation: Locator

  constructor(page: Page) {
    super(page)
    this.page = page
    this.inputTitle = page.locator('div.popupPanel-body input[type="text"]')
    this.inputDescription = page.locator('div.popupPanel-body div.textInput p')
    this.buttonPriority = page.locator('//span[text()="Priority"]/../button[1]//span')
    this.buttonAssignee = page.locator('(//span[text()="Assignee"]/../div/button)[1]')
    this.textLabels = page.locator('div.menu-group span')
    this.buttonAddLabel = page.locator('//span[text()="Labels"]/../button[2]//span')
    this.buttonComponent = page.locator('//span[text()="Component"]/../div/div/button')
    this.textEstimation = page.locator('(//span[text()="Estimation"]/../div/button)[3]')
  }

  async checkTemplate(data: NewIssue): Promise<void> {
    await expect(this.inputTitle).toHaveValue(data.title)
    await expect(this.inputDescription).toHaveText(data.description)
    if (data.priority != null) {
      await expect(this.buttonPriority).toHaveText(data.priority)
    }
    if (data.assignee != null) {
      await expect(this.buttonAssignee).toHaveText(data.assignee)
    }
    if (data.labels != null) {
      await this.buttonAddLabel.click()
      await expect(this.page.locator('div.menu-group span', { hasText: data.labels })).toBeVisible()
    }
    if (data.component != null) {
      await expect(this.buttonComponent).toHaveText(data.component)
    }
    if (data.estimation != null) {
      await expect(this.textEstimation).toHaveText(data.estimation)
    }
  }
}

