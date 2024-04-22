import { expect, type Locator } from '@playwright/test'
import path from 'path'
import { attachScreenshot, iterateLocator } from '../../utils'
import { CommonTrackerPage } from './common-tracker-page'
import { NewIssue } from './types'

export class IssuesPage extends CommonTrackerPage {
  modelSelectorAll = (): Locator => this.page.locator('div[data-id="tab-all"]')
  modelSelectorActive = (): Locator => this.page.locator('div[data-id="tab-active"]')
  modelSelectorBacklog = (): Locator => this.page.locator('div[data-id="tab-backlog"]')
  buttonCreateNewIssue = (): Locator => this.page.locator('button > div', { hasText: 'New issue' })
  inputPopupCreateNewIssueTitle = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] input[type="text"]')

  inputPopupCreateNewIssueDescription = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div.tiptap')

  buttonPopupCreateNewIssueStatus = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div#status-editor button')

  buttonPopupCreateNewIssuePriority = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div#priority-editor button')

  buttonPopupCreateNewIssueAssignee = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div#assignee-editor button')

  buttonPopupCreateNewIssueLabels = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] button span', { hasText: 'Labels' })

  buttonPopupCreateNewIssueComponent = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] button span[title="No component"]')

  buttonPopupCreateNewIssueEstimation = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div#estimation-editor button')

  buttonPopupCreateNewIssueMilestone = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div#milestone-editor button')

  buttonPopupCreateNewIssueDuedate = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div#duedate-editor button')

  inputPopupCreateNewIssueFile = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] input[type="file"]#file')

  textPopupCreateNewIssueFile = (): Locator => this.page.locator('div[class*="attachments"] > div[class*="attachment"]')
  buttonCreateIssue = (): Locator => this.page.locator('button > span', { hasText: 'Create issue' })
  inputSearch = (): Locator => this.page.locator('input[placeholder="Search"]')
  linkSidebarAll = (): Locator => this.page.locator('a[href$="all-issues"]')
  linkSidebarMyIssue = (): Locator => this.page.locator('a[href$="my-issues"]')
  buttonClearFilers = (): Locator => this.page.locator('div.search-start > div:first-child button')
  issuesList = (): Locator => this.page.locator('div.listGrid')
  buttonPopupCreateNewIssueParent = (): Locator => this.page.locator('div#parentissue-editor button')
  buttonPopupCreateNewIssueTemplate = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div[class*="title"] > div > button')

  inputPopupAddAttachmentsFile = (): Locator => this.page.locator('div.popup-tooltip input#file')
  textPopupAddAttachmentsFile = (): Locator => this.page.locator('div.popup-tooltip div.item div.name')
  buttonCollapsedCategories = (): Locator => this.page.locator('div.categoryHeader.collapsed')
  pupupTagsPopup = (): Locator => this.page.locator('.popup#TagsPopup')
  issupeByName = (issueName: string): Locator => this.page.locator('a', { hasText: issueName })
  issueNotExist = (issueName: string): Locator => this.page.locator('tr', { hasText: issueName })
  filterRowExists = (issueName: string): Locator => this.page.locator('div.row span', { hasText: issueName })
  issueListGrid = (): Locator => this.page.locator('div.listGrid')
  issueList = (): Locator => this.page.locator('div[class*="square"] > div')
  issueByName = (issueName: string): Locator => this.page.locator('a', { hasText: issueName })
  parentIssueLocator = (issueName: string): Locator =>
    this.issueByName(issueName).locator('xpath=../..').locator('div.root span.parent-label:first-child')

  priorityContainer = (baseLocator: Locator): Locator => baseLocator.locator('div.priority-container use')
  issueIdLocator = (issueLabel: string): Locator => this.page.locator(`span[title="${issueLabel}"].overflow-label`)
  issueAnchorById = (issueId: string): Locator =>
    this.page.locator(`div.listGrid div.flex-no-shrink a[href$="${issueId}"]`)

  issueAnchorByName = (issueName: string): Locator => this.page.locator('div.listGrid a', { hasText: issueName })
  rowWithText = (issueName: string): Locator => this.page.locator('div.row span', { hasText: issueName })

  commonAncestorForOperations = (issueName: string): Locator => this.rowWithText(issueName).locator('xpath=..')

  attachmentContentButton = (issueName: string): Locator =>
    this.commonAncestorForOperations(issueName).locator('a > button > div[slot="content"]')

  addAttachmentButton = (issueName: string): Locator =>
    this.commonAncestorForOperations(issueName).locator('a > button')

  deleteAttachmentLink = (filePath: string): Locator =>
    this.page
      .locator(`div.popup-tooltip div.item div.name a[download="${filePath}"]`)
      .locator('xpath=../..')
      .locator('span.remove-link')

  commentButton = (issueName: string): Locator => this.commonAncestorForOperations(issueName).locator('button').first()
  commentCountLocator = (issueName: string): Locator =>
    this.commonAncestorForOperations(issueName).locator('button > div[slot="content"]').first()

  async createNewIssue (data: NewIssue, closeNotification: boolean = false): Promise<void> {
    await this.buttonCreateNewIssue().click()
    await this.fillNewIssueForm(data)
    await this.buttonCreateIssue().click()
    if (closeNotification) {
      await this.closeNotification(this.page)
    }
    await attachScreenshot(`createdNewIssue-${data.title}.png`, this.page)
  }

  async fillNewIssueForm (data: NewIssue): Promise<void> {
    await this.inputPopupCreateNewIssueTitle().fill(data.title)
    await this.inputPopupCreateNewIssueDescription().fill(data.description)
    if (data.status != null) {
      await this.buttonPopupCreateNewIssueStatus().click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.priority != null) {
      await this.buttonPopupCreateNewIssuePriority().click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonPopupCreateNewIssueAssignee().click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      await this.buttonPopupCreateNewIssueLabels().click()
      if (data.createLabel) {
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from createNewIssue')
        await this.pupupTagsPopup().press('Escape')
      } else {
        await this.checkFromDropdown(this.page, data.labels)
      }
    }
    if (data.component != null) {
      await this.buttonPopupCreateNewIssueComponent().click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.estimation != null) {
      await this.buttonPopupCreateNewIssueEstimation().click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
    if (data.milestone != null) {
      await this.buttonPopupCreateNewIssueMilestone().click()
      await this.selectAssignee(this.page, data.milestone)
    }
    if (data.duedate != null) {
      await this.buttonPopupCreateNewIssueDuedate().click()
      let date = new Date()
      switch (data.duedate) {
        case 'yesterday':
          date.setDate(date.getDate() - 1)
          break
        case 'nextWeek':
          date.setDate(date.getDate() + 8)
          break
        case 'nextMonth':
          if (date.getMonth() === 11) {
            date = new Date(date.getFullYear() + 1, 0, date.getDate())
          } else {
            date = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate())
          }
          break
      }
      await this.fillDatePopup(
        date.getDate().toString(),
        (date.getMonth() + 1).toString(),
        date.getFullYear().toString()
      )
    }
    if (data.filePath != null) {
      await this.attachFileToNewIssueForm(data.filePath)
    }
    if (data.parentIssue != null) {
      await this.buttonPopupCreateNewIssueParent().click()
      await this.selectMenuItem(this.page, data.parentIssue, true)
    }
  }

  async searchIssueByName (issueName: string): Promise<void> {
    for (let i = 0; i < 5; i++) {
      await this.inputSearch().fill(issueName)
      const v = await this.inputSearch().inputValue()
      if (v === issueName) {
        await this.inputSearch().press('Enter')
        break
      }
    }
  }

  async openIssueByName (issueName: string): Promise<void> {
    await this.issupeByName(issueName).click()
  }

  async checkIssueNotExist (issueName: string): Promise<void> {
    await expect(this.issueNotExist(issueName)).toHaveCount(0)
  }

  async checkFilteredIssueExist (issueName: string): Promise<void> {
    await expect(this.filterRowExists(issueName)).toHaveCount(1)
  }

  async checkFilteredIssueNotExist (issueName: string): Promise<void> {
    await expect(this.filterRowExists(issueName)).toHaveCount(0)
  }

  async checkAllIssuesInStatus (statusId?: string, statusName?: string): Promise<void> {
    if (statusId === undefined) throw new Error(`Unknown status id ${statusId}`)

    for await (const locator of iterateLocator(this.issuesList())) {
      await expect(locator.locator('div[class*="square"] > div')).toHaveAttribute('id', `${statusId}:${statusName}`)
    }
  }

  async checkParentIssue (issueName: string, parentName: string): Promise<void> {
    await expect(this.parentIssueLocator(issueName)).toHaveText(parentName)
  }

  async doActionOnIssue (issueName: string, action: string): Promise<void> {
    await this.issupeByName(issueName).click({ button: 'right' })
    await this.selectFromDropdown(this.page, action)
  }

  async checkAllIssuesByPriority (priorityName: string): Promise<void> {
    await expect(async () => {
      for await (const locator of iterateLocator(this.issuesList())) {
        const href = await this.priorityContainer(locator).getAttribute('href')
        expect(href, { message: `Should contain ${priorityName} but it is ${href}` }).toContain(priorityName)
      }
    }).toPass({
      timeout: 15000
    })
  }

  async getIssueId (issueLabel: string, position: number = 0): Promise<string> {
    const id = await this.issueIdLocator(issueLabel).nth(position).textContent()
    return id?.trim() ?? ''
  }

  async openIssueById (issueId: string): Promise<void> {
    await this.issueAnchorById(issueId).click()
  }

  async checkIssuesCount (issueName: string, count: number): Promise<void> {
    await expect(this.issueAnchorByName(issueName)).toHaveCount(count)
  }

  async selectTemplate (templateName: string): Promise<void> {
    await this.buttonPopupCreateNewIssueTemplate().click()
    await this.selectMenuItem(this.page, templateName)
  }

  async attachFileToNewIssueForm (filePath: string): Promise<void> {
    await this.inputPopupCreateNewIssueFile().setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textPopupCreateNewIssueFile().filter({ hasText: filePath })).toBeVisible()
  }

  async checkAttachmentsCount (issueName: string, count: string): Promise<void> {
    await expect(this.attachmentContentButton(issueName)).toHaveText(count)
  }

  async addAttachmentToIssue (issueName: string, filePath: string): Promise<void> {
    await this.addAttachmentButton(issueName).click()
    await this.inputPopupAddAttachmentsFile().setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textPopupAddAttachmentsFile().filter({ hasText: filePath })).toBeVisible()
  }

  async deleteAttachmentToIssue (issueName: string, filePath: string): Promise<void> {
    await this.addAttachmentButton(issueName).click()
    await this.deleteAttachmentLink(filePath).hover()
    await this.deleteAttachmentLink(filePath).click()
    await expect(this.textPopupAddAttachmentsFile().filter({ hasText: filePath })).toBeVisible({ visible: false })
  }

  async checkCannotDeleteAttachmentToIssue (issueName: string, filePath: string): Promise<void> {
    await this.addAttachmentButton(issueName).click()
    await this.deleteAttachmentLink(filePath).hover()
    await expect(this.deleteAttachmentLink(filePath)).not.toBeVisible()
  }

  async checkAddAttachmentPopupContainsFile (issueName: string, filePath: string): Promise<void> {
    await this.addAttachmentButton(issueName).click()
    await expect(this.textPopupAddAttachmentsFile().filter({ hasText: filePath })).toBeVisible()
  }

  async checkCommentsCount (issueName: string, count: string): Promise<void> {
    await expect(this.commentCountLocator(issueName)).toHaveText(count)
  }

  async openCommentPopupForIssueByName (issueName: string): Promise<void> {
    await this.commentButton(issueName).click()
  }

  async openAllCategories (): Promise<void> {
    for await (const category of iterateLocator(this.buttonCollapsedCategories())) {
      await category.click()
    }
  }
}
