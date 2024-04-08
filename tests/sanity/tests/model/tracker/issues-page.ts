import { expect, type Locator, type Page } from '@playwright/test'
import path from 'path'
import { attachScreenshot, iterateLocator } from '../../utils'
import { CommonTrackerPage } from './common-tracker-page'
import { NewIssue } from './types'

export class IssuesPage extends CommonTrackerPage {
  readonly page: Page
  readonly modelSelectorAll: Locator
  readonly modelSelectorActive: Locator
  readonly modelSelectorBacklog: Locator
  readonly buttonCreateNewIssue: Locator
  readonly inputPopupCreateNewIssueTitle: Locator
  readonly inputPopupCreateNewIssueDescription: Locator
  readonly buttonPopupCreateNewIssueStatus: Locator
  readonly buttonPopupCreateNewIssuePriority: Locator
  readonly buttonPopupCreateNewIssueAssignee: Locator
  readonly buttonPopupCreateNewIssueLabels: Locator
  readonly buttonPopupCreateNewIssueComponent: Locator
  readonly buttonPopupCreateNewIssueEstimation: Locator
  readonly buttonPopupCreateNewIssueMilestone: Locator
  readonly buttonPopupCreateNewIssueDuedate: Locator
  readonly inputPopupCreateNewIssueFile: Locator
  readonly textPopupCreateNewIssueFile: Locator
  readonly buttonCreateIssue: Locator
  readonly inputSearch: Locator
  readonly linkSidebarAll: Locator
  readonly linkSidebarMyIssue: Locator
  readonly buttonClearFilers: Locator
  readonly issuesList: Locator
  readonly buttonPopupCreateNewIssueParent: Locator
  readonly buttonPopupCreateNewIssueTemplate: Locator
  readonly inputPopupAddAttachmentsFile: Locator
  readonly textPopupAddAttachmentsFile: Locator
  readonly buttonCollapsedCategories: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.modelSelectorAll = page.locator('div[data-id="tab-all"]')
    this.modelSelectorActive = page.locator('div[data-id="tab-active"]')
    this.modelSelectorBacklog = page.locator('div[data-id="tab-backlog"]')
    this.buttonCreateNewIssue = page.locator('button > div', { hasText: 'New issue' })
    this.inputPopupCreateNewIssueTitle = page.locator('form[id="tracker:string:NewIssue"] input[type="text"]')
    this.inputPopupCreateNewIssueDescription = page.locator('form[id="tracker:string:NewIssue"] div.tiptap')
    this.buttonPopupCreateNewIssueStatus = page.locator('form[id="tracker:string:NewIssue"] div#status-editor button')
    this.buttonPopupCreateNewIssuePriority = page.locator(
      'form[id="tracker:string:NewIssue"] div#priority-editor button'
    )
    this.buttonPopupCreateNewIssueAssignee = page.locator(
      'form[id="tracker:string:NewIssue"] div#assignee-editor button'
    )
    this.buttonPopupCreateNewIssueLabels = page.locator('form[id="tracker:string:NewIssue"] button span', {
      hasText: 'Labels'
    })
    this.buttonPopupCreateNewIssueComponent = page.locator(
      'form[id="tracker:string:NewIssue"] button span[title="No component"]'
    )
    this.buttonPopupCreateNewIssueEstimation = page.locator(
      'form[id="tracker:string:NewIssue"] div#estimation-editor button'
    )
    this.buttonPopupCreateNewIssueMilestone = page.locator(
      'form[id="tracker:string:NewIssue"] div#milestone-editor button'
    )
    this.buttonPopupCreateNewIssueDuedate = page.locator('form[id="tracker:string:NewIssue"] div#duedate-editor button')
    this.inputPopupCreateNewIssueFile = page.locator('form[id="tracker:string:NewIssue"] input[type="file"]')
    this.textPopupCreateNewIssueFile = page.locator('div[class*="attachments"] > div[class*="attachment"]')
    this.buttonCreateIssue = page.locator('button > span', { hasText: 'Create issue' })
    this.inputSearch = page.locator('input[placeholder="Search"]')
    this.linkSidebarAll = page.locator('a[href$="all-issues"]')
    this.linkSidebarMyIssue = page.locator('a[href$="my-issues"]')
    this.buttonClearFilers = page.locator('div.search-start > div:first-child button')
    this.issuesList = page.locator('div.listGrid')
    this.buttonPopupCreateNewIssueParent = page.locator('div#parentissue-editor button')
    this.buttonPopupCreateNewIssueTemplate = page.locator(
      'form[id="tracker:string:NewIssue"] div[class*="title"] > div > button'
    )
    this.inputPopupAddAttachmentsFile = page.locator('div.popup-tooltip input#file')
    this.textPopupAddAttachmentsFile = page.locator('div.popup-tooltip div.item div.name')
    this.buttonCollapsedCategories = page.locator('div.categoryHeader.collapsed')
  }

  async createNewIssue (data: NewIssue, closeNotification: boolean = false): Promise<void> {
    await this.buttonCreateNewIssue.click()
    await this.fillNewIssueForm(data)
    await this.buttonCreateIssue.click()
    if (closeNotification) {
      await this.closeNotification(this.page)
    }
    await attachScreenshot(`createdNewIssue-${data.title}.png`, this.page)
  }

  async fillNewIssueForm (data: NewIssue): Promise<void> {
    await this.inputPopupCreateNewIssueTitle.fill(data.title)
    await this.inputPopupCreateNewIssueDescription.fill(data.description)
    if (data.status != null) {
      await this.buttonPopupCreateNewIssueStatus.click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.priority != null) {
      await this.buttonPopupCreateNewIssuePriority.click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonPopupCreateNewIssueAssignee.click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      await this.buttonPopupCreateNewIssueLabels.click()
      if (data.createLabel) {
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from createNewIssue')
      } else {
        await this.checkFromDropdown(this.page, data.labels)
      }
      await this.inputPopupCreateNewIssueTitle.press('Escape')
      await this.inputPopupCreateNewIssueTitle.click({ force: true })
    }
    if (data.component != null) {
      await this.buttonPopupCreateNewIssueComponent.click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.estimation != null) {
      await this.buttonPopupCreateNewIssueEstimation.click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
    if (data.milestone != null) {
      await this.buttonPopupCreateNewIssueMilestone.click()
      await this.selectAssignee(this.page, data.milestone)
    }
    if (data.duedate != null) {
      await this.buttonPopupCreateNewIssueDuedate.click()
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
      await this.buttonPopupCreateNewIssueParent.click()
      await this.selectMenuItem(this.page, data.parentIssue, true)
    }
  }

  async searchIssueByName (issueName: string): Promise<void> {
    for (let i = 0; i < 5; i++) {
      await this.inputSearch.fill(issueName)
      const v = await this.inputSearch.inputValue()
      if (v === issueName) {
        await this.inputSearch.press('Enter')
        break
      }
    }
  }

  async openIssueByName (issueName: string): Promise<void> {
    await this.page.locator('a', { hasText: issueName }).click()
  }

  async checkIssueNotExist (issueName: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: issueName })).toHaveCount(0)
  }

  async checkFilteredIssueExist (issueName: string): Promise<void> {
    await expect(this.page.locator('div.row span', { hasText: issueName })).toHaveCount(1)
  }

  async checkFilteredIssueNotExist (issueName: string): Promise<void> {
    await expect(this.page.locator('div.row span', { hasText: issueName })).toHaveCount(0)
  }

  async checkAllIssuesInStatus (statusId?: string, statusName?: string): Promise<void> {
    if (statusId === undefined) throw new Error(`Unknown status id ${statusId}`)

    for await (const locator of iterateLocator(this.issuesList)) {
      await expect(locator.locator('div[class*="square"] > div')).toHaveAttribute('id', `${statusId}:${statusName}`)
    }
  }

  async checkParentIssue (issueName: string, parentName: string): Promise<void> {
    await expect(
      this.page
        .locator('a', { hasText: issueName })
        .locator('xpath=../..')
        .locator('div.root span.parent-label:first-child')
    ).toHaveText(parentName)
  }

  async doActionOnIssue (issueName: string, action: string): Promise<void> {
    await this.page.locator('a', { hasText: issueName }).click({ button: 'right' })
    await this.selectFromDropdown(this.page, action)
  }

  async checkAllIssuesByPriority (priorityName: string): Promise<void> {
    for await (const locator of iterateLocator(this.issuesList)) {
      const href = await locator.locator('div.priority-container use').getAttribute('href')
      expect(href).toContain(priorityName)
    }
  }

  async getIssueId (issueLabel: string, position: number = 0): Promise<string> {
    const id = await this.page.locator(`span[title="${issueLabel}"].overflow-label`).nth(position).textContent()
    return id?.trim() ?? ''
  }

  async openIssueById (issueId: string): Promise<void> {
    await this.page.locator(`div.listGrid div.flex-no-shrink a[href$="${issueId}"]`).click()
  }

  async checkIssuesCount (issueName: string, count: number): Promise<void> {
    await expect(this.page.locator('div.listGrid a', { hasText: issueName })).toHaveCount(count)
  }

  async selectTemplate (templateName: string): Promise<void> {
    await this.buttonPopupCreateNewIssueTemplate.click()
    await this.selectMenuItem(this.page, templateName)
  }

  async attachFileToNewIssueForm (filePath: string): Promise<void> {
    await this.inputPopupCreateNewIssueFile.setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textPopupCreateNewIssueFile.filter({ hasText: filePath })).toBeVisible()
  }

  async checkAttachmentsCount (issueName: string, count: string): Promise<void> {
    await expect(
      this.page
        .locator('div.row span', { hasText: issueName })
        .locator('xpath=..')
        .locator('a > button > div[slot="content"]')
    ).toHaveText(count)
  }

  async addAttachmentToIssue (issueName: string, filePath: string): Promise<void> {
    await this.page.locator('div.row span', { hasText: issueName }).locator('xpath=..').locator('a > button').click()
    await this.inputPopupAddAttachmentsFile.setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textPopupAddAttachmentsFile.filter({ hasText: filePath })).toBeVisible()
  }

  async deleteAttachmentToIssue (issueName: string, filePath: string): Promise<void> {
    await this.page.locator('div.row span', { hasText: issueName }).locator('xpath=..').locator('a > button').click()
    await this.page.locator(`div.popup-tooltip div.item div.name a[download="${filePath}"]`).hover()
    await this.page
      .locator(`div.popup-tooltip div.item div.name a[download="${filePath}"]`)
      .locator('xpath=../..')
      .locator('span.remove-link')
      .click()
    await expect(this.textPopupAddAttachmentsFile.filter({ hasText: filePath })).toBeVisible({ visible: false })
  }

  async checkCannotDeleteAttachmentToIssue (issueName: string, filePath: string): Promise<void> {
    await this.page.locator('div.row span', { hasText: issueName }).locator('xpath=..').locator('a > button').click()
    await this.page.locator(`div.popup-tooltip div.item div.name a[download="${filePath}"]`).hover()
    await expect(
      this.page
        .locator(`div.popup-tooltip div.item div.name a[download="${filePath}"]`)
        .locator('xpath=../..')
        .locator('span.remove-link')
    ).not.toBeVisible()
  }

  async checkAddAttachmentPopupContainsFile (issueName: string, filePath: string): Promise<void> {
    await this.page.locator('div.row span', { hasText: issueName }).locator('xpath=..').locator('a > button').click()
    await expect(this.textPopupAddAttachmentsFile.filter({ hasText: filePath })).toBeVisible()
  }

  async checkCommentsCount (issueName: string, count: string): Promise<void> {
    await expect(
      this.page
        .locator('div.row span', { hasText: issueName })
        .locator('xpath=..')
        .locator('button > div[slot="content"]')
        .first()
    ).toHaveText(count)
  }

  async openCommentPopupForIssueByName (issueName: string): Promise<void> {
    await this.page
      .locator('div.row span', { hasText: issueName })
      .locator('xpath=..')
      .locator('button')
      .first()
      .click()
  }

  async openAllCategories (): Promise<void> {
    for await (const category of iterateLocator(this.buttonCollapsedCategories)) {
      await category.click()
    }
  }
}
