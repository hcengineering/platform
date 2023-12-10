import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewProject } from './types'

export class NewProjectPage extends CommonTrackerPage {
  readonly page: Page
  readonly popupHeader: Locator
  readonly inputTitle: Locator
  readonly inputIdentifier: Locator
  readonly inputDescription: Locator
  readonly buttonChooseIcon: Locator
  readonly buttonMakePrivate: Locator
  readonly buttonCreateProject: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.popupHeader = page.locator('form[id="tracker:string:NewProject"] div[class*="title"]:last-child', {
      hasText: 'New project'
    })
    this.inputTitle = page.locator('input[placeholder="New project"]')
    this.inputIdentifier = page.locator('input[placeholder="PRJCT"]')
    this.inputDescription = page.locator('form[id="tracker:string:NewProject"] div.tiptap')
    this.buttonChooseIcon = page.locator('div.antiGrid-row button.only-icon')
    this.buttonMakePrivate = page.locator('div.antiGrid-row span.toggle-switch')
    this.buttonCreateProject = page.locator('form[id="tracker:string:NewProject"] button[type="submit"]')
  }

  async createNewProject (data: NewProject): Promise<void> {
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
    if (data.identifier != null) {
      await this.inputIdentifier.fill(data.identifier)
    }
    if (data.description != null) {
      await this.inputDescription.fill(data.description)
    }
    if (data.iconNumber != null) {
      await this.inputDescription.fill(data.iconNumber + '')
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

    await this.buttonCreateProject.click()
  }
}
