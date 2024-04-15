import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewProject } from './types'

export class EditProjectPage extends CommonTrackerPage {
  readonly page: Page
  readonly popupHeader: Locator
  readonly inputTitle: Locator
  readonly inputIdentifier: Locator
  readonly inputDescription: Locator
  readonly buttonChooseIcon: Locator
  readonly buttonMakePrivate: Locator
  readonly buttonSaveProject: Locator
  readonly buttonEditIdentifier: Locator
  readonly inputEditProjectIdentifier: Locator
  readonly buttonEditProjectIdentifier: Locator
  readonly buttonIcons: Locator
  readonly buttonSaveIcons: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.popupHeader = page.locator('form[id="tracker:string:EditProject"] div[class*="title"]:last-child', {
      hasText: 'Edit project'
    })
    this.inputTitle = page.locator('form[id="tracker:string:EditProject"] div[id="project-title"] input')
    this.inputIdentifier = page.locator('form[id="tracker:string:EditProject"] div[id="project-identifier"] input')
    this.inputDescription = page.locator('form[id="tracker:string:EditProject"] div[id="project-description"] input')
    this.buttonChooseIcon = page.locator('div.antiGrid-row button.only-icon')
    this.buttonMakePrivate = page.locator('div.antiGrid-row span.toggle-switch')
    this.buttonSaveProject = page.locator('form[id="tracker:string:EditProject"] button[type="submit"]')
    this.buttonEditIdentifier = page.locator('form[id="tracker:string:EditProject"] div.relative button.small')
    this.inputEditProjectIdentifier = page.locator('form[id="tracker:string:ProjectIdentifier"] input')
    this.buttonEditProjectIdentifier = page.locator('form[id="tracker:string:ProjectIdentifier"] button[type="submit"]')
    this.buttonIcons = page.locator('form[id="view:string:ChooseIcon"] div.float-left > button')
    this.buttonSaveIcons = page.locator('form[id="view:string:ChooseIcon"] div[class*="footer"] button[type="submit"]')
  }

  async checkProject (data: NewProject): Promise<void> {
    await expect(this.popupHeader).toBeVisible()

    if (data.type != null) {
      await expect(
        this.page
          .locator('div[class*="header"]', { hasText: 'Project type' })
          .locator('xpath=..')
          .locator('button > span[class*="label"]')
      ).toContainText(data.type)
    }

    if (data.title != null) {
      await expect(this.inputTitle).toHaveValue(data.title)
    }
    if (data.identifier != null) {
      await expect(this.inputIdentifier).toHaveValue(data.identifier)
    }
    if (data.description != null) {
      await expect(this.inputDescription).toHaveValue(data.description)
    }
    if (data.defaultAssigneeForIssues != null) {
      await expect(
        this.page
          .locator('div[class*="header"]', { hasText: 'Default assignee for issues' })
          .locator('xpath=..')
          .locator('button > span[class*="label"]')
      ).toContainText(data.defaultAssigneeForIssues)
    }
    if (data.defaultIssueStatus != null) {
      await expect(
        this.page
          .locator('div[class*="header"]', { hasText: 'Default issue status' })
          .locator('xpath=..')
          .locator('button > span[class*="label"]')
      ).toContainText(data.defaultIssueStatus)
    }
  }

  async updateProject (data: NewProject): Promise<void> {
    await expect(this.popupHeader).toBeVisible()

    if (data.type != null) {
      await this.page
        .locator('div[class*="header"]', { hasText: 'Project type' })
        .locator('xpath=..')
        .locator('button')
        .click()
      await this.selectMenuItem(this.page, data.type)
    }

    if (data.title != null) {
      await this.inputTitle.fill(data.title)
    }
    if (data.description != null) {
      await this.inputDescription.fill(data.description)
    }
    if (data.iconNumber != null) {
      await this.page
        .locator('div[class*="header"]', { hasText: 'Choose icon' })
        .locator('xpath=..')
        .locator('button')
        .click()
      await this.buttonIcons.nth(data.iconNumber).click()
      await this.buttonSaveIcons.click()
    }
    if (data.private != null && data.private) {
      await this.buttonMakePrivate.click()
    }
    if (data.defaultAssigneeForIssues != null) {
      await this.page
        .locator('div[class*="header"]', { hasText: 'Default assignee for issues' })
        .locator('xpath=..')
        .locator('button')
        .click()
      await this.selectMenuItem(this.page, data.defaultAssigneeForIssues)
    }
    if (data.defaultIssueStatus != null) {
      await this.page
        .locator('div[class*="header"]', { hasText: 'Default issue status' })
        .locator('xpath=..')
        .locator('button')
        .click()
      await this.selectFromDropdown(this.page, data.defaultIssueStatus)
    }

    await this.buttonSaveProject.click()
  }
}
