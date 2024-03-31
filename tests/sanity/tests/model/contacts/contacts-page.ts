import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from '../common-page'
import { Columns, ContactType } from '../../enums'
import { getColorAttribute } from '../../utils'

export class ContactsPage extends CommonPage {
  readonly menuEmployee: Locator
  readonly menuPerson: Locator
  readonly menuCompany: Locator
  readonly buttonAddEmployee: Locator
  readonly buttonAddPerson: Locator
  readonly buttonAddCompany: Locator
  readonly formCreate: Locator
  readonly inputFirstName: Locator
  readonly inputLastName: Locator
  readonly inputEmail: Locator
  readonly inputCompanyName: Locator
  readonly buttonCreate: Locator
  readonly inputMergeContact: Locator
  readonly buttonMergeContacts: Locator
  readonly buttonFinalContact: Locator
  readonly buttonDelete: Locator
  readonly buttonShow: Locator
  readonly buttonRestoreDefaults: Locator
  readonly buttonPublicLink: Locator
  readonly buttonCopy: Locator
  readonly buttonCopied: Locator
  readonly textPublicLink: Locator
  readonly buttonDeleteOk: Locator
  readonly buttonKickEmployee: Locator
  readonly buttonOk: Locator

  constructor (readonly page: Page) {
    super()
    this.menuEmployee = page.locator('.antiNav-element >> text="Employee"')
    this.menuPerson = page.locator('.antiNav-element >> text="Person"')
    this.menuCompany = page.locator('.antiNav-element >> text="Company"')
    this.buttonAddEmployee = page.getByRole('button', { name: /Employee/ })
    this.buttonAddPerson = page.getByRole('button', { name: /Person/ })
    this.buttonAddCompany = page.getByRole('button', { name: /Company/ })
    this.formCreate = page.locator('form.antiCard')
    this.inputFirstName = page.getByPlaceholder(/First name/)
    this.inputLastName = page.getByPlaceholder(/Last name/)
    this.inputEmail = page.getByPlaceholder(/Email/)
    this.inputCompanyName = page.getByPlaceholder(/Company name/)
    this.buttonCreate = page.getByRole('button', { name: /Create/ })
    this.inputMergeContact = page.getByPlaceholder(/Search.../)
    this.buttonMergeContacts = page.getByRole('button', { name: /Merge contacts/ })
    this.buttonFinalContact = page.getByRole('button', { name: /Final contact/ })
    this.buttonShow = page.getByRole('button', { name: /Show/ })
    this.buttonDelete = page.getByRole('button', { name: /Delete/ })
    this.buttonRestoreDefaults = page.getByRole('button', { name: /Restore defaults/ })
    this.buttonPublicLink = page.getByRole('button', { name: /Public link/ })
    this.buttonCopy = page.getByRole('button', { name: /Copy/ })
    this.buttonCopied = page.getByRole('button', { name: /Copied/ })
    this.textPublicLink = page.locator('[id="guest:string:PublicLink"] > .antiCard-content')
    this.buttonDeleteOk = page.locator('form[id="view:string:DeleteObject"] button[type="submit"]')
    this.buttonKickEmployee = page.getByRole('button', { name: /Kick employee/ })
    this.buttonOk = page.getByRole('button', { name: /Ok/ })
  }

  getDataName(...name: string[]): Locator {
    return this.page.locator(`td:has-text("${name.join(' ')}")`)
  }

  getContactRow (rowPosition: number): Locator {
    return this.page.locator('td a[href*="contact"]').nth(rowPosition)
  }

  getMergeContact (...name: string[]): Locator {
    return this.page.locator(`[class^="list-item default"] >> text="${name.join(' ')}"`)
  }

  getColumnToggle (columnName: Columns | string): Locator {
    return this.page.locator(`div.caption >> text="${columnName}"`).locator(' + label > span')
  }

  getColumnHeader (columnName: Columns | string): Locator {
    return this.page.locator(`[class="antiTable-cells"] >> text="${columnName}"`)
  }

  async checkDefaultToggleState (contactType: ContactType | string): Promise<void> {
    await this.buttonRestoreDefaults.click()
    let columnsToggleOn = [
      Columns.Location, 
      Columns.Attachments, 
      Columns.ModifiedDate, 
      Columns.Role, 
      Columns.ContactInfo
    ]
    let columnsToggleOff = [
      Columns.ModifiedBy, 
      Columns.CreatedBy, 
      Columns.CreatedDate, 
      Columns.Birthday, 
      Columns.Department, 
      Columns.Title, 
      Columns.Onsite, 
      Columns.Remote, 
      Columns.Source, 
      Columns.Description
    ]

    if (contactType === 'Employees') {
      columnsToggleOn = [Columns.Employee, ...columnsToggleOn]
    }
    if (contactType === 'Person') {
      columnsToggleOn = [Columns.Person, ...columnsToggleOn]
    }
    if (contactType === 'Company') {
      columnsToggleOn = [Columns.Company, ...columnsToggleOn]
      columnsToggleOff = [Columns.ModifiedBy, Columns.CreatedBy, Columns.CreatedDate, Columns.Description]
    }
    for (const column of columnsToggleOn) {
      await expect(this.getColumnToggle(column), 'selected column toggle: ' + column).toHaveCSS('background-color', 'rgb(32, 93, 194)')
    }
    for (const column of columnsToggleOff) {
      await expect(this.getColumnToggle(column), 'selected column toggle: ' + column).toHaveCSS('background-color', 'rgba(120, 120, 128, 0.32)')
    }
  }

  async addEmployee (firstName: string, lastName: string, email: string): Promise<void> {
    await this.buttonAddEmployee.click()
    await this.inputFirstName.fill(firstName)
    await this.inputLastName.fill(lastName)
    await this.inputEmail.fill(email)
    await this.buttonCreate.click()
    await this.formCreate.waitFor({ state: 'detached', timeout: 3000 })
    await expect(this.getDataName(lastName, firstName)).toHaveCount(1)
  }

  async addPerson (firstName: string, lastName: string): Promise<void> {
    await this.buttonAddPerson.click()
    await this.inputFirstName.fill(firstName)
    await this.inputLastName.fill(lastName)
    await this.buttonCreate.click()
    await this.formCreate.waitFor({ state: 'detached', timeout: 3000 })
    await expect(this.getDataName(lastName, firstName)).toHaveCount(1)
  }

  async addCompany (companyName: string): Promise<void> {
    await this.buttonAddCompany.click()
    await this.inputCompanyName.fill(companyName)
    await this.buttonCreate.click()
    await this.formCreate.waitFor({ state: 'detached', timeout: 3000 })
    await expect(this.getDataName(companyName)).toHaveCount(1)
  }

  async deleteContact (lastName: string, firstName: string): Promise<void> {
    await this.getDataName(lastName, firstName).hover()
    await this.getDataName(lastName, firstName).click({ button: 'right' })
    await this.buttonDelete.click()
    await this.buttonDeleteOk.click()
    await expect(this.getDataName(lastName, firstName)).toHaveCount(0)
  }

  async kickEmployee (lastName: string, firstName: string): Promise<void> {
    await this.getDataName(lastName, firstName).hover()
    await this.getDataName(lastName, firstName).click({ button: 'right' })
    await this.buttonKickEmployee.click()
    await this.buttonOk.click()
    await expect(this.getDataName(lastName, firstName)).toContainText('Inactive')
  }

  async mergeContacts (lastName1: string, firstName1: string, lastName2: string, firstName2: string): Promise<void> {
    await this.getDataName(lastName2, firstName2).hover()
    await this.getDataName(lastName2, firstName2).click({ button: 'right' })
    await this.buttonMergeContacts.click()
    await this.buttonFinalContact.click()
    await this.inputMergeContact.fill(lastName1)
    await this.getMergeContact(lastName1, firstName1).click()
    await this.buttonMergeContacts.click()
    await this.formCreate.waitFor({ state: 'detached', timeout: 3000 })
    await expect(this.getDataName(lastName1, firstName1)).toHaveCount(1)
    await expect(this.getDataName(lastName2, firstName2)).toHaveCount(0)
  }

  async copyPublicLink (): Promise<void> {
    await expect(this.textPublicLink).not.toHaveText('')
    const displayedLink = await this.textPublicLink.textContent() as string
    await this.buttonCopy.click()
    await this.buttonCopied.waitFor({ timeout: 3000})
    // check copied link
    const copiedLink = await this.page.evaluate(() => navigator.clipboard.readText())
    expect(copiedLink.trim()).toBe(displayedLink.trim())
  }

  async toggleColumn (columnName: Columns | string): Promise<void> {
    // check current toggle state is on or off before switching
    const toggleState = await getColorAttribute(this.getColumnToggle(columnName)) === 'rgb(32, 93, 194)'

    // switch toggle
    await this.getColumnToggle(columnName).click()

    // check column visibility
    if (toggleState) {
      // if previous toggle was on, column should be hidden after switching
      await expect(this.getColumnHeader(columnName)).toBeHidden()
    }
    else {
      // if previous toggle was off, column should be visible after switching
      await expect(this.getColumnHeader(columnName)).toBeVisible()
    }
  }
}
