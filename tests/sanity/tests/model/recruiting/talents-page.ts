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

  pageHeader = (): Locator => this.page.locator('span[class*="header"]', { hasText: 'Talents' })
  buttonCreateTalent = (): Locator => this.page.getByRole('button', { name: 'New Talent', exact: true })

  textVacancyMatchingTalent = (): Locator =>
    this.page.locator(
      'form[id="recruit:string:VacancyMatching"] table > tbody > tr > td:nth-child(1) span[class*="label"]'
    )

  textVacancyMatchingScore = (): Locator =>
    this.page.locator('form[id="recruit:string:VacancyMatching"] table > tbody > tr > td:nth-child(2)')

  inputSearchTalent = (): Locator => this.page.getByPlaceholder('Search')
  andreyTalet = (): Locator => this.page.locator('text=P. Andrey')

  readonly addApplicationButton = (): Locator => this.page.locator('button[id="appls.add"]')
  readonly spaceSelector = (): Locator => this.page.locator('[id="space.selector"]')
  readonly searchInput = (): Locator => this.page.locator('[placeholder="Search..."]')
  readonly hrInterviewButton = (): Locator =>
    this.page.locator('[id="recruit:string:CreateApplication"] button:has-text("HR Interview")')

  createButton = (): Locator => this.page.locator('button:has-text("Create")')
  assignedRecruiterButton = (): Locator => this.page.locator('button:has-text("Assigned recruiter")')
  chenRosamundButton = (): Locator => this.page.locator('button:has-text("Chen Rosamund")')
  recruterSelectItemButton = (name: string): Locator =>
    this.page.locator(`button.menu-item.withList:has-text("${name}")`)

  vacancyApplicatio = (vacancyId: string): Locator => this.page.locator(`tr:has-text("${vacancyId}") >> text=APP-`)

  recruitApplicationButton = (): Locator => this.page.locator('[id="app-recruit\\:string\\:RecruitApplication"]')

  talentsTab = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Talents')
  newTalentButton = (): Locator => this.page.locator('button:has-text("New Talent")')
  addSocialLinksButton = (): Locator => this.page.locator('[id="presentation\\:string\\:AddSocialLinks"]').last()
  emailSelectorButton = (): Locator => this.page.locator('.antiPopup').locator('text=Email')
  confirmEmailButton = (): Locator => this.page.locator('#channel-ok.antiButton')
  createTalentButton = (): Locator => this.page.locator('.antiCard button:has-text("Create")')
  popupPanel = (): Locator => this.page.locator('.popupPanel')
  talentsLink = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Talents')
  firstNameInput = (): Locator => this.page.locator('[placeholder="First name"]')
  lastNameInput = (): Locator => this.page.locator('[placeholder="Last name"]')
  skillsButton = (): Locator =>
    this.page.locator('[id="recruit\\:string\\:CreateTalent"]').getByRole('button', { name: 'Skills' })

  addSkillButton = (): Locator => this.page.locator('.header > button:nth-child(3)')
  skillTitleInput = (): Locator => this.page.getByPlaceholder('Please type  title')
  createSkillInput = (): Locator => this.page.getByPlaceholder('Please type skill title')

  createSkillButton = (): Locator => this.page.locator('form[id="tags:string:AddTag"]  button:has-text("Create")')
  selectSkillButton = (skillName: string): Locator => this.page.locator(`button:has-text("${skillName}") .check`)
  createCandidateButton = (): Locator => this.page.locator('button:has-text("Create")')
  openOtherSkills = (): Locator => this.page.getByText('Other')
  skillsLink = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Skills')
  newSkillButton = (): Locator => this.page.getByRole('button', { name: 'Skill', exact: true })
  emailContact = (): Locator =>
    this.page.locator('div[class^="popupPanel-body__header"] button[id="gmail:string:Email"]')

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

  async waitForHRInterviewVisible (): Promise<void> {
    await this.hrInterviewButton().isVisible()
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

  async selectRecruterToAssignByName (recruterName: string): Promise<void> {
    await this.recruterSelectItemButton(recruterName).click()
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
    await this.emailContact().click()
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

  async searchTalentByTalentName (talentName: TalentName): Promise<void> {
    await this.inputSearchIcon().click()
    await this.inputSearchTalent().fill(`${talentName.lastName} ${talentName.firstName}`)
    await this.inputSearchTalent().press('Enter')
    await expect(this.page.locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })).toBeVisible()
  }

  async navigateToPage (workspaceUrl: string): Promise<void> {
    const response = await this.page.goto(workspaceUrl)
    if (response === null || response === undefined) {
      throw new Error(`Failed to navigate to ${workspaceUrl}`)
    }
    await response.finished()
  }

  async openRecruitApplication (): Promise<void> {
    await this.recruitApplicationButton().click()
  }

  async selectTalentsSection (PlatformURI: string): Promise<void> {
    await this.talentsLink().click()
    await expect(this.page).toHaveURL(PlatformURI)
  }

  // async createNewTalent(firstName: string, lastName: string): Promise<void> {
  //     await this.newTalentButton().click();
  //     await this.firstNameInput().fill(firstName);
  //     await this.lastNameInput().click();
  //     await this.lastNameInput().fill(lastName);
  // }

  async inputNewTallent (firstName: string, lastName: string): Promise<void> {
    await this.newTalentButton().click()
    await this.firstNameInput().fill(firstName)
    await this.lastNameInput().click()
    await this.lastNameInput().fill(lastName)
  }

  async addSkill (skillName: string): Promise<void> {
    await this.skillsButton().click()
    await this.addSkillButton().click()
    await this.skillTitleInput().fill(skillName)
    await this.createSkillButton().click()
    await this.page.waitForSelector('form[id="tags:string:AddTag"]', { state: 'detached' })
  }

  async clickOpenOtherSkills (): Promise<void> {
    await this.openOtherSkills().click()
  }

  async selectSkill (skillName: string): Promise<void> {
    await this.selectSkillButton(skillName).click()
    await this.page.keyboard.press('Escape')
  }

  async createCandidate (): Promise<void> {
    await this.createCandidateButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
  }

  async clickSkillsLink (): Promise<void> {
    await this.skillsLink().click()
  }

  async createSkill (PlatformURI: string, skillName: string): Promise<void> {
    await expect(this.page).toHaveURL(PlatformURI)
    await this.newSkillButton().click()
    await this.createSkillInput().click()
    await this.createSkillInput().fill(skillName)
    await this.createSkillButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
  }

  async createCandidateWithSkills (firstName: string, lastName: string, skills: string[]): Promise<void> {
    await this.talentsLink().click()
    await this.newTalentButton().click()
    await this.firstNameInput().click()
    await this.firstNameInput().fill(firstName)
    await this.lastNameInput().click()
    await this.lastNameInput().fill(lastName)
    await this.skillsButton().click()
    await this.clickOpenOtherSkills()
    for (const skill of skills) {
      await this.page.click(`text=${skill}`)
    }
    await this.page.keyboard.press('Escape')
    await this.createCandidateButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
    await this.page.click(`tr > :has-text("${lastName} ${firstName}")`)
    for (const skill of skills) {
      await expect(this.page.locator(`text=${skill}`).first()).toBeVisible()
    }
  }
}
