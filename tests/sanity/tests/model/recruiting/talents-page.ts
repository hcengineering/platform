import { expect, type Locator, type Page } from '@playwright/test'
import { NewApplication, NewTalent, TalentName } from './types'
import { CommonPage } from '../common-page'
import { generateId } from '../../utils'
import { CommonRecruitingPage } from './common-recruiting-page'

export class TalentsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateTalent: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Talents' })
    this.buttonCreateTalent = page.locator('button > span', { hasText: 'Talent' })
  }

  async createNewTalent (data: NewTalent): Promise<TalentName> {
    const talentName: TalentName = {
      firstName: `TestFirst-${generateId(4)}`,
      lastName: `TestLast-${generateId(4)}`
    }

    await this.buttonCreateTalent.click()

    await this.buttonTalentSelector.click()
    await this.pressCreateButtonSelectPopup(this.page)
    await this.createNewTalentPopup(this.page, talentName.firstName, talentName.lastName)

    await this.selectVacancy(data.vacancy)
    await this.selectRecruiter(data.recruiterName)

    await this.buttonCreateNewApplication.click()

    return talentName
  }

}
