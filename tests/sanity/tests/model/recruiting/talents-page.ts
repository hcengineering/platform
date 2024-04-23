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
