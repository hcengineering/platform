import { IssuesPage } from './issues-page'
import { type Locator, type Page, expect } from '@playwright/test'
import path from 'path'

export class IssueCommentPopup extends IssuesPage {
  readonly page: Page
  readonly inputCommentText: Locator
  readonly inputAttachFile: Locator
  readonly textAttachFileName: Locator
  readonly buttonSendComment: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputCommentText = page.locator('div[class*="commentPopup"] div.tiptap')
    this.inputAttachFile = page.locator('div[class*="commentPopup"] input#file')
    this.textAttachFileName = page.locator('div[class*="commentPopup"] div[class*="attachment"] div.name')
    this.buttonSendComment = page.locator('div[class*="commentPopup"] div.buttons-panel > button[type="button"]')
  }

  async addCommentInPopup (commentText: string, attachmentFileName?: string): Promise<void> {
    await this.inputCommentText.fill(commentText)
    if (attachmentFileName != null) {
      await this.inputAttachFile.setInputFiles(path.join(__dirname, `../../files/${attachmentFileName}`))
      await expect(this.textAttachFileName).toHaveText(attachmentFileName)
    }

    await this.buttonSendComment.click()
  }
}
