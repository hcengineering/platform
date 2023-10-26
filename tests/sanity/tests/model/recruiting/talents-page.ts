import { expect, type Locator, type Page } from '@playwright/test'
import { TalentName } from './types'
import { generateId } from '../../utils'
import { CommonRecruitingPage } from './common-recruiting-page'

export class TalentsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateTalent: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Talents' })
    this.buttonCreateTalent = page.locator('div[class*="ac-header"] button > span', { hasText: 'Talent' })
  }

  async createNewTalent (): Promise<TalentName> {
    const talentName: TalentName = {
      firstName: `TestFirst-${generateId(4)}`,
      lastName: `TestLast-${generateId(4)}`
    }
    await this.buttonCreateTalent.click()
    await this.createNewTalentPopup(this.page, talentName.firstName, talentName.lastName)
    return talentName
  }

  async openTalentByTalentName (talentName: TalentName): Promise<void> {
    await this.page
      .locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })
      .locator('div[class$="firstCell"]')
      .click()
  }

  async checkTalentNotExist (talentName: TalentName): Promise<void> {
    await expect(this.page.locator('tr', { hasText: `${talentName.lastName} ${talentName.firstName}` })).toHaveCount(0)
  }
}
