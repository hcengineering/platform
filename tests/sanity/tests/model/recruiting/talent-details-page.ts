import { type Locator, type Page, expect } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'
import { MergeContacts } from './types'

export class TalentDetailsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly buttonClosePanel = (): Locator => this.page.locator('#btnPClose')
  readonly buttonAddSkill = (): Locator => this.page.locator('button#add-tag')
  readonly textTagItem = (): Locator => this.page.locator('div.tag-item')
  readonly inputLocation = (): Locator => this.page.locator('div.location input')
  readonly buttonInputTitle = (): Locator => this.page.locator('button > span', { hasText: 'Title' })
  readonly buttonInputSource = (): Locator => this.page.locator('button > span', { hasText: 'Source' })
  readonly buttonMergeContacts = (): Locator =>
    this.page.locator('button[class*="menuItem"] span', { hasText: 'Merge contacts' })

  readonly formMergeContacts = (): Locator => this.page.locator('form[id="contact:string:MergePersons"]')

  readonly buttonFinalContact = (): Locator => this.formMergeContacts().locator('button', { hasText: 'Final contact' })

  readonly buttonMergeRow = (hasText: string): Locator =>
    this.formMergeContacts().locator('div.box.flex-row-center div.antiRadio', { hasText }).locator('label')

  readonly buttonPopupMergeContacts = (): Locator =>
    this.formMergeContacts().locator('button:has-text("Merge contacts")')

  readonly textAttachmentName = (): Locator => this.page.locator('div.name a')
  readonly titleAndSourceTalent = (title: string): Locator => this.page.locator('button > span', { hasText: title })

  async addSkill (skillTag: string, skillDescription: string): Promise<void> {
    await this.buttonAddSkill().click()
    await this.pressCreateButtonSelectPopup(this.page)
    await this.addNewTagPopup(this.page, skillTag, skillDescription)

    await this.pressShowAllButtonSelectPopup(this.page)
    await this.page.keyboard.press('Escape')
  }

  async checkSkill (skillTag: string): Promise<void> {
    await expect(this.textTagItem().first()).toContainText(skillTag)
  }

  async enterLocation (location: string): Promise<void> {
    const input = this.inputLocation()
    await input.click()
    await input.fill(location)
  }

  async addTitle (title: string): Promise<void> {
    await this.buttonInputTitle().click()
    await this.fillToSelectPopup(this.page, title)
  }

  async addSource (source: string): Promise<void> {
    await this.buttonInputSource().click()
    await this.fillToSelectPopup(this.page, source)
  }

  async mergeContacts (talentName: MergeContacts): Promise<void> {
    await this.buttonMoreActions().click()
    await this.buttonMergeContacts().click()

    await this.buttonFinalContact().click()
    await this.selectMenuItem(this.page, talentName.finalContactName)

    await expect(this.buttonMergeRow(talentName.name)).toBeVisible()

    await this.buttonMergeRow(talentName.name).click()
    if (talentName.mergeLocation) {
      await this.buttonMergeRow(talentName.location).click()
    }
    if (talentName.mergeTitle) {
      await this.buttonMergeRow(talentName.title).click()
    }
    if (talentName.mergeSource) {
      await this.buttonMergeRow(talentName.source).click()
    }

    await this.buttonPopupMergeContacts().click()
  }

  async waitTalentDetailsOpened (applicationFirstName: string, applicationLastName?: string): Promise<void> {
    await this.page.waitForSelector(`div[class*="header"] div.name:first-child :has-text("${applicationFirstName}")`)
    if (applicationLastName != null) {
      await this.page.waitForSelector(`div[class*="header"] div.name:nth-child(2) :has-text("${applicationFirstName}")`)
    }
  }

  async checkMergeContacts (location: string, title: string, source: string): Promise<void> {
    await expect(this.page.locator('div.location input')).toHaveValue(location)
    await expect(this.titleAndSourceTalent(title)).toBeVisible()
    await expect(this.titleAndSourceTalent(source)).toBeVisible()
  }
}
