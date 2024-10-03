import { expect, type Locator, type Page } from '@playwright/test'

export class RecruitingPage {
  page: Page

  constructor (page: Page) {
    this.page = page
  }

  recruitApplication = (): Locator => this.page.locator('[id="app-recruit\\:string\\:RecruitApplication"]')
  talentsNavElement = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Talents')
  reviews = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Reviews')
  reviewButton = (): Locator => this.page.getByRole('button', { name: 'Review', exact: true })

  frontendEngineerOption = (): Locator => this.page.locator('td:has-text("Frontend Engineer")')
  searchOrRunCommandInput = (): Locator => this.page.locator('[placeholder="Search\\ or\\ run\\ a\\ command\\.\\.\\."]')

  newTalentPopupOption = (): Locator => this.page.locator('div.selectPopup :text("New Talent")')
  goToVacanciesPopupOption = (): Locator => this.page.locator('div.selectPopup div.list-item :text("Go To Vacancies")')

  goToApplicationsPopupOption = (): Locator => this.page.locator('div.selectPopup :text("Go To Applications")')
  cardCloseButton = (): Locator => this.page.locator('button#card-close')
  selectedTalentsNavElement = (): Locator => this.page.locator('a[href$="talents"] > div.selected')
  actionsInput = (): Locator => this.page.locator('input.actionsInput')
  newTalentFirstName = (): Locator => this.page.getByPlaceholder('First name')
  newTalentLastName = (): Locator => this.page.getByPlaceholder('Last name')
  newTalentModalPath = (): Locator => this.page.getByText('Person New Talent')
  recruitApplicationButton = (): Locator => this.page.locator('[id="app-recruit\\:string\\:RecruitApplication"]')
  applicationsLink = (): Locator => this.page.locator('text=/^Applications/')
  talentsLink = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Talents')
  vacanciesLink = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Vacancies')
  softwareEngineerLink = (): Locator => this.page.locator('text=Software Engineer')
  applicationLabelChunterButton = (): Locator =>
    this.page.locator('[id="app-chunter\\:string\\:ApplicationLabelChunter"]')

  generalChatLink = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=general')
  contactsButton = (): Locator => this.page.locator('[id="app-contact\\:string\\:Contacts"]')
  employeeSection = (): Locator => this.page.getByRole('button', { name: 'Employee' })
  johnAppleseed = (): Locator => this.page.locator('text=Appleseed John')

  async clickRecruitApplication (): Promise<void> {
    await this.recruitApplication().click()
  }

  async clickOnReviews (): Promise<void> {
    await this.reviews().click()
  }

  async clickOnReviewButton (): Promise<void> {
    await this.reviewButton().click()
  }

  async clickTalentsNavElement (): Promise<void> {
    await this.talentsNavElement().click()
  }

  async clickFrontendEngineerOption (): Promise<void> {
    await this.frontendEngineerOption().click()
  }

  async pressMetaK (): Promise<void> {
    await this.page.press('body', 'Meta+k')
  }

  async fillSearchOrRunCommandInput (text: string): Promise<void> {
    await this.searchOrRunCommandInput().fill(text)
  }

  async clickNewTalentPopup (): Promise<void> {
    await this.newTalentPopupOption().click()
  }

  async clickTalentCloseButton (): Promise<void> {
    await this.cardCloseButton().click()
  }

  async inputActionsInput (text: string): Promise<void> {
    await this.actionsInput().click()
    await this.actionsInput().fill(text)
  }

  async clickGoToVacanciesPopupOption (): Promise<void> {
    await this.goToVacanciesPopupOption().click({ delay: 100 })
  }

  async clickOnGoToApplicationsPopupOption (): Promise<void> {
    await this.goToApplicationsPopupOption().click({ delay: 100 })
  }

  // ASSERTIONS

  async checkIfCorrectURL (url: string): Promise<void> {
    expect(this.page.url()).toBe(url)
  }

  async checkIfnewTalentPopupOptionIsVisible (): Promise<void> {
    expect(await this.newTalentPopupOption().isVisible())
  }

  async checkIfSelectedTalentsNavElementIsVisible (): Promise<void> {
    expect(await this.selectedTalentsNavElement().isVisible())
  }

  async checkIfNewTalentModalIsClosed (): Promise<void> {
    expect(await this.newTalentFirstName().isHidden())
    expect(await this.newTalentLastName().isHidden())
    expect(await this.newTalentModalPath().isHidden())
  }

  async navigateToRecruitApplication (workspaceUrl: string): Promise<void> {
    await this.page.goto(workspaceUrl)
  }

  async openRecruitApplication (): Promise<void> {
    await this.recruitApplicationButton().click()
  }

  async checkApplicationsVisibility (): Promise<void> {
    await this.applicationsLink().click()
    await expect(this.page.locator('text=Applications >> nth=1')).toBeVisible()
    expect(this.page.locator('text="APP-1"')).toBeDefined()
  }

  async verifyTalentSection (): Promise<void> {
    await this.talentsLink().click()
    await expect(this.page.locator('text=P. Andrey')).toBeVisible()
  }

  async navigateToVacanciesAndCheckSoftwareEngineer (): Promise<void> {
    await this.vacanciesLink().click()
    await this.softwareEngineerLink().click()
    expect(this.page.locator('text=Software Engineer')).toBeDefined()
    expect(this.page.locator('text="APP-1"')).toBeDefined()
  }

  async navigateToGeneralChatAndContacts (): Promise<void> {
    await this.applicationLabelChunterButton().click()
    await this.generalChatLink().click()
    await expect(this.page.locator('.text-input')).toBeVisible()
    await this.contactsButton().click()
    await this.employeeSection().click()
    await expect(this.johnAppleseed()).toBeVisible()
  }
}
