import { type Locator, type Page, expect } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'
import { NewApplication, TalentName } from './types'
import { generateId } from '../../utils'

export class ApplicationsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly pageHeader = (): Locator => this.page.locator('span[class*="header"]', { hasText: 'Applications' })
  readonly buttonCreateApplication = (): Locator =>
    this.page.locator('button.antiButton > span', { hasText: 'Application' })

  readonly buttonTalentSelector = (): Locator => this.page.locator('div[id="vacancy.talant.selector"]')
  readonly buttonSpaceSelector = (): Locator => this.page.locator('div[id="space.selector"]')
  readonly buttonAssignedRecruiter = (): Locator =>
    this.page.locator('button div.label', { hasText: 'Assigned recruiter' })

  readonly buttonCreateNewApplication = (): Locator =>
    this.page.locator('form[id="recruit:string:CreateApplication"] button[type="submit"]')

  readonly buttonTabCreated = (): Locator => this.page.locator('label[data-id="tab-created"]')
  readonly textTableFirstCell = (): Locator => this.page.locator('div[class$="firstCell"]')
  readonly buttonTypeSelector = (): Locator =>
    this.page.locator('div[class*="hulyHeader-container"] div[class*="hulyHeader-titleGroup"] button')

  // ACTIONS
  async clickButtonTabCreated (): Promise<void> {
    await this.buttonTabCreated().click()
  }

  async createNewApplication (data: NewApplication): Promise<void> {
    await this.buttonCreateApplication().click()
    await this.selectTalent(data.talentsName ?? 'first')
    await this.selectVacancy(data.vacancy)
    await this.selectRecruiter(data.recruiterName)
    await this.buttonCreateNewApplication().click()
  }

  async createNewApplicationWithNewTalent (data: NewApplication): Promise<TalentName> {
    const talentName: TalentName = {
      firstName: `TestFirst-${generateId(2)}`,
      lastName: `TestLast-${generateId(2)}`
    }

    // TODO: rectify vacancy types in test workspace
    await this.selectType('Default vacancy (custom)', true)
    await this.buttonCreateApplication().click()
    await this.buttonTalentSelector().click()
    await this.pressCreateButtonSelectPopup(this.page)
    await this.createNewTalentPopup(this.page, talentName.firstName, talentName.lastName)
    await this.selectVacancy(data.vacancy)
    await this.selectRecruiter(data.recruiterName)
    await this.buttonCreateNewApplication().click()
    return talentName
  }

  async selectTalent (name: string): Promise<void> {
    await this.buttonTalentSelector().click()
    await this.selectMenuItem(this.page, name)
  }

  async selectVacancy (name: string): Promise<void> {
    await this.buttonSpaceSelector().click()
    await this.selectMenuItem(this.page, name)
  }

  async selectRecruiter (name: string): Promise<void> {
    await this.buttonAssignedRecruiter().click()
    await this.selectMenuItem(this.page, name)
  }

  async openApplicationByTalentName (talentName: TalentName): Promise<void> {
    await this.page
      .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
      .locator('div[class*="firstCell"]')
      .click()
    await expect(
      this.page.locator('div.hulyHeader-container div.hulyHeader-titleGroup', { hasText: talentName.lastName })
    ).toBeVisible({ timeout: 1000 })
  }

  async checkApplicationState (talentName: TalentName, done: string): Promise<void> {
    await expect(
      this.page
        .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
        .locator('td')
        .nth(4)
    ).toHaveText(done)
  }

  async checkApplicationNotExist (applicationId: string): Promise<void> {
    await expect(this.textTableFirstCell().filter({ hasText: applicationId })).toHaveCount(0)
  }

  async changeApplicationStatus (talentName: TalentName, status: string): Promise<void> {
    await this.page
      .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
      .locator('td')
      .nth(4)
      .click()
    await this.selectFromDropdown(this.page, status)
  }

  async selectType (type: string, fullWordFilter: boolean = false): Promise<void> {
    await this.buttonTypeSelector().click()
    await this.selectMenuItem(this.page, type, fullWordFilter)
  }
}
