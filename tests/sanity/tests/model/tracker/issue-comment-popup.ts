import { IssuesPage } from './issues-page'
import { type Locator, expect } from '@playwright/test'
import path from 'path'

export class IssueCommentPopup extends IssuesPage {
  inputCommentText = (): Locator => this.page.locator('div[class*="commentPopup"] div.tiptap')
  inputAttachFile = (): Locator => this.page.locator('div[class*="commentPopup"] input#file')
  textAttachFileName = (): Locator => this.page.locator('div[class*="commentPopup"] div[class*="attachment"] div.name')
  buttonSendComment = (): Locator =>
    this.page.locator('div[class*="commentPopup"] div.buttons-panel > button[type="button"]')

  async addCommentInPopup (commentText: string, attachmentFileName?: string): Promise<void> {
    await this.inputCommentText().fill(commentText)
    if (attachmentFileName != null) {
      await this.inputAttachFile().setInputFiles(path.join(__dirname, `../../files/${attachmentFileName}`))
      await expect(this.textAttachFileName()).toHaveText(attachmentFileName)
    }

    await this.buttonSendComment().click()
  }
}
