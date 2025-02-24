import { expect, type Locator, type Page } from '@playwright/test'

export enum ButtonAction {
  Open = 'Open',
  OpenInNewTab = 'Open in new tab',
  NewApplication = 'New Application',
  NewLead = 'New Lead',
  NewRelatedIssue = 'New related issue',
  PublicLink = 'Public link',
  Delete = 'Delete',
  MergeContacts = 'Merge contacts'
}

export class ContractPage {
  page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly appContact = (): Locator => this.page.locator('[id="app-contact\\:string\\:Contacts"]')
  readonly employeeNavElement = (Employee: string): Locator =>
    this.page.locator(`.hulyNavItem-container:has-text("${Employee}")`)

  readonly employeeButton = (Employee: string): Locator =>
    this.page.locator(`button:not(.hulyNavItem-container, .hulyBreadcrumb-container):has-text("${Employee}")`)

  readonly firstNameInput = (): Locator => this.page.locator('[placeholder="First name"]')
  readonly lastNameInput = (): Locator => this.page.locator('[placeholder="Last name"]')
  readonly emailInput = (): Locator => this.page.locator('[placeholder="Email"]')
  readonly createButton = (): Locator => this.page.locator('.antiCard button:has-text("Create")')
  readonly formAntiCard = (): Locator => this.page.locator('form.antiCard')
  readonly employeeEntry = (first: string, last: string): Locator =>
    this.page.locator(`td:has-text("${last} ${first}")`)

  readonly kickEmployeeOption = (): Locator => this.page.locator('text="Kick employee"')
  readonly submitButton = (): Locator => this.page.locator('form[id="view:string:DeleteObject"] button[type="submit"]')
  readonly okButton = (): Locator => this.page.locator('text=Ok')
  readonly openButton = (): Locator => this.page.locator('button:has-text("Open")')
  readonly openNewTabButton = (): Locator => this.page.locator('button:has-text("Open in new tab")')
  readonly openNewApplicationButton = (): Locator => this.page.locator('button:has-text("New Application")')
  readonly openNewLeadButton = (): Locator => this.page.locator('button:has-text("New Lead")')
  readonly openNewRelatedIssueButton = (): Locator => this.page.locator('button:has-text("New related issue")')
  readonly openPublicLinkButton = (): Locator => this.page.locator('button:has-text("Public link")')
  readonly openMergeContactsButton = (): Locator => this.page.locator('button:has-text("Merge contacts")')
  readonly openDeleteButton = (): Locator => this.page.locator('button:has-text("Delete")')
  readonly newApplicationDescription = (): Locator => this.page.getByRole('paragraph')
  readonly newApplicationAssignRectruiter = (): Locator => this.page.getByRole('button', { name: 'Assigned recruiter' })
  readonly newApplicationChooseRecruiter = (recruiter: string): Locator =>
    this.page.getByRole('button', { name: recruiter })

  readonly newApplicationInterview = (Interview: string): Locator => this.page.getByRole('button', { name: Interview })
  readonly newApplicationStartDate = (): Locator => this.page.getByRole('button', { name: 'Start date' })
  readonly newApplicationStartInADay = (): Locator => this.page.getByText('in a day')
  readonly newApplicationCreate = (): Locator => this.page.getByRole('button', { name: 'Create' })
  readonly personName = (person: string): Locator => this.page.locator(`text=${person}`)
  readonly personTable = (): Locator => this.page.locator('.antiTable-body__row')
  readonly personMarina = (): Locator => this.page.getByRole('link', { name: 'MM M. Marina' })
  readonly comapnyTab = (): Locator => this.page.locator('.hulyNavItem-container:has-text("Company")')
  readonly addCompany = (): Locator => this.page.locator('button.antiButton:has-text("Company")')
  readonly companyName = (): Locator => this.page.locator('[placeholder="Company name"]')
  readonly companyCreateButton = (): Locator => this.page.locator('button:has-text("Create")')
  readonly companyByName = (company: string): Locator => this.page.locator(`text=${company}`)
  readonly addMember = (): Locator => this.page.locator('[id="contact:string:AddMember"]')
  readonly selectMember = (): Locator => this.page.getByRole('cell', { name: 'CR Chen Rosamund' }).getByRole('link')
  readonly openNewMember = (member: string): Locator => this.page.locator(`.card a:has-text("${member}")`)
  readonly newMemberAdded = (): Locator => this.page.getByText('New Members: Chen Rosamund')
  readonly stateApplication = (role: string): Locator => this.page.getByRole('cell', { name: role })
  readonly commentApplication = (): Locator => this.page.getByRole('button', { name: '1', exact: true })
  readonly commentDescription = (): Locator => this.page.getByText('Test Application')
  readonly buttonClosePanel = (): Locator => this.page.locator('button#btnPClose')

  // ACTIONS

  async addNewApplication (description: string, recruiter: string): Promise<void> {
    await this.newApplicationDescription().click()
    await this.newApplicationDescription().fill(description)
    await this.newApplicationAssignRectruiter().click()
    await this.newApplicationChooseRecruiter(recruiter).click()
    await this.newApplicationStartDate().click()
    await this.newApplicationStartInADay().click()
    await this.newApplicationCreate().click()
  }

  async clickAppContact (): Promise<void> {
    await this.appContact().click()
  }

  async clickEmployeeNavElement (Employee: string): Promise<void> {
    await this.employeeNavElement(Employee).click()
  }

  async clickEmployeeButton (Employee: string): Promise<void> {
    await this.employeeButton(Employee).click()
  }

  async clickFirstNameInput (): Promise<void> {
    await this.firstNameInput().click()
  }

  async fillFirstNameInput (firstName: string): Promise<void> {
    await this.firstNameInput().fill(firstName)
  }

  async clickLastNameInput (): Promise<void> {
    await this.lastNameInput().click()
  }

  async fillLastNameInput (lastName: string): Promise<void> {
    await this.lastNameInput().fill(lastName)
  }

  async clickEmailInput (): Promise<void> {
    await this.emailInput().click()
  }

  async fillEmailInput (email: string): Promise<void> {
    await this.emailInput().fill(email)
  }

  async fillCompanyInput (company: string): Promise<void> {
    await this.companyName().click()
    await this.companyName().fill(company)
  }

  async clickCreateButton (): Promise<void> {
    await this.createButton().click()
  }

  async clickSubmitButton (): Promise<void> {
    await this.submitButton().click()
  }

  async clickOnEmployee (first: string, last: string): Promise<void> {
    await this.employeeEntry(first, last).click()
  }

  async waitForFormAntiCardDetached (): Promise<void> {
    await this.formAntiCard().waitFor({ state: 'detached' })
  }

  async clickCompanyTab (): Promise<void> {
    await this.comapnyTab().click()
  }

  async clickAddCompany (): Promise<void> {
    await this.addCompany().click()
  }

  async clickCreateCompany (): Promise<void> {
    await this.companyCreateButton().click()
  }

  async clickCompanyByName (company: string): Promise<void> {
    await this.companyByName(company).click()
  }

  async clickAddMember (): Promise<void> {
    await this.addMember().click()
  }

  async clickSelectMember (): Promise<void> {
    await this.selectMember().click()
  }

  async clickOpenNewMember (member: string): Promise<void> {
    await this.openNewMember(member).click()
  }

  // Regular approach
  async kickEmployee (first: string, last: string): Promise<void> {
    await this.employeeEntry(first, last).hover()
    await this.employeeEntry(first, last).click({ button: 'right' })
    await this.kickEmployeeOption().click()
    await this.okButton().click()
  }

  // Approach where we use the enum to determine the action to take on the right click
  async personRightClickOption (first: string, last: string, action: ButtonAction): Promise<void> {
    await this.employeeEntry(first, last).hover()
    await this.employeeEntry(first, last).click({ button: 'right' })
    switch (action) {
      case ButtonAction.Open:
        await this.openButton().click()
        break
      case ButtonAction.OpenInNewTab:
        await this.openNewTabButton().click()
        break
      case ButtonAction.NewApplication:
        await this.openNewApplicationButton().click()
        break
      case ButtonAction.NewLead:
        await this.openNewLeadButton().click()
        break
      case ButtonAction.NewRelatedIssue:
        await this.openNewRelatedIssueButton().click()
        break
      case ButtonAction.Delete:
        await this.openDeleteButton().click()
        break
      case ButtonAction.PublicLink:
        await this.openPublicLinkButton().click()
        break
      case ButtonAction.MergeContacts:
        await this.openMergeContactsButton().click()
        break
      default:
        throw new Error('Option does not exists')
    }
  }

  // ASSERTIONS

  async expectKickEmployeeShowsInactiveStatus (first: string, last: string): Promise<void> {
    await expect(this.employeeEntry(first, last)).toContainText('Inactive')
  }

  async checkIfPersonIsDeleted (first: string, last: string, count: number): Promise<void> {
    await expect(this.employeeEntry(first, last)).toHaveCount(count)
  }

  async checkIfPersonIsCreated (first: string, last: string): Promise<void> {
    await expect(this.employeeEntry(first, last)).toBeVisible()
  }

  async checkPersonMarinaIsVisible (person: string): Promise<void> {
    await expect(this.personName(person)).toBeVisible()
  }

  async checkPersonTableCount (count: number, checkMoreOrEqual: boolean = false): Promise<void> {
    const actualCount = await this.personTable().count()

    if (checkMoreOrEqual) {
      expect(actualCount).toBeGreaterThanOrEqual(count)
    } else {
      await expect(this.personMarina()).toBeVisible()
    }
  }

  async checkIfTextIsVisible (text: string): Promise<void> {
    await expect(this.page.locator(`text=${text}`)).toBeVisible()
  }

  async checkIfNewMemberIsAdded (): Promise<void> {
    await expect(this.newMemberAdded()).toBeVisible()
  }

  async checkStateApplication (role: string): Promise<void> {
    await expect(this.stateApplication(role)).toBeVisible()
    await this.commentApplication().hover()
    await expect(this.commentDescription()).toBeVisible()
  }

  async closePanel (): Promise<void> {
    await this.buttonClosePanel().click()
  }
}
