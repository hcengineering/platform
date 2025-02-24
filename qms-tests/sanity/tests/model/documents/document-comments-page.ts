import { type Locator, type Page, expect } from '@playwright/test'
import { DocumentCommonPage } from './document-common-page'

export class DocumentCommentsPage extends DocumentCommonPage {
  readonly page: Page
  readonly buttonDocumentTitle: Locator
  readonly comments: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonDocumentTitle = page.locator('button.version-item span.name')
    this.comments = page.locator('div[data-float="aside"]').getByTestId('comment')
  }

  getCommentLocator (message: string): Locator {
    return this.comments.filter({
      has: this.page.locator('div.activityMessage p.p-inline', { hasText: message })
    })
  }

  async checkCommentExist (message: string): Promise<void> {
    await expect(this.getCommentLocator(message)).toBeVisible()
  }

  async checkCommentDoesNotExist (message: string): Promise<void> {
    await expect(this.getCommentLocator(message)).toHaveCount(0)
  }

  async resolveComment (message: string): Promise<void> {
    const commentLocator = this.getCommentLocator(message)

    await commentLocator.hover()
    await commentLocator.locator('div.tools button').click()
  }

  async resolveAllComments (): Promise<void> {
    const buttonsCount: number = await this.page.locator('div[data-float="aside"] div.root div.tools button').count()
    for (let i = 0; i < buttonsCount; i++) {
      await this.page.locator('div[data-float="aside"] div.root').first().click()
      await this.page.locator('div[data-float="aside"] div.root div.tools button').first().click()
    }
  }

  async checkCommentNotExist (message: string): Promise<void> {
    await expect(this.page.locator('div[data-float="aside"] div.root span', { hasText: message })).toHaveCount(0)
  }

  async checkCommentCanBeResolved (message: string): Promise<void> {
    const commentLocator = this.getCommentLocator(message)

    await commentLocator.hover()
    await expect(commentLocator.locator('div.tools button')).toBeEnabled()
  }

  async checkCommentCanNotBeResolved (message: string, position: number): Promise<void> {
    const commentLocator = this.getCommentLocator(message)

    await commentLocator.hover()
    await expect(commentLocator.locator('div.tools button')).not.toBeVisible()
  }

  async addReplyInPopupByCommentId (commentId: number, replyText: string): Promise<void> {
    const comment = this.page
      .locator('div.popup div.root div.header span:first-child', { hasText: String(commentId) })
      .locator('xpath=../../../..')
    await comment.locator('div.ref-input div.tiptap').fill(replyText)
    await comment.locator('div.ref-input div.buttons-panel > button').click()
  }

  async checkCommentInPopupById (
    commentId: number,
    header: string,
    author: string,
    message: string,
    reply: string
  ): Promise<void> {
    const comment = this.page
      .locator('div.text-editor-popup span[data-id="commentId"]', { hasText: `#${String(commentId)}` })
      .locator('xpath=../../../..')
    // check header
    await expect(comment.locator('div.root > div.header > span.overflow-label')).toContainText(header)
    // can be resolved
    await comment.locator('div.header div.tools button').hover()
    await expect(comment.locator('div.header div.tools button')).toBeEnabled()
    // check author
    await expect(comment.locator('div.activityMessage div.header a span[class*="label"]').first()).toHaveText(author)
    // check message
    await expect(
      comment.locator('div.activityMessage div.flex-col div.clear-mins div.text-markup-view > p').first()
    ).toHaveText(message)
    // check comment
    await expect(
      comment.locator('div.activityMessage div.flex-col div.clear-mins div.text-markup-view > p').last()
    ).toHaveText(reply)
  }

  async checkCommentInPanelById (
    commentId: number,
    header: string,
    author: string,
    message: string,
    reply: string
  ): Promise<void> {
    const comment = this.page
      .locator('div[data-testid="comment"] span[data-id="commentId"]', { hasText: `#${String(commentId)}` })
      .locator('xpath=../../../..')
    // check header
    await expect(comment.locator('div.root > div.header > span.overflow-label')).toContainText(header)
    // can be resolved
    await comment.locator('div.root > div.header > span.overflow-label').first().hover()
    await expect(comment.locator('div.header div.tools button')).toBeEnabled()
    // check author
    await expect(comment.locator('div.activityMessage div.header a span[class*="label"]').first()).toHaveText(author)
    // check message
    await expect(
      comment.locator('div.activityMessage div.flex-col div.clear-mins div.text-markup-view > p').first()
    ).toHaveText(message)
    // check comment
    await expect(
      comment.locator('div.activityMessage div.flex-col div.clear-mins div.text-markup-view > p').last()
    ).toHaveText(reply)
  }
}
