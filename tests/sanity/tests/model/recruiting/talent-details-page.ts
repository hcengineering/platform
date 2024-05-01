import { type Locator, type Page, expect } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'
import { MergeContacts } from './types'

export class TalentDetailsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly buttonAddSkill = (): Locator => this.page.locator('button#add-tag')
  readonly textTagItem = (): Locator => this.page.locator('div.tag-item')
  readonly inputLocation = (): Locator => this.page.locator('div.location input')
  readonly buttonInputTitle = (): Locator => this.page.locator('button > span', { hasText: 'Title' })
  readonly buttonInputSource = (): Locator => this.page.locator('button > span', { hasText: 'Source' })
  readonly buttonMergeContacts = (): Locator =>
    this.page.locator('button[class*="menuItem"] span', { hasText: 'Merge contacts' })

  readonly buttonFinalContact = (): Locator =>
    this.page.locator('form[id="contact:string:MergePersons"] button', { hasText: 'Final contact' })

  readonly buttonMergeRow = (): Locator => this.page.locator('form[id="contact:string:MergePersons"] div.box')
  readonly buttonPopupMergeContacts = (): Locator =>
    this.page.locator('form[id="contact:string:MergePersons"] button > span', { hasText: 'Merge contacts' })

  readonly textAttachmentName = (): Locator => this.page.locator('div.name a')
  readonly titleAndSourceTalent = (title: string): Locator => this.page.locator('button > span', { hasText: title })

  async addSkill (skillTag: string, skillDescription: string): Promise<void> {
    await this.buttonAddSkill().click()
    await this.pressCreateButtonSelectPopup()
    await this.addNewTagPopup(this.page, skillTag, skillDescription)

    await this.pressShowAllButtonSelectPopup()
    await this.page.keyboard.press('Escape')
  }

  async checkSkill (skillTag: string): Promise<void> {
    await expect(this.textTagItem().first()).toContainText(skillTag)
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

    await this.buttonMergeRow()
      .locator('div.flex-center', { hasText: talentName.name })
      .locator('label.checkbox-container')
      .click()

    if (talentName.mergeLocation) {
      await this.buttonMergeRow()
        .locator('div.flex-center', { hasText: talentName.location })
        .locator('label.checkbox-container')
        .click()
    }
    if (talentName.mergeTitle) {
      await this.buttonMergeRow()
        .locator('div.flex-center', { hasText: talentName.title })
        .locator('label.checkbox-container')
        .click()
    }
    if (talentName.mergeSource) {
      await this.buttonMergeRow()
        .locator('div.flex-center', { hasText: talentName.source })
        .locator('label.checkbox-container')
        .click()
    }

    await this.buttonPopupMergeContacts().click()
  }
  async checkMergeContacts (talentName: string, title: string, source: string): Promise<void> {
    await expect(this.page.locator('div.location input')).toHaveValue(talentName)
    await expect(this.titleAndSourceTalent(title)).toBeVisible()
    await expect(this.titleAndSourceTalent(source)).toBeVisible()
  }
}
