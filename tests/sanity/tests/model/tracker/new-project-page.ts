import { expect, type Locator } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewProject } from './types'

export class NewProjectPage extends CommonTrackerPage {
  popupHeader = (): Locator =>
    this.page.locator('form[id="tracker:string:NewProject"] div[class*="title"]:last-child', {
      hasText: 'New project'
    })

  inputTitle = (): Locator => this.page.locator('div[id="project-title"] input')
  inputIdentifier = (): Locator => this.page.locator('div[id="project-identifier"] input')
  inputDescription = (): Locator => this.page.locator('div[id="project-description"] input')
  buttonChooseIcon = (): Locator => this.page.locator('div.antiGrid-row button.only-icon')
  buttonMakePrivate = (): Locator => this.page.locator('[id="project-private"]')
  buttonCreateProject = (): Locator => this.page.locator('form[id="tracker:string:NewProject"] button[type="submit"]')
  projectTypeButton = (): Locator =>
    this.page.locator('div[class*="header"]', { hasText: 'Project type' }).locator('xpath=..').locator('button')

  defaultAssigneeButton = (): Locator =>
    this.page
      .locator('div[class*="header"]', { hasText: 'Default assignee for issues' })
      .locator('xpath=..')
      .locator('button')

  defaultIssueStatusButton = (): Locator =>
    this.page.locator('div[class*="header"]', { hasText: 'Default issue status' }).locator('xpath=..').locator('button')

  async createNewProject (data: NewProject): Promise<void> {
    await expect(this.popupHeader()).toBeVisible()

    if (data.type != null) {
      await this.projectTypeButton().click()
      await this.selectMenuItem(this.page, data.type)
    }

    if (data.title != null) {
      await this.inputTitle().fill(data.title)
    }
    if (data.identifier != null) {
      await this.inputIdentifier().fill(data.identifier)
    }
    if (data.description != null) {
      await this.inputDescription().fill(data.description)
    }
    if (data.iconNumber != null) {
      await this.buttonChooseIcon().click()
    }
    if (data.private) {
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

    await this.buttonCreateProject().click()
  }
}
