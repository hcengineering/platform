import { expect, type Locator } from '@playwright/test'
import path from 'path'
import { createIssue, toTime } from '../../tracker/tracker.utils'
import { attachScreenshot, iterateLocator } from '../../utils'
import { CommonTrackerPage } from './common-tracker-page'
import { NewIssue } from './types'

const retryOptions = { intervals: [1000, 1500, 2500], timeout: 60000 }
export class IssuesPage extends CommonTrackerPage {
  modelSelectorAll = (): Locator => this.page.locator('label[data-id="tab-all"]')
  issues = (): Locator => this.page.locator('.antiPanel-navigator').locator('text="Issues"')
  subIssues = (): Locator => this.page.locator('button:has-text("Add sub-issue")')
  newIssue = (): Locator => this.page.locator('#new-issue')
  modelSelectorActive = (): Locator => this.page.locator('label[data-id="tab-active"]')
  modelSelectorBacklog = (): Locator => this.page.locator('label[data-id="tab-backlog"]')
  buttonCreateNewIssue = (): Locator => this.page.locator('button > div', { hasText: 'New issue' })
  inputPopupCreateNewIssueTitle = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] input[type="text"]')

  inputPopupCreateNewIssueDescription = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div.tiptap')

  buttonPopupCreateNewIssueProject = (): Locator => this.page.locator('[id="space\\.selector"]')
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
  inputSearchIcon = (): Locator => this.page.locator('.searchInput-wrapper')
  inputSearch = (): Locator => this.page.locator('input[placeholder="Search"]')
  linkSidebarAll = (): Locator => this.page.locator('a[href$="all-issues"]')
  linkSidebarMyIssue = (): Locator => this.page.locator('a[href$="my-issues"]')
  buttonClearFilers = (): Locator => this.page.getByRole('button', { name: 'Clear filters' })
  issuesList = (): Locator => this.page.locator('div.listGrid')
  buttonPopupCreateNewIssueParent = (): Locator => this.page.locator('div#parentissue-editor button')
  buttonPopupCreateNewIssueTemplate = (): Locator =>
    this.page.locator('form[id="tracker:string:NewIssue"] div[class*="title"] > div > button')

  inputPopupAddAttachmentsFile = (): Locator => this.page.locator('div.popup-tooltip input#file')
  textPopupAddAttachmentsFile = (): Locator => this.page.locator('div.popup-tooltip div.item div.name')
  buttonCollapsedCategories = (): Locator => this.page.locator('div.categoryHeader.collapsed')
  pupupTagsPopup = (): Locator => this.page.locator('.popup#TagsPopup')
  issueNotExist = (issueName: string): Locator => this.page.locator('tr', { hasText: issueName })
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

  inProgressHeader = (): Locator => this.page.locator('.categoryHeader :text-is("In Progress")').first()
  backlogHeader = (): Locator => this.page.locator('.categoryHeader :text-is("Backlog")').first()
  todoHeader = (): Locator => this.page.locator('.categoryHeader :text-is("Todo")').first()
  doneHeader = (): Locator => this.page.locator('.categoryHeader :text-is("Done")').first()
  canceledHeader = (): Locator => this.page.locator('.categoryHeader :text-is("Canceled")').first()

  inProgressHeaderKanban = (): Locator => this.page.locator('.header :text-is("In Progress")').first()
  backlogHeaderKanban = (): Locator => this.page.locator('.header :text-is("Backlog")').first()
  todoHeaderKanban = (): Locator => this.page.locator('.header :text-is("Todo")').first()
  doneHeaderKanban = (): Locator => this.page.locator('.header :text-is("Done")').first()
  canceledHeaderKanban = (): Locator => this.page.locator('.header :text-is("Canceled")').first()

  myIssuesButton = (): Locator => this.page.locator('.antiPanel-navigator').locator('text="My issues"')
  assignedTab = (): Locator => this.page.locator('[data-id="tab-assigned"]')
  createdTab = (): Locator => this.page.locator('[data-id="tab-created"]')
  subscribedTab = (): Locator => this.page.locator('[data-id="tab-subscribed"]')
  issueListPanel = (): Locator => this.page.locator('.hulyComponent')
  notTrackButton = (): Locator =>
    this.page
      .locator('span.labelOnPanel', { hasText: 'Collaborators' })
      .locator('xpath=following-sibling::div[1]')
      .locator('button')

  selectPopup = (): Locator => this.page.locator('.selectPopup >> button:has-text("Appleseed John")')

  closePopup = async (): Promise<void> => {
    await this.page.locator('.selectPopup').press('Escape')
  }

  notificationTimeoutSetting = (timeout: string): Promise<void> => {
    return this.page.evaluate((timeout) => {
      localStorage.setItem('#platform.notification.timeout', timeout)
    }, timeout)
  }

  viewIssueButton = (): Locator => this.page.locator('text="View issue"')
  reportedTimeEditor = (): Locator => this.page.locator('#ReportedTimeEditor')
  addReportButton = (): Locator => this.page.locator('#ReportsPopupAddButton')
  closeButton = (): Locator => this.page.locator('#card-close')

  totalFooter = (): Locator => this.page.locator('.antiCard-content >> .footer')
  reportsPopupButton = (): Locator => this.page.locator('#ReportsPopupAddButton')
  createButton = (): Locator => this.page.locator('button:has-text("Create")')
  spentTimeInput = (): Locator => this.page.locator('[placeholder="Spent time"]')

  timeSpentReports = (): Locator => this.page.getByText('Time spent reports', { exact: true })
  addTimeReport = (): Locator => this.page.locator('text="Add time report"')
  issueName = (name: string): Locator => this.page.locator(`text="${name}"`)
  issuesButton = (): Locator => this.page.locator('.antiPanel-navigator').locator('text="Issues"')
  viewButton = (): Locator => this.page.locator('button[data-id="btn-viewOptions"]')
  orderingButton = (): Locator => this.page.locator('.ordering button')
  modifiedDateMenuItem = (): Locator => this.page.locator('button.menu-item', { hasText: 'Modified date' })
  estimationContainer = (): Locator => this.page.locator('.estimation-container').first()
  addTimeReportButton = (): Locator => this.page.locator('button:has-text("Add time report")')
  timeReportCreationArea = (): Locator =>
    this.page.locator('[id="tracker\\:string\\:TimeSpendReportAdd"] >> text=Add time report')

  estimationSpan = (): Locator => this.page.locator('.estimation-container >> span').first()
  okButton = (): Locator => this.page.getByRole('button', { name: 'Ok', exact: true })
  newIssueButton = (): Locator => this.page.locator('#new-issue')
  issueNameInput = (): Locator => this.page.locator('#issue-name >> input')
  issueDescriptionInput = (): Locator => this.page.locator('#issue-description >> [contenteditable]')
  statusEditor = (): Locator => this.page.locator('#status-editor')
  todoButton = (): Locator => this.page.locator('button:has-text("Todo")')
  priorityEditor = (): Locator => this.page.locator('#priority-editor')
  urgentButton = (): Locator => this.page.locator('button:has-text("Urgent")')
  assigneeEditor = (): Locator => this.page.locator('#assignee-editor')
  appleseedJohnButton = (): Locator => this.page.locator('button.menu-item:has-text("Appleseed John")')
  estimationEditor = (): Locator => this.page.locator('#estimation-editor')
  dueDateButton = (): Locator => this.page.locator('button:has-text("Due date")')
  specificDay = (day: string): Locator =>
    this.page.locator(`.date-popup-container div.day:not(.wrongMonth) >> text=${day}`).first()

  inputTextPlaceholder = (): Locator => this.page.getByPlaceholder('Type text...')
  confirmInput = (): Locator => this.page.locator('.selectPopup button')

  async navigateToIssues (): Promise<void> {
    await this.page.click('text="Issues"')
    await this.page.keyboard.press('Escape')
  }

  async createAndOpenIssue (name: string, assignee: string, status: string, taskType?: string): Promise<void> {
    try {
      await this.notificationTimeoutSetting('5000')
      await createIssue(this.page, { name, assignee, status, taskType })
      await this.page.waitForSelector(`text="${name}"`)
      await this.viewIssueButton().click()
    } finally {
      await this.notificationTimeoutSetting('0')
    }
  }

  async reportTime (time: number): Promise<void> {
    await this.reportedTimeEditor().click()
    await this.page.waitForSelector('text="Time spent reports"')
    await this.addReportButton().click()
    await this.page.waitForSelector('text="Add time report"')
    await expect(this.createButton()).toBeDisabled()
    await this.spentTimeInput().fill(`${time}`)
    await expect(this.createButton()).toBeEnabled()
    await this.createButton().click()
    await this.okButton().click()
  }

  async verifyReportedTime (time: number): Promise<void> {
    // Assuming toTime is defined elsewhere
    await expect(this.page.locator('#ReportedTimeEditor')).toContainText(await toTime(time))
  }

  // ACTIONS

  async clickOnReportedTimeEditor (): Promise<void> {
    await this.reportedTimeEditor().click()
  }

  async clickButtonCreateNewIssue (): Promise<void> {
    await this.buttonCreateNewIssue().click()
  }

  async clickButtonCreateIssue (): Promise<void> {
    await this.buttonCreateIssue().click()
  }

  async clickOnIssues (): Promise<void> {
    await this.issues().click()
  }

  async clickOnSubIssues (): Promise<void> {
    await this.subIssues().click()
  }

  async clickOnNewIssue (): Promise<void> {
    await this.newIssue().click()
  }

  async navigateToMyIssues (): Promise<void> {
    await this.myIssuesButton().click()
  }

  async clickReportedTimeEditor (): Promise<void> {
    await this.reportedTimeEditor().click()
  }

  async waitForTimeSpentReports (): Promise<void> {
    await this.timeSpentReports().waitFor()
  }

  async clickAddReportButton (): Promise<void> {
    await this.addReportButton().click()
  }

  async waitForAddTimeReport (): Promise<void> {
    await this.addTimeReport().waitFor()
  }

  async fillSpentTime (time: number): Promise<void> {
    await this.spentTimeInput().fill(`${time}`)
  }

  async checkCreateButtonEnabled (): Promise<void> {
    await expect(this.createButton()).toBeEnabled()
  }

  async clickCreateButton (): Promise<void> {
    await this.createButton().click()
  }

  async clickCloseButton (): Promise<void> {
    await this.closeButton().click()
  }

  async clickIssuesIndex (index: number): Promise<void> {
    await this.issuesButton().nth(index).click()
  }

  async clickIssues (): Promise<void> {
    await this.issuesButton().click()
  }

  async clickView (): Promise<void> {
    await this.viewButton().click()
  }

  async clickOrdering (): Promise<void> {
    await this.orderingButton().click()
  }

  async selectModifiedDate (): Promise<void> {
    await this.modifiedDateMenuItem().click()
  }

  async clickEstimationContainer (): Promise<void> {
    await this.estimationContainer().click()
  }

  async waitForEstimation (): Promise<void> {
    await this.page.waitForSelector('text="Estimation"')
  }

  async clickAddTimeReport (): Promise<void> {
    await this.addTimeReportButton().click()
  }

  async waitForTimeReportAdd (): Promise<void> {
    await this.timeReportCreationArea().waitFor()
  }

  async expectCreateEnabled (): Promise<void> {
    await expect(this.createButton()).toBeEnabled()
  }

  async clickCreate (): Promise<void> {
    await this.createButton().click()
  }

  async clickOkButton (): Promise<void> {
    await this.okButton().click()
  }

  async checkEstimation (count: number): Promise<void> {
    // Assuming toTime is defined elsewhere
    await expect(this.estimationSpan()).toContainText(await toTime(count))
  }

  async clickNewIssue (): Promise<void> {
    await this.newIssueButton().click()
  }

  async clickAndFillIssueName (issueName: string): Promise<void> {
    await this.issueNameInput().click()
    await this.issueNameInput().fill(issueName)
  }

  async clickAndFillIssueDescription (issueDescription: string): Promise<void> {
    await this.issueDescriptionInput().click()
    await this.issueDescriptionInput().fill(issueDescription)
  }

  async selectStatus (): Promise<void> {
    await this.statusEditor().click()
    await this.todoButton().click()
  }

  async selectPriority (): Promise<void> {
    await this.priorityEditor().click()
    await this.urgentButton().click()
  }

  async clickAssignee (): Promise<void> {
    await this.assigneeEditor().click()
    await this.appleseedJohnButton().click()
  }

  async inputTextPlaceholderFill (text: string): Promise<void> {
    await this.inputTextPlaceholder().fill(text)
    await this.confirmInput().click()
  }

  async setEstimation (): Promise<void> {
    await this.estimationEditor().click()
  }

  async setDueDate (day: string): Promise<void> {
    await this.dueDateButton().click()
    await this.specificDay(day).click()
  }

  async pressEscapeTwice (): Promise<void> {
    await this.page.keyboard.press('Escape')
    await this.page.keyboard.press('Escape')
  }

  async checkIssuePresenceInTabs (issueName: string, presence: boolean): Promise<void> {
    const tabs = [this.assignedTab(), this.createdTab(), this.subscribedTab()]
    const checks = [false, true, true]

    for (let i = 0; i < tabs.length; i++) {
      await tabs[i].click()
      await this.page.waitForTimeout(3000)
      if (presence === checks[i]) {
        await expect(this.issueListPanel()).toContainText(issueName)
      } else {
        await expect(this.issueListPanel()).not.toContainText(issueName)
      }
    }
  }

  async stopTrackingIssue (issueName: string): Promise<void> {
    await this.notTrackButton().click()
    await this.selectPopup().click()
    await this.page.waitForTimeout(100)
    await this.page.keyboard.press('Escape')
    await this.page.keyboard.press('Escape')
    await expect(this.issueList()).not.toContainText(issueName)
  }

  // ACTIONS

  async clickLinkSidebarAll (): Promise<void> {
    await this.linkSidebarAll().click()
  }

  async clickModelSelectorAll (): Promise<void> {
    await this.modelSelectorAll().click()
  }

  async clickMdelSelectorBacklog (): Promise<void> {
    await this.modelSelectorBacklog().click()
  }

  async clickModalSelectorActive (): Promise<void> {
    await this.modelSelectorActive().click()
  }

  async clickLinkSidebarMyIssue (): Promise<void> {
    await this.linkSidebarMyIssue().click()
  }

  async createNewIssue (data: NewIssue, closeNotification: boolean = false): Promise<void> {
    await this.buttonCreateNewIssue().click()
    await this.fillNewIssueForm(data)
    await this.clickButtonCreateIssue()
    if (closeNotification) {
      await this.closeNotification()
    }
    await attachScreenshot(`createdNewIssue-${data.title}.png`, this.page)
  }

  async fillNewIssueForm (data: NewIssue): Promise<void> {
    await this.inputPopupCreateNewIssueTitle().fill(data.title)
    await this.inputPopupCreateNewIssueDescription().fill(data.description)
    if (data.projectName != null) {
      await this.buttonPopupCreateNewIssueProject().click()
      await this.selectMenuItem(this.page, data.projectName)
    }
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
    await expect(async () => {
      await this.inputSearchIcon().click()
      await this.inputSearch().fill(issueName)
      const v = await this.inputSearch().inputValue()
      if (v === issueName) {
        await this.inputSearch().press('Enter')
      }
    }).toPass(retryOptions)
  }

  async openIssueByName (issueName: string): Promise<void> {
    await this.issueByName(issueName).click()
  }

  async checkIssueNotExist (issueName: string): Promise<void> {
    await expect(this.issueNotExist(issueName)).toHaveCount(0)
  }

  async checkFilteredIssueExist (issueName: string): Promise<void> {
    await expect(this.linesFromList(issueName)).toHaveCount(1)
  }

  async checkFilteredIssueNotExist (issueName: string): Promise<void> {
    await expect(this.linesFromList(issueName)).toHaveCount(0)
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
    await this.issueByName(issueName).click({ button: 'right' })
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

  async checkIssuesCount (issueName: string, count: number, timeout?: number): Promise<void> {
    await expect(async () => {
      await expect(this.issueAnchorByName(issueName)).toHaveCount(count)
    }).toPass(retryOptions)
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
    await expect(async () => {
      await expect(this.attachmentContentButton(issueName)).toHaveText(count)
    }).toPass(retryOptions)
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

  async verifyCategoryHeadersVisibility (): Promise<void> {
    await expect(this.inProgressHeader()).toBeVisible()
    await expect(this.backlogHeader()).toBeVisible()
    await expect(this.todoHeader()).toBeVisible()
    await expect(this.doneHeader()).toBeVisible()
    await expect(this.canceledHeader()).toBeVisible()
  }

  async verifyCategoryHeadersVisibilityKanban (): Promise<void> {
    await expect(this.inProgressHeaderKanban()).toBeVisible()
    await expect(this.backlogHeaderKanban()).toBeVisible()
    await expect(this.todoHeaderKanban()).toBeVisible()
    await expect(this.doneHeaderKanban()).toBeVisible()
    await expect(this.canceledHeaderKanban()).toBeVisible()
  }

  async openAllCategories (): Promise<void> {
    for await (const category of iterateLocator(this.buttonCollapsedCategories())) {
      await category.click()
    }
  }

  async checkTotalFooter (expectedTotal: number): Promise<void> {
    await expect(this.totalFooter()).toContainText(`Total: ${expectedTotal}`)
  }

  async checkCreateButtonDisabled (): Promise<void> {
    await expect(this.createButton()).toBeDisabled()
  }
}
