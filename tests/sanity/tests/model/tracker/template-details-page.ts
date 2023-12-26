import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { Issue, NewIssue } from './types'

export class TemplateDetailsPage extends CommonTrackerPage {
  readonly page: Page
  readonly inputTitle: Locator
  readonly inputDescription: Locator
  readonly buttonPriority: Locator
  readonly buttonAssignee: Locator
  readonly buttonAddLabel: Locator
  readonly textLabels: Locator
  readonly buttonComponent: Locator
  readonly buttonEstimation: Locator
  readonly buttonDueDate: Locator
  readonly buttonSaveDueDate: Locator
  readonly textComment: Locator
  readonly buttonDelete: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputTitle = page.locator('div.popupPanel-body input[type="text"]')
    this.inputDescription = page.locator('div.popupPanel-body div.textInput p')
    this.buttonPriority = page.locator('//span[text()="Priority"]/../button[1]//span')
    this.buttonAssignee = page.locator('(//span[text()="Assignee"]/../div/button)[1]')
    this.textLabels = page.locator('div.menu-group span')
    this.buttonAddLabel = page.locator('//span[text()="Labels"]/../button[2]//span')
    this.buttonComponent = page.locator('//span[text()="Component"]/../div/div/button')
    this.buttonEstimation = page.locator('(//span[text()="Estimation"]/../div/button)[3]')
    this.buttonDueDate = page.locator('(//span[text()="Due date"]/../div/button)[2]')
    this.buttonSaveDueDate = page.locator('div.footer > button')
    this.textComment = page.locator('div.grid div.header')
    this.buttonDelete = page.locator('button[class*="menuItem"] > span', { hasText: 'Delete' })
  }

  async checkTemplate (data: NewIssue): Promise<void> {
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
      await this.inputTitle.click({ force: true })
    }
    if (data.component != null) {
      await expect(this.buttonComponent).toHaveText(data.component)
    }
    if (data.estimation != null) {
      await expect(this.buttonEstimation).toHaveText(data.estimation)
    }
  }

  async editTemplate (data: Issue): Promise<void> {
    if (data.priority != null) {
      await this.buttonPriority.click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonAssignee.click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      if (data.createLabel) {
        await this.buttonAddLabel.click()
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from edit template')
      }
      await this.checkFromDropdown(this.page, data.labels)
      await this.inputTitle.click({ force: true })
    }
    if (data.component != null) {
      await this.buttonComponent.click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.estimation != null) {
      await this.buttonEstimation.click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
    if (data.duedate != null) {
      if (data.duedate === 'today') {
        await this.buttonDueDate.click()
        await this.buttonDatePopupToday.click()
      } else {
        await this.buttonDueDate.click()
        await this.buttonSaveDueDate.click()
      }
    }
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(this.textComment.filter({ hasText: comment })).toBeVisible()
  }

  async deleteTemplate (): Promise<void> {
    await this.buttonMoreActions.click()
    await this.buttonDelete.click()
    await this.pressYesDeletePopup(this.page)
  }
}
