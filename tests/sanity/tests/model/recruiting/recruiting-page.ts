import { expect, type Locator, type Page } from '@playwright/test'

export class RecruitingPage {
  page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly recruitApplication = (): Locator => this.page.locator('[id="app-recruit\\:string\\:RecruitApplication"]')
  readonly talentsNavElement = (): Locator => this.page.locator('text=Talents')
  readonly reviews = (): Locator => this.page.locator('text=Reviews')
  readonly reviewButton = (): Locator => this.page.locator('button:has-text("Review")')

  readonly frontendEngineerOption = (): Locator => this.page.locator('td:has-text("Frontend Engineer")')
  readonly searchOrRunCommandInput = (): Locator =>
    this.page.locator('[placeholder="Search\\ or\\ run\\ a\\ command\\.\\.\\."]')

  readonly newTalentPopupOption = (): Locator => this.page.locator('div.selectPopup :text("New Talent")')
  readonly goToVacanciesPopupOption = (): Locator =>
    this.page.locator('div.selectPopup div.list-item :text("Go To Vacancies")')

  readonly goToApplicationsPopupOption = (): Locator => this.page.locator('div.selectPopup :text("Go To Applications")')
  readonly cardCloseButton = (): Locator => this.page.locator('button#card-close')
  readonly selectedTalentsNavElement = (): Locator => this.page.locator('a[href$="talents"] > div.selected')
  readonly actionsInput = (): Locator => this.page.locator('input.actionsInput')
  readonly newTalentFirstName = (): Locator => this.page.getByPlaceholder('First name')
  readonly newTalentLastName = (): Locator => this.page.getByPlaceholder('Last name')
  readonly newTalentModalPath = (): Locator => this.page.getByText('Person New Talent')

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
}
