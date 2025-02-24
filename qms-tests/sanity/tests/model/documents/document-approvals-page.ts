import { type Page, expect } from '@playwright/test'
import { DocumentCommonPage } from './document-common-page'

export class DocumentApprovalsPage extends DocumentCommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  async checkRejectApproval (approvalName: string, message: string): Promise<void> {
    await expect(
      this.page
        .locator('div.approval-status-message', { hasText: message })
        .locator('xpath=..')
        .locator('div.approver span.ap-label')
        .last()
    ).toHaveText(approvalName)
  }

  async checkSuccessApproval (approvalName: string): Promise<void> {
    await expect(
      this.page.locator('svg[fill*="accepted"]').locator('xpath=../..').locator('span.ap-label').last()
    ).toHaveText(approvalName)
  }
}
