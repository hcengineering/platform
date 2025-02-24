import { test } from '@playwright/test'
import { fillSearch, generateId, PlatformSetting, PlatformURI } from './utils'
import { ContractPage, ButtonAction } from './model/contacts/contract-page'

test.use({
  storageState: PlatformSetting
})

test.describe('contact tests', () => {
  let contractPage: ContractPage
  let first: string
  let last: string
  let mail: string
  let orgName: string
  test.beforeEach(async ({ page }) => {
    first = 'Elton-' + generateId(5)
    last = 'John-' + generateId(5)
    mail = 'eltonjohn@' + generateId(5)
    orgName = 'Company' + generateId(5)
    contractPage = new ContractPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('create-contact', async () => {
    await contractPage.clickAppContact()
    await contractPage.clickEmployeeNavElement('Person')
    await contractPage.clickEmployeeButton('Person')
    await contractPage.clickFirstNameInput()
    await contractPage.fillFirstNameInput(first)
    await contractPage.clickLastNameInput()
    await contractPage.fillLastNameInput(last)
    await contractPage.clickCreateButton()
    await contractPage.waitForFormAntiCardDetached()
    await contractPage.checkIfPersonIsCreated(first, last)
  })
  test('create-company', async () => {
    await contractPage.clickAppContact()
    await contractPage.clickCompanyTab()
    await contractPage.clickAddCompany()
    await contractPage.fillCompanyInput(orgName)
    await contractPage.clickCreateCompany()
    await contractPage.waitForFormAntiCardDetached()
    await contractPage.checkIfTextIsVisible(orgName)
  })
  test('contact-search', async ({ page }) => {
    await contractPage.clickAppContact()
    await contractPage.clickEmployeeNavElement('Person')
    await contractPage.checkPersonMarinaIsVisible('M. Marina')
    await contractPage.checkPersonTableCount(5, true)
    await fillSearch(page, 'Marina')
    await contractPage.checkPersonTableCount(1)
    await fillSearch(page, '')
    await contractPage.checkPersonMarinaIsVisible('P. Andrey')
    await contractPage.checkPersonTableCount(3, true)
  })

  test('delete-contact', async () => {
    await contractPage.clickAppContact()
    await contractPage.clickEmployeeNavElement('Person')
    await contractPage.clickEmployeeButton('Person')
    await contractPage.clickFirstNameInput()
    await contractPage.fillFirstNameInput(first)
    await contractPage.clickLastNameInput()
    await contractPage.fillLastNameInput(last)
    await contractPage.clickCreateButton()
    await contractPage.waitForFormAntiCardDetached()
    await contractPage.checkIfPersonIsDeleted(first, last, 1)
    await contractPage.personRightClickOption(first, last, ButtonAction.Delete)
    await contractPage.clickSubmitButton()
    await contractPage.checkIfPersonIsDeleted(first, last, 0)
  })

  test('kick-and-delete-employee', async () => {
    await contractPage.clickAppContact()
    // Create employee
    await contractPage.clickEmployeeNavElement('Employee')
    await contractPage.clickEmployeeButton('Employee')
    await contractPage.clickFirstNameInput()
    await contractPage.fillFirstNameInput(first)
    await contractPage.clickLastNameInput()
    await contractPage.fillLastNameInput(last)
    await contractPage.clickEmailInput()
    await contractPage.fillEmailInput(mail)
    await contractPage.clickCreateButton()
    await contractPage.waitForFormAntiCardDetached()
    // employee already inactive
    // await contractPage.kickEmployee(first, last)
    // In non refactored code, the last assert just checks if the employee does exist, not if it has inactive status
    await contractPage.expectKickEmployeeShowsInactiveStatus(first, last)
  })

  test('add new application', async ({ page }) => {
    await contractPage.clickAppContact()
    await contractPage.clickEmployeeNavElement('Person')
    await contractPage.clickEmployeeButton('Person')
    await contractPage.clickFirstNameInput()
    await contractPage.fillFirstNameInput(first)
    await contractPage.clickLastNameInput()
    await contractPage.fillLastNameInput(last)
    await contractPage.clickCreateButton()
    await contractPage.waitForFormAntiCardDetached()
    await contractPage.checkIfPersonIsDeleted(first, last, 1)
    await contractPage.personRightClickOption(first, last, ButtonAction.NewApplication)
    await contractPage.addNewApplication('Test Application', 'CR Chen Rosamund')
    await page.waitForTimeout(1000)
    await contractPage.clickOnEmployee(first, last)
    await contractPage.checkStateApplication('HR Interview')
  })
})
