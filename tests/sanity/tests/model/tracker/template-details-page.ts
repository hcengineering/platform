import { expect, type Locator } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { Issue, NewIssue } from './types'
import { convertEstimation } from '../../tracker/tracker.utils'

export class TemplateDetailsPage extends CommonTrackerPage {
  inputTitle = (): Locator => this.page.locator('div.popupPanel-body input[type="text"]')
  inputDescription = (): Locator => this.page.locator('div.popupPanel-body div.textInput p')
  buttonPriority = (): Locator => this.page.locator('//span[text()="Priority"]/following-sibling::button[1]//span')
  buttonAssignee = (): Locator => this.page.locator('//span[text()="Assignee"]/following-sibling::div[1]/button/span')
  textLabels = (dataLabels: string): Locator => this.page.locator('div.menu-group span', { hasText: dataLabels })
  buttonAddLabel = (): Locator => this.page.locator('//span[text()="Labels"]/following-sibling::button[1]//span')
  buttonComponent = (): Locator => this.page.locator('//span[text()="Component"]/following-sibling::div[1]/div/button')
  buttonEstimation = (): Locator => this.page.locator('//span[text()="Estimation"]/following-sibling::div[1]/button')
  buttonDueDate = (): Locator => this.page.locator('//span[text()="Due date"]/following-sibling::div[1]/button')
  buttonSaveDueDate = (): Locator => this.page.locator('div.footer > button')
  activityContent = (): Locator => this.page.locator('div.grid div.content')
  buttonDelete = (): Locator => this.page.locator('button[class*="menuItem"] > span', { hasText: 'Delete' })

  async checkTemplate (data: NewIssue): Promise<void> {
    await expect(this.inputTitle()).toHaveValue(data.title)
    await expect(this.inputDescription()).toHaveText(data.description)
    if (data.priority != null) {
      await expect(this.buttonPriority()).toHaveText(data.priority)
    }
    if (data.assignee != null) {
      await expect(this.buttonAssignee()).toHaveText(data.assignee)
    }
    if (data.labels != null) {
      await this.buttonAddLabel().click()
      await expect(this.textLabels(data.labels)).toBeVisible()
      await this.inputTitle().click({ force: true })
    }
    if (data.component != null) {
      await expect(this.buttonComponent()).toHaveText(data.component)
    }
    if (data.estimation != null) {
      await expect(this.buttonEstimation()).toHaveText(convertEstimation(data.estimation))
    }
  }

  async editTemplate (data: Issue): Promise<void> {
    if (data.priority != null) {
      await this.buttonPriority().click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonAssignee().click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      if (data.createLabel) {
        await this.buttonAddLabel().click()
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from edit template')
      }
      await this.checkFromDropdown(this.page, data.labels)
      await this.inputTitle().click({ force: true })
    }
    if (data.component != null) {
      await this.buttonComponent().click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.estimation != null) {
      await this.buttonEstimation().click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
    if (data.duedate != null) {
      if (data.duedate === 'today') {
        await this.buttonDueDate().click()
        await this.buttonDatePopupToday().click()
      } else {
        await this.buttonDueDate().click()
        await this.buttonSaveDueDate().click()
      }
    }
  }

  async checkActivityContent (comment: string): Promise<void> {
    await expect(this.activityContent().filter({ hasText: comment })).toBeVisible()
  }

  async deleteTemplate (): Promise<void> {
    await this.buttonMoreActions().click()
    await this.buttonDelete().click()
    await this.pressYesDeletePopup(this.page)
  }
}
