import { expect, type Locator, type Page } from '@playwright/test'
import { DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../types'
import { DocumentCommonPage } from './document-common-page'
import { PlatformPassword } from '../../utils'
import { DocumentHistoryPage } from './document-history-page'

export class DocumentContentPage extends DocumentCommonPage {
  readonly page: Page
  readonly panel: Locator
  readonly buttonDocumentTitle: Locator
  readonly buttonMoreActions: Locator
  readonly textDocumentStatus: Locator
  readonly textType: Locator
  readonly textCategory: Locator
  readonly textVersion: Locator
  readonly textStatus: Locator
  readonly textAuthor: Locator
  readonly textCreator: Locator
  readonly buttonSelectNewAuthor: Locator
  readonly buttonSelectNewAuthorChange: Locator
  readonly buttonSendForReview: Locator
  readonly buttonSendForApproval: Locator
  readonly buttonAddMembers: Locator
  readonly buttonSelectMemberSubmit: Locator
  readonly textSelectReviewersPopup: Locator
  readonly textSelectApproversPopup: Locator
  readonly buttonCurrentRights: Locator
  readonly buttonAddMessageToText: Locator
  readonly buttonComments: Locator
  readonly textDocumentTitle: Locator
  readonly buttonCompleteReview: Locator
  readonly inputPassword: Locator
  readonly buttonSubmit: Locator
  readonly buttonSubmitSignature: Locator
  readonly buttonReject: Locator
  readonly inputRejectionReason: Locator
  readonly buttonApprove: Locator
  readonly buttonEditDocument: Locator
  readonly buttonDraftNewVersion: Locator
  readonly buttonDocumentInformation: Locator
  readonly buttonDocument: Locator
  readonly buttonDocumentApprovals: Locator
  readonly textPageHeader: Locator
  readonly buttonSelectNewAuthorChangeByQaraManager: Locator
  readonly textId: Locator
  readonly contentLocator: Locator
  readonly addSpaceButton: Locator
  readonly inputSpaceName: Locator
  readonly roleSelector: Locator
  readonly selectRoleMemberAJ: Locator
  readonly selectRoleMemberDK: Locator
  readonly createButton: Locator
  readonly createNewDocument: Locator
  readonly selectCustom: Locator
  readonly nextStepButton: Locator
  readonly customSpecificReason: Locator
  readonly newDocumentTitle: Locator
  readonly createDraft: Locator
  readonly draftNewVersion: Locator
  readonly buttonHistoryTab: Locator
  readonly documentHeader: Locator
  readonly leaveFolder: Locator
  readonly textContainer: Locator
  readonly myDocument: Locator
  readonly library: Locator
  readonly templates: Locator
  readonly categories: Locator
  readonly addCategoryButton: Locator
  readonly categoryTitle: Locator
  readonly description: Locator
  readonly categoryCode: Locator
  readonly generalDocumentation: Locator
  readonly newDocumentArrow: Locator
  readonly newTemplate: Locator
  readonly filter: Locator
  readonly filterCategory: Locator
  readonly qualityButtonDots: Locator
  readonly editDocumentSpace: Locator
  readonly qualityButtonMembers: Locator
  readonly userMemberCainVelasquez: Locator
  readonly qualityDocument: Locator
  readonly saveButton: Locator
  readonly addMember: Locator
  readonly addMemberDropdown: Locator
  readonly changeSpaceButton: Locator
  readonly createNewTemplateFromSpace: Locator
  readonly okButton: Locator
  readonly documentThreeDots: Locator
  readonly buttonSubmitReview: Locator
  readonly completeReviewButton: Locator
  readonly approveButton: Locator
  readonly documentsSpace: Locator
  readonly contacts: Locator
  readonly createTeamspace: Locator
  readonly employee: Locator
  readonly employeeDropdown: Locator
  readonly kickEmployee: Locator
  readonly confirmKickEmployee: Locator
  readonly openTeam: Locator
  readonly privateToggle: Locator
  readonly inputTeamspaceName: Locator
  readonly teamspaceArrow: Locator
  readonly infoModal: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.panel = page.locator('.popupPanel-body')
    this.buttonDocumentTitle = page.locator('button.version-item span.name')
    this.buttonMoreActions = page.locator('.hulyHeader-buttonsGroup > .no-print > .antiButton').first()
    this.textDocumentStatus = page.locator('button.version-item div.root span.label')
    this.textType = page.locator('div.flex:has(div.label:text("Template name")) div.field')
    this.textCategory = page.locator('div.flex:has(div.label:text("Category")) div.field')
    this.textVersion = page.locator('div.flex:has(div.label:text("Version")) div.field')
    this.textStatus = page.locator('div.flex:has(div.label:text("Status")) div.field')
    this.textAuthor = page.locator('div.flex:has(div.label:text("Author")) div.field')
    this.textCreator = page.locator('div.flex:has(div.label:text("Creator")) div.field')
    this.buttonSelectNewAuthor = page.locator('div.popup button.small')
    this.buttonSelectNewAuthorChange = page.locator('div.popup button.dangerous')
    this.buttonSendForReview = page.locator('div.hulyHeader-buttonsGroup.extra button[type="button"] > span', {
      hasText: 'Send for review'
    })
    this.buttonSendForApproval = page.locator('div.hulyHeader-buttonsGroup.extra button[type="button"] > span', {
      hasText: 'Send for approval'
    })
    this.buttonAddMembers = page.locator('div.popup div.addButton')
    this.buttonSelectMemberSubmit = page.locator('div.popup div.footer button[type="submit"]')
    this.textSelectReviewersPopup = page.locator('div.popup span.label', { hasText: 'Select reviewers' })
    this.textSelectApproversPopup = page.locator('div.popup span.label', { hasText: 'Select approvers' })
    this.buttonCurrentRights = page.locator(
      'div.hulyHeader-buttonsGroup.extra button[type="button"] > span[slot="content"]'
    )
    this.buttonAddMessageToText = page.locator('div.text-editor-toolbar > button:last-child')
    this.buttonComments = page.locator('button[id$="comment"]')
    this.textDocumentTitle = page.locator('div.panel div.title')
    this.buttonCompleteReview = page.locator('div.hulyHeader-buttonsGroup.extra button[type="button"] > span', {
      hasText: 'Complete review'
    })
    this.inputPassword = page.locator('input[name="documents:string:Password"]')
    this.buttonSubmit = page.locator('div.popup button[type="submit"]')
    this.buttonSubmitSignature = page.locator('.signature-dialog button[type="submit"]')
    this.buttonReject = page.locator('button[type="button"] > span', { hasText: 'Reject' })
    this.inputRejectionReason = page.locator('div.popup div[id="rejection-reason"] input')
    this.buttonApprove = page.locator('button[type="button"] > span', { hasText: 'Approve' })
    this.buttonDocument = page.locator('button[id$="info"]')
    this.buttonEditDocument = page.locator('div.hulyHeader-buttonsGroup.extra button[type="button"] > span', {
      hasText: 'Edit document'
    })
    this.buttonDraftNewVersion = page.locator('div.hulyHeader-buttonsGroup.extra button[type="button"] > span', {
      hasText: 'Draft new version'
    })
    this.buttonDocumentInformation = page.locator('button[id$="info"]')
    this.buttonDocumentApprovals = page.locator('button[id$="approvals"]')
    this.textPageHeader = page.locator('div.hulyNavPanel-header')
    this.buttonSelectNewAuthorChangeByQaraManager = page.locator('div.popup button[type="submit"]')
    this.textId = page.locator('div.flex:has(div.label:text("ID")) div.field')
    this.contentLocator = page.locator('div.textInput div.tiptap')
    this.addSpaceButton = page.locator('#tree-orgspaces')
    this.inputSpaceName = page.getByPlaceholder('New documents space')
    this.roleSelector = page.getByRole('button', { name: 'Members' })
    this.selectRoleMemberAJ = page.getByRole('button', { name: 'AJ Appleseed John' })
    this.selectRoleMemberDK = page.getByRole('button', { name: 'DK Dirak Kainin' })
    this.createButton = page.getByRole('button', { name: 'Create', exact: true })
    this.createNewDocument = page.getByRole('button', { name: 'Create new document' })
    this.selectCustom = page.getByText('Custom')
    this.customSpecificReason = page.getByPlaceholder('Specify the reason...')
    this.nextStepButton = page.getByRole('button', { name: 'Next step' })
    this.newDocumentTitle = page.getByPlaceholder('New document')
    this.createDraft = page.getByRole('button', { name: 'Create Draft' })
    this.draftNewVersion = page.getByRole('button', { name: 'Draft new version' })
    this.buttonHistoryTab = page.getByText('History')
    this.documentHeader = page.getByRole('button', { name: 'Complete document' })
    this.leaveFolder = page.getByRole('button', { name: 'Leave' })
    this.textContainer = page.locator('.tiptap')
    this.myDocument = page.getByRole('button', { name: 'Categories' })
    this.library = page.getByRole('button', { name: 'Library' })
    this.templates = page.getByRole('button', { name: 'Templates' })
    this.categories = page.getByRole('button', { name: 'Categories' })
    this.addCategoryButton = page.getByRole('button', { name: 'Category', exact: true })
    this.categoryTitle = page.getByPlaceholder('Title')
    this.description = page.getByRole('paragraph')
    this.categoryCode = page.getByPlaceholder('Code')
    this.generalDocumentation = page.getByRole('button', { name: 'General documentation' })
    this.newDocumentArrow = page.locator('.w-full > button:nth-child(2)')
    this.newTemplate = page.getByRole('button', { name: 'New template', exact: true })
    this.filter = page.getByRole('button', { name: 'Filter' })
    this.filterCategory = page.locator('span').filter({ hasText: /^Category$/ })
    this.qualityButtonDots = page.getByRole('button', { name: 'Quality documents' }).getByRole('button')
    this.editDocumentSpace = page.getByRole('button', { name: 'Edit documents space' })
    this.qualityButtonMembers = page.getByRole('button', { name: 'AJ DK AQ 3 members' }).first()
    this.userMemberCainVelasquez = page.getByRole('button', { name: 'VC Velasquez Cain' })
    this.qualityDocument = page.getByRole('button', { name: 'Quality documents' })
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true })
    this.addMember = page.getByText('Add member')
    this.addMemberDropdown = page.locator('.selectPopup')
    this.changeSpaceButton = page.locator('[id="space\\.selector"]')
    this.createNewTemplateFromSpace = page.getByRole('button', { name: 'Create new template' })
    this.okButton = page.getByRole('button', { name: 'Ok', exact: true })
    this.documentThreeDots = page.locator("div[class='no-print ml-1'] button[type='button']")
    this.buttonSubmitReview = page.getByRole('button', { name: 'Submit' })
    this.completeReviewButton = page.getByRole('button', { name: 'Complete review' })
    this.approveButton = page.getByRole('button', { name: 'Approve' })
    this.documentsSpace = page.locator('[id="app-document\\:string\\:DocumentApplication"]')
    this.contacts = page.locator('[id="app-contact\\:string\\:Contacts"]')
    this.createTeamspace = page.getByRole('button', { name: 'Create teamspace' })
    this.employee = page.getByRole('button', { name: 'Employee' })
    this.employeeDropdown = page.locator('div:nth-child(4) > button').first()
    this.kickEmployee = page.getByRole('button', { name: 'Kick employee' })
    this.confirmKickEmployee = page.getByRole('button', { name: 'Ok' })
    this.openTeam = page.getByText('Team', { exact: true })
    this.privateToggle = page.locator('#teamspace-private span')
    this.inputTeamspaceName = page.getByPlaceholder('New teamspace')
    this.teamspaceArrow = page.locator('.w-full > button:nth-child(2)')
    this.infoModal = page.locator('#btnGID-info')
  }

  async checkDocumentTitle (title: string): Promise<void> {
    await expect(this.buttonDocumentTitle).toContainText(title)
  }

  async clickDocumentsSpace (): Promise<void> {
    await this.documentsSpace.click()
  }

  async clickCreateTeamspace (): Promise<void> {
    await this.createTeamspace.click()
  }

  async clickContacts (): Promise<void> {
    await this.contacts.click()
  }

  async clickEmployee (): Promise<void> {
    await this.employee.click()
  }

  async selectEmployee (employee: string): Promise<void> {
    await this.page.getByRole('link', { name: employee }).click()
  }

  async clickEmployeeDropdown (): Promise<void> {
    await this.employeeDropdown.click()
  }

  async clickKickEmployee (): Promise<void> {
    await this.kickEmployee.click()
  }

  async clickConfirmKickEmployee (): Promise<void> {
    await this.confirmKickEmployee.click()
  }

  async checkIfEmployeeIsKicked (employee: string): Promise<void> {
    await this.page.getByRole('link', { name: 'Employee' }).getByRole('button').first().click()
    await expect(this.page.getByText(employee + ' Inactive')).toBeVisible()
  }

  async checkIfUserCanKick (): Promise<void> {
    await expect(this.kickEmployee).not.toBeVisible()
  }

  async clickOpenTeam (): Promise<void> {
    await this.openTeam.click()
  }

  async checkIfReviewersAndApproversAreVisible (): Promise<void> {
    await expect(this.panel.getByText('Appleseed John').first()).toBeVisible()
    await expect(this.panel.getByText('Dirak Kainin')).toBeVisible()
    await expect(this.panel.getByText('Appleseed John').nth(1)).toBeVisible()
  }

  async checkTheUserCantChangeReviewersAndApprovers (): Promise<void> {
    await this.panel.getByText('Appleseed John').first().click()
    await expect(this.panel.getByText('Dirak Kainin').nth(1)).not.toBeVisible()
    await this.panel.getByText('Dirak Kainin').click()
    await expect(this.panel.getByText('Dirak Kainin').nth(1)).not.toBeVisible()
  }

  async clickDocumentHeader (name: string): Promise<void> {
    await this.page.getByRole('button', { name }).click()
  }

  async clickOnAddCategoryButton (): Promise<void> {
    await this.addCategoryButton.click()
  }

  async clickNewDocumentArrow (): Promise<void> {
    await this.newDocumentArrow.click()
  }

  async clickNewTemplate (): Promise<void> {
    await this.newTemplate.click()
  }

  async clickDocumentThreeDots (): Promise<void> {
    await this.documentThreeDots.click()
  }

  async selectControlDocumentSubcategory (
    buttonName: 'My Document' | 'Library' | 'Templates' | 'Categories' | 'General documentation'
  ): Promise<void> {
    switch (buttonName) {
      case 'My Document':
        await this.myDocument.click()
        break
      case 'Library':
        await this.library.click()
        break
      case 'Templates':
        await this.templates.click()
        break
      case 'Categories':
        await this.categories.click()
        break
      case 'General documentation':
        await this.generalDocumentation.click()
        break
      default:
        throw new Error('Unknown button')
    }
  }

  async addMemberToQualityDocument (): Promise<void> {
    await this.qualityDocument.hover()
    await this.qualityButtonDots.click()
    await this.editDocumentSpace.click()
    await this.qualityButtonMembers.click()
    await this.userMemberCainVelasquez.click()
    await this.page.keyboard.press('Escape')
    await this.saveButton.click()
  }

  async clickAddMember (): Promise<void> {
    await this.addMember.click()
  }

  async checkIfMemberDropdownHasMember (member: string, contains: boolean): Promise<void> {
    if (contains) {
      await expect(this.addMemberDropdown).toContainText(member)
    } else {
      await expect(this.addMemberDropdown).not.toContainText(member)
    }
  }

  async fillCategoryForm (categoryTitle: string, description: string, categoryCode: string): Promise<void> {
    await this.categoryTitle.fill(categoryTitle)
    await this.description.fill(description)
    await this.categoryCode.fill(categoryCode)
    await this.createButton.click()
  }

  async clickApproveButtonAndFillPassword (): Promise<void> {
    await this.approveButton.click()
    await this.inputPassword.fill(PlatformPassword)
    await this.buttonSubmit.click()
  }

  async clickApproveButton (): Promise<void> {
    await this.approveButton.click()
  }

  async expectCategoryCreated (categoryTitle: string, categoryCode: string): Promise<void> {
    await expect(this.page.getByText(categoryTitle)).toBeVisible()
    await expect(this.page.getByRole('link', { name: categoryCode })).toBeVisible()
  }

  async checkIfTextExists (text: string): Promise<void> {
    await expect(this.textContainer).toContainText(text)
  }

  async hoverOverGeneralDocumentation (): Promise<void> {
    await this.generalDocumentation.hover()
  }

  async addReasonAndImpactToTheDocument (description: string, reason: string): Promise<void> {
    await this.page.getByText('Reason & Impact').click()
    await this.page.getByPlaceholder('Describe what was changed...').fill(description)
    await this.page.getByPlaceholder('Describe why it was changed...').click()
    await this.page.getByPlaceholder('Describe why it was changed...').fill(reason)
  }

  async selectRelease (version: string): Promise<void> {
    await this.page.getByText('Release', { exact: true }).click()
    if (version === 'Major') {
      await this.page.getByText('Major').click()
    }
    if (version === 'Minor') {
      await this.page.getByText('Minor').click()
    }
  }

  async addReviewersFromTeam (anotherReviewer: boolean = false): Promise<void> {
    await this.page.waitForTimeout(500)
    await this.page.getByText('Team').click()
    await this.page.getByText('Add member').nth(1).click()
    if (anotherReviewer) {
      await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).click()
    }
    await this.selectRoleMemberAJ.click()
    await this.page.keyboard.press('Escape')
  }

  async addApproversFromTeam (): Promise<void> {
    await this.page.waitForTimeout(500)
    await this.page.getByText('Add member').nth(2).click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).click()
    await this.page.keyboard.press('Escape')
  }

  async sendForReview (): Promise<void> {
    await this.buttonSendForReview.click()
    await this.buttonSubmitReview.click()
  }

  async addContent (content: string, append: boolean = false, newParagraph: boolean = false): Promise<void> {
    if (newParagraph) {
      await this.contentLocator.press('Enter')
    }

    if (append) {
      await this.contentLocator.pressSequentially(content)
    } else {
      await this.contentLocator.fill(content)
    }
  }

  async replaceContent (content: string): Promise<void> {
    await this.contentLocator.clear({ force: true })
    await this.contentLocator.fill(content)
  }

  async checkContent (content: string): Promise<void> {
    await expect(this.contentLocator).toHaveText(content)
  }

  async changeSpaceInCreateDocumentForm (space: string): Promise<void> {
    await this.changeSpaceButton.click()
    await this.page.getByRole('button', { name: space, exact: true }).nth(1).click()
  }

  async executeMoreActions (action: string): Promise<void> {
    await this.buttonMoreActions.click()
    await this.selectFromDropdown(this.page, action)
    if (action === 'Delete') {
      await this.okButton.click()
    }
  }

  async checkIfFolderExists (folderName: string): Promise<void> {
    await expect(this.page.getByRole('button', { name: folderName })).toBeVisible()
  }

  async clickAddFolderButton (): Promise<void> {
    await this.addSpaceButton.click()
  }

  async chooseFilter (category: string): Promise<void> {
    await this.filter.click()
    await this.filterCategory.hover()
    await this.page.getByRole('button', { name: 'Category', exact: true }).click()
    await this.page.getByText(category).click({ force: true })
    await this.page.keyboard.press('Escape')
  }

  async checkIfFilterIsApplied (code: string): Promise<void> {
    await expect(this.page.getByText(code, { exact: true })).toBeVisible()
  }

  async checkIfCategoryExists (category: string): Promise<void> {
    await expect(this.page.getByText(category)).toBeVisible()
  }

  async fillDocumentSpaceForm (spaceName: string): Promise<void> {
    await this.inputSpaceName.fill(spaceName)
    await this.roleSelector.nth(2).click()
    await this.selectRoleMemberAJ.nth(2).click()
    await this.page.keyboard.press('Escape')
    await this.selectRoleMemberAJ.nth(1).click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.createButton.click()
  }

  async fillDocumentAndSetMember (spaceName: string): Promise<void> {
    await this.inputSpaceName.fill(spaceName)
    await this.page.getByRole('button', { name: 'AJ Appleseed John' }).first().click()
    await this.page.getByRole('button', { name: 'AQ Admin Qara' }).click()
    await this.page.getByRole('button', { name: 'AJ Appleseed John' }).nth(1).click()
    await this.page.keyboard.press('Escape')
    await expect(this.page.locator('.selectPopup')).not.toBeAttached()
    await this.page.getByRole('button', { name: 'Create' }).click({ timeout: 3000 })
  }

  async checkIfUserCanCreateDocument (spaceName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'New document', exact: true }).click()
    await this.page.locator('[id="space\\.selector"]').click()
    await expect(this.page.locator('.selectPopup').getByRole('button', { name: spaceName })).not.toBeVisible()
  }

  async fillDocumentAndSetMemberPrivate (spaceName: string): Promise<void> {
    await this.inputTeamspaceName.fill(spaceName)
    await this.privateToggle.click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).nth(1).click()
    await this.page.getByRole('button', { name: 'AJ Appleseed John' }).click()
    await this.page.keyboard.press('Escape')
    await this.page.getByRole('button', { name: 'Create', exact: true }).click()
  }

  async clickTeamspaceArrow (): Promise<void> {
    await this.teamspaceArrow.click()
  }

  async clickOnTeamspaceOrArrow (): Promise<void> {
    const teamspaceOrArrow = await this.page.isVisible('.w-full > button:nth-child(2)')
    if (teamspaceOrArrow) {
      await this.clickTeamspaceArrow()
      await this.createTeamspace.click()
    } else {
      await this.createTeamspace.click()
    }
  }

  async fillQuaraManager (spaceName: string): Promise<void> {
    await this.inputSpaceName.fill(spaceName)
    await this.roleSelector.nth(2).click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).nth(2).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.createButton.click()
  }

  async fillDocumentSpaceFormManager (spaceName: string): Promise<void> {
    await this.inputSpaceName.fill(spaceName)
    await this.roleSelector.nth(1).click()
    await this.selectRoleMemberDK.nth(2).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.createButton.click()
  }

  async fillTeamspaceFormManager (spaceName: string): Promise<void> {
    await this.page.getByPlaceholder('New teamspace').fill(spaceName)
    // await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).first().click()
    // await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).nth(2).click()
    // await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.createButton.click()
  }

  async changeTeamspaceMembers (spaceName: string): Promise<void> {
    await this.page.getByRole('button', { name: spaceName }).hover()
    await this.page.getByRole('button', { name: spaceName }).getByRole('button').nth(1).click()
    await this.page.getByRole('button', { name: 'Edit teamspace' }).click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).first().click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).nth(2).click()
    await this.page.getByRole('button', { name: 'AJ Appleseed John' }).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.page.getByRole('button', { name: 'AJ DK 2 members' }).click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.page.getByRole('button', { name: 'Save' }).click()
  }

  async changeDocumentSpaceMembers (spaceName: string): Promise<void> {
    await this.page.getByRole('button', { name: spaceName }).hover()
    await this.page.getByRole('button', { name: spaceName }).getByRole('button').click()
    await this.editDocumentSpace.click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).first().click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).nth(3).click()
    await this.page.getByRole('button', { name: 'AJ Appleseed John' }).click()
    await this.page.keyboard.press('Escape')
    await this.page.getByRole('button', { name: 'AJ DK 2 members' }).click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).nth(1).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.saveButton.click()
  }

  async createDocumentSpaceMembersToJustMember (spaceName: string): Promise<void> {
    await this.inputSpaceName.fill(spaceName)
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).first().click()
    await this.page.getByRole('button', { name: 'AJ Appleseed John' }).click()
    await this.page.getByRole('button', { name: 'DK Dirak Kainin' }).nth(1).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.createButton.click()
  }

  async addThirdUserToMembers (spaceName: string): Promise<void> {
    await this.page.getByRole('button', { name: spaceName }).hover()
    await this.page.getByRole('button', { name: spaceName }).getByRole('button').click()
    await this.editDocumentSpace.click()
    await this.page.getByRole('button', { name: 'AJ DK 2 members' }).click()
    await this.page.getByRole('button', { name: 'VC Velasquez Cain' }).click()
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(1000)
    await this.saveButton.click()
  }

  async checkIfTheSpaceIsVisible (spaceName: string, visible: boolean): Promise<void> {
    if (visible) {
      await expect(this.page.getByRole('button', { name: spaceName })).toBeVisible()
    } else {
      await expect(this.page.getByRole('button', { name: spaceName })).not.toBeVisible()
    }
  }

  async checkIfEditSpaceButtonExists (spaceName: string, visible: boolean): Promise<void> {
    await this.page.getByRole('button', { name: spaceName }).hover()
    await this.page.getByRole('button', { name: spaceName }).getByRole('button').click()
    if (visible) {
      await expect(this.editDocumentSpace).toBeVisible()
      await expect(this.qualityButtonMembers).toBeVisible()
      await expect(this.createNewTemplateFromSpace).toBeVisible()
    } else {
      await expect(this.createNewDocument).not.toBeVisible()
      await expect(this.editDocumentSpace).not.toBeVisible()
      await expect(this.createNewTemplateFromSpace).not.toBeVisible()
    }
    await this.page.keyboard.press('Escape')
  }

  async checkSpaceFormIsCreated (spaceName: string): Promise<void> {
    await expect(this.page.getByRole('button', { name: spaceName })).toBeVisible()
  }

  async createNewDocumentInsideFolder (folderName: string): Promise<void> {
    await this.page.getByRole('button', { name: folderName }).hover()
    await this.page.getByRole('button', { name: folderName }).getByRole('button').click()
    await this.createNewDocument.click()
  }

  async clickLeaveFolder (folderName: string): Promise<void> {
    await this.page.getByRole('button', { name: folderName }).hover()
    await this.page.getByRole('button', { name: folderName }).getByRole('button').click()
    await this.leaveFolder.click()
  }

  async createNewDocumentFromFolder (
    title: string,
    custom: boolean = false,
    specificReason: string = ''
  ): Promise<void> {
    await this.page.locator('.antiRadio > .marker').first().click()
    await this.nextStepButton.click()
    await this.newDocumentTitle.fill(title)
    if (custom) {
      await this.selectCustom.click()
      await this.customSpecificReason.fill(specificReason)
    }
    await this.nextStepButton.click()
    await this.createDraft.click()
  }

  async clickSendForApproval (): Promise<void> {
    await this.buttonSendForApproval.click()
  }

  async clickDraftNewVersion (): Promise<void> {
    await this.buttonDraftNewVersion.click()
  }

  async clickHistoryTab (): Promise<void> {
    await this.buttonHistoryTab.first().click()
  }

  async createNewDraft (): Promise<void> {
    await this.buttonEditDocument.click()
    // It's important to wait for the draft status to make sure the content
    // is editable for the next steps
    await this.checkDocumentStatus(DocumentStatus.DRAFT)
  }

  async checkTeamMembersReviewerCoauthorApproverNotExists (): Promise<void> {
    await this.page.waitForTimeout(500)
    await this.page.getByText('Team').click()
    await this.page.getByText('Add member').first().click()
    await expect(this.page.getByRole('button', { name: 'AJ Appleseed John' })).not.toBeVisible()
    await this.page.keyboard.press('Escape')
    await this.page.getByText('Add member').nth(1).click()
    await expect(this.page.getByRole('button', { name: 'AJ Appleseed John' })).not.toBeVisible()
    await this.page.keyboard.press('Escape')
    await this.page.getByText('Add member').nth(2).click()
    await expect(this.page.getByRole('button', { name: 'AJ Appleseed John' })).not.toBeVisible()
  }

  async checkIfHistoryVersionExists (description: string): Promise<void> {
    await this.page.waitForTimeout(200)
    await expect(this.page.getByText(description)).toBeVisible()
    await expect(this.page.getByText('v1.0', { exact: true })).toBeVisible()
  }

  async checkDocumentStatus (status: DocumentStatus): Promise<void> {
    await expect(this.textDocumentStatus).toHaveText(status)
  }

  async checkIfLeftModalIsOpen (): Promise<void> {
    const teamspaceOrArrow = await this.page.isHidden('div.flex:has(div.label:text("Template name")) div.field')
    if (teamspaceOrArrow) {
      await this.infoModal.click()
    }
  }

  async checkDocument (data: DocumentDetails): Promise<void> {
    if (data.type != null && data.type !== 'N/A') {
      await expect(this.textType).toHaveText(data.type)
    }
    if (data.category != null) {
      await expect(this.textCategory).toContainText(data.category)
    }
    if (data.version != null) {
      await expect(this.textVersion).toHaveText(data.version)
    }
    if (data.status != null) {
      await expect(this.textStatus).toHaveText(data.status)
    }
    if (data.owner != null) {
      await expect(this.textAuthor).toHaveText(data.owner)
    }
    if (data.author != null) {
      await expect(this.textCreator).toHaveText(data.author)
    }
    if (data.id != null) {
      await expect(this.textId).toHaveText(data.id)
    }
  }

  async fillChangeDocumentAuthorPopup (newAuthor: string): Promise<void> {
    await this.buttonSelectNewAuthor.click()
    await this.selectListItemWithSearch(this.page, newAuthor)
    await this.buttonSelectNewAuthorChange.click()
  }

  async fillSelectReviewersForm (reviewers: Array<string>): Promise<void> {
    await this.buttonAddMembers.click()
    for (const reviewer of reviewers) {
      await this.selectListItemWithSearch(this.page, reviewer)
    }
    await this.textSelectReviewersPopup.click({ force: true })
    await this.buttonSelectMemberSubmit.click()
    await this.confirmSubmission()
  }

  async fillSelectApproversForm (approvers: Array<string>, skipConfirm: boolean = false): Promise<void> {
    await this.buttonAddMembers.click()
    for (const approver of approvers) {
      await this.selectListItemWithSearch(this.page, approver)
    }
    await this.textSelectApproversPopup.click({ force: true })
    await this.buttonSelectMemberSubmit.click()
    if (!skipConfirm) await this.confirmSubmission()
  }

  async checkCurrentRights (right: DocumentRights): Promise<void> {
    await expect(this.buttonCurrentRights).toHaveText(right)
  }

  async addMessageToTheText (text: string, message: string, closePopup: boolean = true): Promise<void> {
    await this.page.getByText(text).click()
    await this.page.getByText(text).dblclick()

    // NOTE: without the resize the menu popup might be placed in a wrong place initially
    // and only update its position on the button click (MouseDown) which leads
    // to the MouseUp land not on the button and the click handler is not triggered
    // Resize event ensures that the menu popup is placed correctly before clicking
    await this.page.evaluate(() => {
      window.dispatchEvent(new Event('resize'))
    })
    await this.buttonAddMessageToText.click()
    await this.addMessage(message)

    if (closePopup) {
      await this.closeNewMessagePopup()
    }
  }

  async sendForApproval (
    releaseType: string,
    version: string,
    reason: string,
    impact: string,
    prevVersion: string,
    newVersion: string,
    userPage: Page,
    completeDocument: NewDocument,
    documentDetails: DocumentDetails
  ): Promise<void> {
    const documentContentPageSecond = new DocumentContentPage(userPage)

    await this.clickDraftNewVersion()
    await this.selectRelease(releaseType)
    await this.addReasonAndImpactToTheDocument(reason, impact)
    await this.buttonSendForApproval.click()
    await this.buttonSelectMemberSubmit.click()
    await this.confirmSubmission()
    await this.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
    await this.checkDocument({
      ...documentDetails,
      status: DocumentStatus.IN_APPROVAL,
      version
    })
    await this.checkCurrentRights(DocumentRights.VIEWING)
    await documentContentPageSecond.clickDocumentHeader(completeDocument.title + ' ' + prevVersion)
    await documentContentPageSecond.clickDocumentHeader(completeDocument.title + ' ' + newVersion)
    await documentContentPageSecond.confirmApproval()
    await this.buttonHistoryTab.first().click()
    const documentHistoryPage = new DocumentHistoryPage(this.page)
    await documentHistoryPage.checkHistoryEventExist('New document creation')
    await documentHistoryPage.checkHistoryEventExist(reason)
  }

  async clickPreviousVersionHeader (userPage: Page, completeDocument: NewDocument, prevVersion: string): Promise<void> {
    const documentContentPageSecond = new DocumentContentPage(userPage)
    await documentContentPageSecond.clickDocumentHeader(completeDocument.title + ' ' + prevVersion)
  }

  async closeNewMessagePopup (): Promise<void> {
    await this.textPageHeader.press('Escape', { delay: 300 })
    await this.textPageHeader.click({ force: true, delay: 300, position: { x: 1, y: 1 } })
  }

  async completeReview (): Promise<void> {
    await this.buttonCompleteReview.click()
    await this.inputPassword.fill(PlatformPassword)
    await this.buttonSubmit.click()
  }

  async confirmRejection (rejectionReason: string): Promise<void> {
    await this.buttonReject.click()
    await this.inputPassword.fill(PlatformPassword)
    await this.inputRejectionReason.fill(rejectionReason)
    await this.buttonSubmit.click()
  }

  async confirmApproval (): Promise<void> {
    await this.buttonApprove.click()
    await this.inputPassword.fill(PlatformPassword)
    await this.buttonSubmit.click()
  }

  async confirmSubmission (): Promise<void> {
    await this.inputPassword.fill(PlatformPassword)
    await this.buttonSubmitSignature.click()
  }

  async changeCurrentRight (newRight: DocumentRights): Promise<void> {
    await this.buttonCurrentRights.click()
    await this.selectMenuItem(this.page, newRight)
  }

  async checkComparingTextAdded (text: string): Promise<void> {
    await expect(this.page.locator('span.text-editor-highlighted-node-add', { hasText: text }).first()).toBeVisible()
  }

  async checkComparingTextDeleted (text: string): Promise<void> {
    await expect(this.page.locator('span.text-editor-highlighted-node-delete', { hasText: text }).first()).toBeVisible()
  }

  async checkIfUserCanSelectSpace (space: string, spaceExists: boolean): Promise<void> {
    await expect(this.page.getByRole('button', { name: space, exact: true })).toBeVisible()
    await this.page.getByRole('button', { name: 'New document' }).click()
    await this.changeSpaceButton.click()
    if (spaceExists) {
      await expect(this.page.getByRole('button', { name: space, exact: true }).nth(1)).toBeVisible()
    }
    if (!spaceExists) {
      await expect(this.page.getByRole('button', { name: space, exact: true }).nth(1)).not.toBeVisible()
    }
  }

  async openApprovals (): Promise<void> {
    await expect(this.buttonDocumentApprovals).toBeVisible()
    await this.buttonDocumentApprovals.click({ position: { x: 1, y: 1 }, force: true })
  }

  async fillChangeDocumentAuthorPopupByQaraManager (newOwner: string): Promise<void> {
    await this.buttonSelectNewAuthor.click()
    await this.selectListItemWithSearch(this.page, newOwner)
    await this.buttonSelectNewAuthorChangeByQaraManager.click()
  }
}
