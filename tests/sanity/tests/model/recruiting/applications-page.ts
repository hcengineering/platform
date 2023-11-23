import { expect, type Locator, type Page } from '@playwright/test'
import { NewApplication, TalentName } from './types'
import { generateId } from '../../utils'
import { CommonRecruitingPage } from './common-recruiting-page'

export class ApplicationsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateApplication: Locator
  readonly buttonTalentSelector: Locator
  readonly buttonSpaceSelector: Locator
  readonly buttonAssignedRecruiter: Locator
  readonly buttonCreateNewApplication: Locator
  readonly buttonTabCreated: Locator
  readonly textTableFirstCell: Locator
  readonly buttonSelectCollaborators: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Applications' })
    this.buttonCreateApplication = page.locator('button > span', { hasText: 'Application' })
    this.buttonTalentSelector = page.locator('div[id="vacancy.talant.selector"]')
    this.buttonSpaceSelector = page.locator('div[id="space.selector"]')
    this.buttonAssignedRecruiter = page.locator('button div.label', { hasText: 'Assigned recruiter' })
    this.buttonCreateNewApplication = page.locator('form[id="recruit:string:CreateApplication"] button[type="submit"]')
    this.buttonTabCreated = page.locator('div[data-id="tab-created"]')
    this.textTableFirstCell = page.locator('div[class$="firstCell"]')
    this.buttonSelectCollaborators = page.locator('xpath=//span[text()="Collaborators"]/..//button')
  }

  async createNewApplication (data: NewApplication): Promise<void> {
    await this.buttonCreateApplication.click()

    await this.selectTalent(data.talentsName ?? 'first')
    await this.selectVacancy(data.vacancy)
    await this.selectRecruiter(data.recruiterName)

    await this.buttonCreateNewApplication.click()
  }

  async createNewApplicationWithNewTalent (data: NewApplication): Promise<TalentName> {
    const talentName: TalentName = {
      firstName: `TestFirst-${generateId(4)}`,
      lastName: `TestLast-${generateId(4)}`
    }

    await this.buttonCreateApplication.click()

    await this.buttonTalentSelector.click()
    await this.pressCreateButtonSelectPopup(this.page)
    await this.createNewTalentPopup(this.page, talentName.firstName, talentName.lastName)

    await this.selectVacancy(data.vacancy)
    await this.selectRecruiter(data.recruiterName)

    await this.buttonCreateNewApplication.click()

    return talentName
  }

  async selectTalent (name: string): Promise<void> {
    await this.buttonTalentSelector.click()
    await this.selectMenuItem(this.page, name)
  }

  async selectVacancy (name: string): Promise<void> {
    await this.buttonSpaceSelector.click()
    await this.selectMenuItem(this.page, name)
  }

  async selectRecruiter (name: string): Promise<void> {
    await this.buttonAssignedRecruiter.click()
    await this.selectMenuItem(this.page, name)
  }

  async openApplicationByTalentName (talentName: TalentName): Promise<void> {
    await this.page
      .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
      .locator('div[class*="firstCell"]')
      .click()
  }

  async checkApplicationState (talentName: TalentName, done: string): Promise<void> {
    await expect(
      this.page
        .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
        .locator('td')
        .nth(5)
    ).toHaveText(done)
  }

  async checkApplicationNotExist (applicationId: string): Promise<void> {
    await expect(this.textTableFirstCell.filter({ hasText: applicationId })).toHaveCount(0)
  }

  async changeApplicationStatus (talentName: TalentName, status: string): Promise<void> {
    await this.page
      .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
      .locator('td')
      .nth(5)
      .click()
    await this.selectFromDropdown(this.page, status)
  }

  async selectType (type: string): Promise<void> {
    await this.page
      .locator('div[class*=header]')
      .locator('div[class*=tablist-container]')
      .locator('div', { hasText: type })
      .click()
  }

  async addCollaborators (name: string): Promise<void> {
    if ('all' === name) {
      const checks = this.page.locator('div.popup button.menu-item')
      const count = await checks.count()
      for (let i = 0; i < count; i++) {
        await checks.nth(i).click()
      }
    } else {
      await this.page.locator('div.popup button.menu-item div.label', { hasText: name }).click()
    }
  }
}
