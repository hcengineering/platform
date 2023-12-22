import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewMilestone } from './types'

export class MilestonesDetailsPage extends CommonTrackerPage {
  readonly page: Page
  readonly inputTitle: Locator
  readonly buttonStatus: Locator
  readonly buttonTargetDate: Locator
  readonly inputMilestoneName: Locator
  readonly inputDescription: Locator
  readonly buttonYesMoveAndDeleteMilestonePopup: Locator
  readonly buttonModalOk: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputTitle = page.locator('div.popupPanel-body input[type="text"]')
    this.buttonStatus = page.locator('//span[text()="Status"]/following-sibling::div[1]/button')
    this.buttonTargetDate = page.locator('//span[text()="Target date"]/following-sibling::div[1]/button')
    this.inputMilestoneName = page.locator('input[placeholder="Milestone name"]')
    this.inputDescription = page.locator('div.inputMsg div.tiptap')
    this.buttonYesMoveAndDeleteMilestonePopup = page.locator(
      'form[id="tracker:string:MoveAndDeleteMilestone"] button.primary'
    )
    this.buttonModalOk = page.locator('div.popup div.footer button:first-child span', { hasText: 'Ok' })
  }

  async checkIssue (data: NewMilestone): Promise<void> {
    await expect(this.inputTitle).toHaveValue(data.name)
    if (data.description != null) {
      await expect(this.inputDescription).toHaveText(data.description)
    }
    if (data.status != null) {
      await expect(this.buttonStatus).toHaveText(data.status)
    }
  }

  async editIssue (data: NewMilestone): Promise<void> {
    if (data.name != null) {
      await this.inputTitle.fill(data.name)
    }
    if (data.description != null) {
      await this.inputDescription.fill(data.description)
    }
    if (data.status != null) {
      await this.buttonStatus.click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.targetDate != null) {
      await this.buttonTargetDate.click()
      await this.fillDatePopup(data.targetDate.day, data.targetDate.month, data.targetDate.year)
    }
    if (data.targetDateInDays != null) {
      await this.buttonTargetDate.click()
      await this.fillDatePopupInDays(data.targetDateInDays)
    }
  }

  async deleteMilestone (): Promise<void> {
    await this.buttonMoreActions.click()
    await this.selectFromDropdown(this.page, 'Delete')
    await this.buttonYesMoveAndDeleteMilestonePopup.click()
    await this.buttonModalOk.click()
  }
}
