import { expect, type Locator } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewProject } from './types'

export class EditProjectPage extends CommonTrackerPage {
  popupHeader = (): Locator =>
    this.page.locator('form[id="tracker:string:EditProject"] div[class*="title"]:last-child', {
      hasText: 'Edit project'
    })

  inputTitle = (): Locator => this.page.locator('form[id="tracker:string:EditProject"] div[id="project-title"] input')
  inputIdentifier = (): Locator =>
    this.page.locator('form[id="tracker:string:EditProject"] div[id="project-identifier"] input')

  inputDescription = (): Locator =>
    this.page.locator('form[id="tracker:string:EditProject"] div[id="project-description"] input')

  buttonChooseIcon = (): Locator => this.page.locator('div.antiGrid-row button.only-icon')
  buttonMakePrivate = (): Locator => this.page.locator('[id="project-private"]')
  buttonSaveProject = (): Locator => this.page.locator('form[id="tracker:string:EditProject"] button[type="submit"]')
  buttonIcons = (): Locator => this.page.locator('form[id="view:string:ChooseIcon"] div.float-left > button')
  buttonSaveIcons = (): Locator =>
    this.page.locator('form[id="view:string:ChooseIcon"] div[class*="footer"] button[type="submit"]')

  projectTypeButton = (): Locator =>
    this.page.locator('div[class*="header"]', { hasText: 'Project type' }).locator('xpath=..').locator('button')

  defaultAssigneeButton = (): Locator =>
    this.page
      .locator('div[class*="header"]', { hasText: 'Default assignee for issues' })
      .locator('xpath=..')
      .locator('button')

  defaultIssueStatusButton = (): Locator =>
    this.page.locator('div[class*="header"]', { hasText: 'Default issue status' }).locator('xpath=..').locator('button')

  chooseIconButton = (): Locator =>
    this.page.locator('div[class*="header"]', { hasText: 'Choose icon' }).locator('xpath=..').locator('button')

  async checkProject (data: NewProject): Promise<void> {
    await expect(this.popupHeader()).toBeVisible()

    if (data.type != null) {
      await expect(this.projectTypeButton().locator('span[class*="label"]')).toContainText(data.type)
    }
    if (data.title != null) {
      await expect(this.inputTitle()).toHaveValue(data.title)
    }
    if (data.identifier != null) {
      await expect(this.inputIdentifier()).toHaveValue(data.identifier)
    }
    if (data.description != null) {
      await expect(this.inputDescription()).toHaveValue(data.description)
    }
    if (data.defaultAssigneeForIssues != null) {
      await expect(this.defaultAssigneeButton().locator('span[class*="label"]')).toContainText(
        data.defaultAssigneeForIssues
      )
    }
    if (data.defaultIssueStatus != null) {
      await expect(this.defaultIssueStatusButton().locator('span[class*="label"]')).toContainText(
        data.defaultIssueStatus
      )
    }
  }

  async updateProject (data: NewProject): Promise<void> {
    await expect(this.popupHeader()).toBeVisible()

    if (data.type != null) {
      await this.projectTypeButton().click()
      await this.selectMenuItem(this.page, data.type)
    }
    if (data.title != null) {
      await this.inputTitle().fill(data.title)
    }
    if (data.description != null) {
      await this.inputDescription().fill(data.description)
    }
    if (data.iconNumber != null) {
      await this.chooseIconButton().click()
      await this.buttonIcons().nth(data.iconNumber).click()
      await this.buttonSaveIcons().click()
    }
    if (data.private != null && data.private) {
      await this.buttonMakePrivate().click()
    }
    if (data.defaultAssigneeForIssues != null) {
      await this.defaultAssigneeButton().click()
      await this.selectMenuItem(this.page, data.defaultAssigneeForIssues)
    }
    if (data.defaultIssueStatus != null) {
      await this.defaultIssueStatusButton().click()
      await this.selectFromDropdown(this.page, data.defaultIssueStatus)
    }

    await this.buttonSaveProject().click()
  }
}
