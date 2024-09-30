import { expect, type Locator, type Page } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'
import { generateId } from '@hcengineering/core'
import { NewReview, TalentName } from './types'

export class ReviewsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly buttonReviews = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Reviews')
  readonly buttonNewReview = (): Locator => this.page.getByRole('button', { name: 'Review', exact: true })
  readonly buttonPopupTalentByName = (talent: TalentName): Locator =>
    this.page.locator(`button:has-text("${talent.lastName} ${talent.firstName}")`)

  readonly inputVerdict = (): Locator => this.page.locator('input[placeholder="Verdict"]')
  readonly buttonInputLocation = (): Locator => this.page.locator('span.labelOnPanel:has-text("Location") + div button')
  readonly editorDescription = (description: string): Locator => this.page.locator(`.tiptap:has-text("${description}")`)

  async addDescription (oldDescription: string, newDescription: string): Promise<void> {
    await this.editorDescription(oldDescription).fill(newDescription)
  }

  async addLocation (location: string): Promise<void> {
    await this.buttonInputLocation().first().click()
    await this.fillToSelectPopup(this.page, location)
  }

  async openReviews (): Promise<void> {
    await this.buttonReviews().click()
  }

  async enterTalent (talent: TalentName): Promise<void> {
    await this.clickTalent()
    await this.buttonPopupTalentByName(talent).click()
  }

  async clickOnReviewButton (): Promise<void> {
    await this.buttonNewReview().click()
  }

  async checkIfHeaderOfReviewHasTalentName (talent: TalentName): Promise<void> {
    await expect(
      this.page.locator(`.hulyHeader-titleGroup:has-text("${talent.lastName} ${talent.firstName}")`)
    ).toBeVisible()
  }

  // TODO: need to improve locator
  async updateTitle (newTitle: string): Promise<void> {
    const input = this.page.locator('[placeholder="Type text..."]')
    await input.click()
    await input.fill(newTitle)
  }

  async updateTalent (newTalent: TalentName): Promise<void> {
    await this.clickTalent()
    await this.buttonPopupTalentByName(newTalent).click()
  }

  async enterVerdict (verdict: string): Promise<void> {
    await this.inputVerdict().click()
    await this.inputVerdict().fill(verdict)
  }

  async enterLocation (location: string): Promise<void> {
    const input = this.page.locator('[placeholder="Location"]')
    await input.click()
    await input.fill(location)
  }

  async enterDescription (description: string): Promise<void> {
    const input = this.page.locator('[data-placeholder="Add description"]')
    await input.click()
    await input.fill(description)
  }

  async createReview ({ title, talent, location, description }: NewReview): Promise<string> {
    if (typeof title !== 'string') title = `Review ${generateId()}`
    await this.openReviews()
    await this.buttonNewReview().click()

    await this.clickOnTitle()
    await this.fillTitle(title)
    await this.enterTalent(talent)

    if (typeof location === 'string') {
      await this.enterLocation(location)
    }

    if (typeof description === 'string') {
      await this.enterDescription(description)
    }

    await this.confirmCreateReview()
    return title
  }

  async openAndCheckReview ({ title, talent, location, verdict, description }: NewReview): Promise<void> {
    if (typeof title !== 'string') title = `Review ${generateId()}`
    await this.openReviews()
    await this.selectReviewItem(title)

    await this.checkIfHeaderOfReviewHasTalentName(talent)

    if (typeof location === 'string') {
      await expect(this.page.locator(`text=${location}`).first()).toBeVisible()
    }

    if (typeof description === 'string') {
      await expect(this.page.locator(`text=${description}`).first()).toBeVisible()
    }

    if (typeof verdict === 'string') {
      await expect(this.page.locator(`text=${verdict}`).first()).toBeVisible()
    }
  }

  async openAndUpdateReview (oldData: NewReview, newData: NewReview): Promise<void> {
    await this.openReviews()
    await this.selectReviewItem(oldData.title)

    if (typeof newData.title === 'string') {
      await this.updateTitle(newData.title)
      await this.page.keyboard.press('Enter')
    }

    if (typeof newData.location === 'string') {
      await this.addLocation(newData.location)
    }

    if (typeof oldData.description === 'string' && typeof newData.description === 'string') {
      await this.addDescription(oldData.description, newData.description)
    }

    if (typeof newData.verdict === 'string') {
      await this.enterVerdict(newData.verdict)
    }
  }
}
