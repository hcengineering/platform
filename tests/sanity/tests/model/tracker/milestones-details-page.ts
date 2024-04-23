import { expect, type Locator } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewMilestone } from './types'

export class MilestonesDetailsPage extends CommonTrackerPage {
  inputTitle = (): Locator => this.page.locator('div.popupPanel-body input[type="text"]')
  buttonStatus = (): Locator => this.page.locator('//span[text()="Status"]/following-sibling::div[1]/button')
  buttonTargetDate = (): Locator => this.page.locator('//span[text()="Target date"]/following-sibling::div[1]/button')
  inputMilestoneName = (): Locator => this.page.locator('input[placeholder="Milestone name"]')
  inputDescription = (): Locator => this.page.locator('div.inputMsg div.tiptap')
  buttonYesMoveAndDeleteMilestonePopup = (): Locator =>
    this.page.locator('form[id="tracker:string:MoveAndDeleteMilestone"] button.primary')

  buttonModalOk = (): Locator => this.page.locator('div.popup div.footer button:first-child span', { hasText: 'Ok' })

  async checkIssue (data: NewMilestone): Promise<void> {
    await expect(this.inputTitle()).toHaveValue(data.name)
    if (data.description != null) {
      await expect(this.inputDescription()).toHaveText(data.description)
    }
    if (data.status != null) {
      await expect(this.buttonStatus()).toHaveText(data.status)
    }
  }

  async editIssue (data: NewMilestone): Promise<void> {
    if (data.name != null) {
      await this.inputTitle().fill(data.name)
    }
    if (data.description != null) {
      await this.inputDescription().fill(data.description)
    }
    if (data.status != null) {
      await this.buttonStatus().click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.targetDate != null) {
      await this.buttonTargetDate().click()
      await this.fillDatePopup(data.targetDate.day, data.targetDate.month, data.targetDate.year)
    }
    if (data.targetDateInDays != null) {
      await this.buttonTargetDate().click()
      await this.fillDatePopupInDays(data.targetDateInDays)
    }
  }

  async deleteMilestone (): Promise<void> {
    await this.buttonMoreActions().click()
    await this.selectFromDropdown(this.page, 'Delete')
    await this.buttonYesMoveAndDeleteMilestonePopup().click()
    await this.buttonModalOk().click()
  }
}
