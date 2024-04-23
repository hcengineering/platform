import { expect, type Locator, type Page } from '@playwright/test'
import { TalentName } from './types'
import { generateId } from '../../utils'
import { CommonRecruitingPage } from './common-recruiting-page'

export class TalentsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly pageHeader = (): Locator => this.page.locator('span[class*="header"]', { hasText: 'Talents' })
  readonly buttonCreateTalent = (): Locator =>
    this.page.locator('div[class*="ac-header"] button > span', { hasText: 'Talent' })

  readonly textVacancyMatchingTalent = (): Locator =>
    this.page.locator(
      'form[id="recruit:string:VacancyMatching"] table > tbody > tr > td:nth-child(1) span[class*="label"]'
    )

  readonly textVacancyMatchingScore = (): Locator =>
    this.page.locator('form[id="recruit:string:VacancyMatching"] table > tbody > tr > td:nth-child(2)')

  readonly inputSearchTalent = (): Locator => this.page.locator('div[class*="header"] input')
  readonly andreyTalet = (): Locator => this.page.locator('text=P. Andrey')

  readonly addApplicationButton = (): Locator => this.page.locator('button[id="appls.add"]')
  readonly spaceSelector = (): Locator => this.page.locator('[id="space.selector"]')
  readonly searchInput = (): Locator => this.page.locator('[placeholder="Search..."]')
  readonly backlogButton = (): Locator =>
    this.page.locator('[id="recruit:string:CreateApplication"] button:has-text("Backlog")')

  readonly createButton = (): Locator => this.page.locator('button:has-text("Create")')
  readonly assignedRecruiterButton = (): Locator => this.page.locator('button:has-text("Assigned recruiter")')
  readonly chenRosamundButton = (): Locator => this.page.locator('button:has-text("Chen Rosamund")')
  readonly vacancyApplicatio = (vacancyId: string): Locator =>
    this.page.locator(`tr:has-text("${vacancyId}") >> text=APP-`)

  readonly recruitApplicationButton = (): Locator =>
    this.page.locator('[id="app-recruit\\:string\\:RecruitApplication"]')

  readonly talentsTab = (): Locator => this.page.locator('text=Talents')
  readonly newTalentButton = (): Locator => this.page.locator('button:has-text("New Talent")')
  readonly addSocialLinksButton = (): Locator => this.page.locator('[id="presentation\\:string\\:AddSocialLinks"]')
  readonly emailSelectorButton = (): Locator => this.page.locator('.antiPopup').locator('text=Email')
  readonly confirmEmailButton = (): Locator => this.page.locator('#channel-ok.antiButton')
  readonly createTalentButton = (): Locator => this.page.locator('.antiCard button:has-text("Create")')
  readonly popupPanel = (): Locator => this.page.locator('.popupPanel')

  async clickAddApplication (): Promise<void> {
    await this.addApplicationButton().click()
  }

  async selectSpace (): Promise<void> {
    await this.spaceSelector().click()
  }

  async searchAndSelectVacancy (vacancyId: string): Promise<void> {
    await this.searchInput().fill(vacancyId)
    await this.page.click(`button:has-text("${vacancyId}")`)
    await this.page.waitForSelector('space.selector', { state: 'detached' })
  }

  async waitForBacklogVisible (): Promise<void> {
    await this.backlogButton().isVisible()
  }

  async waitForTimeout (): Promise<void> {
    await this.page.waitForTimeout(100)
  }

  async createApplication (): Promise<void> {
    await this.createButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
  }

  async clickVacancyApplication (vacancyId: string): Promise<void> {
    await this.vacancyApplicatio(vacancyId).click()
  }

  async assignRecruiter (): Promise<void> {
    await this.assignedRecruiterButton().click()
  }

  async selectChenRosamund (): Promise<void> {
    await this.chenRosamundButton().click()
  }

  async clickOnAndreyTalet (): Promise<void> {
    await this.andreyTalet().click()
  }

  async clickRecruitApplication (): Promise<void> {
    await this.recruitApplicationButton().click()
  }

  async clickTalentsTab (): Promise<void> {
    await this.talentsTab().click()
  }

  async clickNewTalent (): Promise<void> {
    await this.newTalentButton().click()
  }

  async enterFirstName (firstName: string): Promise<void> {
    const input = this.page.locator('[placeholder="First name"]')
    await input.click()
    await input.fill(firstName)
  }

  async enterLastName (lastName: string): Promise<void> {
    const input = this.page.locator('[placeholder="Last name"]')
    await input.click()
    await input.fill(lastName)
  }

  async enterTitle (title: string = 'Super Candidate'): Promise<void> {
    const input = this.page.locator('[placeholder="Title"]')
    await input.click()
    await input.fill(title)
  }

  async enterLocation (location: string): Promise<void> {
    const input = this.page.locator('[placeholder="Location"]')
    await input.click()
    await input.fill(location)
  }

  async addSocialLinks (): Promise<void> {
    await this.addSocialLinksButton().click()
  }

  async selectEmail (): Promise<void> {
    await this.emailSelectorButton().click()
  }

  async enterEmail (email: string): Promise<void> {
    const input = this.page.locator('[placeholder="john\\.appleseed@apple\\.com"]')
    await input.fill(email)
  }

  async confirmEmail (): Promise<void> {
    await this.confirmEmailButton().click()
  }

  async createTalent (): Promise<void> {
    await this.createTalentButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
  }

  async verifyTalentDetails (firstName: string, lastName: string, location: string): Promise<void> {
    const fullName = `${lastName} ${firstName}`
    await this.page.click(`text="${fullName}"`)
    await expect(this.page.locator(`text=${firstName}`).first()).toBeVisible()
    await expect(this.page.locator(`text=${lastName}`).first()).toBeVisible()
    await expect(this.page.locator(`text=${location}`).first()).toBeVisible()
  }

  async verifyEmailInPopup (email: string): Promise<void> {
    const emailLocator = this.popupPanel().locator('[id="gmail\\:string\\:Email"]')
    await emailLocator.scrollIntoViewIfNeeded()
    await emailLocator.click()
    const actualEmail = await this.page.locator('.cover-channel >> input').inputValue()
    expect(actualEmail).toEqual(email)
  }

  async createNewTalent (): Promise<TalentName> {
    const talentName: TalentName = {
      firstName: `TestFirst-${generateId(4)}`,
      lastName: `TestLast-${generateId(4)}`
    }
    await this.createNewTalentWithName(talentName.firstName, talentName.lastName)
    return talentName
  }

  async createNewTalentWithName (firstName: string, lastName: string): Promise<void> {
    await this.buttonCreateTalent().click()
    await this.createNewTalentPopup(this.page, firstName, lastName)
  }

  async openTalentByTalentName (talentName: TalentName): Promise<void> {
    await this.page
      .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
      .locator('a.noOverflow')
      .click()
  }

  async checkTalentNotExist (talentName: TalentName): Promise<void> {
    await expect(this.page.locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })).toHaveCount(0)
  }

  async rightClickAction (talentName: TalentName, action: string): Promise<void> {
    await this.page
      .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
      .click({ button: 'right' })
    await this.selectFromDropdown(this.page, action)
  }

  async checkMatchVacancy (talentName: string, score: string): Promise<void> {
    await expect(this.textVacancyMatchingTalent()).toContainText(talentName, { ignoreCase: true })
    await expect(this.textVacancyMatchingScore()).toContainText(score)
  }

  async searchTalentByTalentName (talentName: TalentName): Promise<void> {
    await this.inputSearchTalent().fill(`${talentName.lastName} ${talentName.firstName}`)
    await this.inputSearchTalent().press('Enter')
    await expect(this.page.locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })).toBeVisible()
  }
}
