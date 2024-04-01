import { expect, test } from '@playwright/test'
import { fillSearch, generateId, PlatformSetting, PlatformURI, getRandomNumber } from './utils'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { ContactsPage } from './model/contacts/contacts-page'
import { Columns, ContactType } from './enums'

let leftSideMenuPage: LeftSideMenuPage
let contactsPage: ContactsPage

test.use({
  storageState: PlatformSetting
})

test.describe('contact tests', () => {
  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    contactsPage = new ContactsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    await leftSideMenuPage.buttonContacts.click()
  })

  test('create-contact', async () => {
    const fname = 'fname-' + generateId(5)
    const lname = 'lname-' + generateId(5)

    // create person
    await contactsPage.menuPerson.click()
    await contactsPage.addPerson(fname, lname)
  })
  test('create-company', async () => {
    const companyName = 'company' + generateId(5)

    // create company
    await contactsPage.menuCompany.click()
    await contactsPage.addCompany(companyName)
  })
  test('contact-search', async ({ page }) => {
    await contactsPage.menuPerson.click()
    // check if there are contacts
    await expect(contactsPage.getContactRow(0)).toBeVisible()

    // select random contact to search
    const totalRows = await contactsPage.getContactRow().count()
    const rowToSearch = getRandomNumber(0, totalRows - 1)
    const searchValue = await contactsPage.getContactRow(rowToSearch).textContent() as string

    // search for contact
    await fillSearch(page, searchValue)
    await expect(contactsPage.getContactName(searchValue)).toHaveCount(1)

    // clear search
    await fillSearch(page, '')
    await expect(contactsPage.getContactRow()).toHaveCount(totalRows)
  })

  test('delete-contact', async () => {
    const fname = 'fname-' + generateId(5)
    const lname = 'lname-' + generateId(5)

    // create contact
    await contactsPage.menuPerson.click()
    await contactsPage.addPerson(fname, lname)

    // delete contact
    await contactsPage.deleteContact(lname, fname)
  })

  test('kick-and-delete-employee', async () => {
    const fname = 'fname-' + generateId(5)
    const lname = 'lname-' + generateId(5)
    const email = 'email@' + generateId(5)

    // create employee
    await contactsPage.menuEmployee.click()
    await contactsPage.addEmployee(fname, lname, email)
  
    // kick employee
    await contactsPage.kickEmployee(lname, fname)
  })

  test('copy public link for employee', async () => {
    await contactsPage.menuEmployee.click()
    await contactsPage.getContactRow(0).hover()
    await contactsPage.getContactRow(0).click({ button: 'right' })
    await contactsPage.buttonPublicLink.click()
    await contactsPage.copyPublicLink()
  })

  test('copy public link for person', async () => {
    await contactsPage.menuPerson.click()
    await contactsPage.getContactRow(0).hover()
    await contactsPage.getContactRow(0).click({ button: 'right' })
    await contactsPage.buttonPublicLink.click()
    await contactsPage.copyPublicLink()
  })

  test('copy public link for company', async () => {
    await contactsPage.menuCompany.click()
    await contactsPage.getContactRow(0).hover()
    await contactsPage.getContactRow(0).click({ button: 'right' })
    await contactsPage.buttonPublicLink.click()
    await contactsPage.copyPublicLink()
  })

  test('show table columns for employee', async () => {
    await contactsPage.menuEmployee.click()
    await contactsPage.buttonShow.click()
    await contactsPage.toggleColumn(Columns.Employee)
    await contactsPage.checkDefaultToggleState(ContactType.Employee)
  })

  test('show table columns for person', async () => {
    await contactsPage.menuPerson.click()
    await contactsPage.buttonShow.click()
    await contactsPage.toggleColumn(Columns.Location)
    await contactsPage.checkDefaultToggleState(ContactType.Person)
  })

  test('show table columns for company', async () => {
    await contactsPage.menuCompany.click()
    await contactsPage.buttonShow.click()
    await contactsPage.toggleColumn(Columns.Attachments)
    await contactsPage.checkDefaultToggleState(ContactType.Company)
  })

  test('merge employee contact to final contact from search', async () => {
    await contactsPage.menuEmployee.click()

    // create first employee
    const fname1 = 'fname-' + generateId(5)
    const lname1 = 'lname-' + generateId(5)
    const email1 = 'email@' + generateId(5)

    await contactsPage.addEmployee(fname1, lname1, email1)

    // create second employee
    const fname2 = 'fname-' + generateId(5)
    const lname2 = 'lname-' + generateId(5)
    const email2 = 'email@' + generateId(5)

    await contactsPage.addEmployee(fname2, lname2, email2)

    // merge contacts from first employee to second employee
    await contactsPage.mergeContacts(lname1, fname1, lname2, fname2)
  })

  test('merge employee contact to current selected contact', async () => {
    await contactsPage.menuEmployee.click()

    // create first employee
    const fname1 = 'fname-' + generateId(5)
    const lname1 = 'lname-' + generateId(5)
    const email1 = 'email@' + generateId(5)

    await contactsPage.addEmployee(fname1, lname1, email1)

    // create second employee
    const fname2 = 'fname-' + generateId(5)
    const lname2 = 'lname-' + generateId(5)
    const email2 = 'email@' + generateId(5)

    await contactsPage.addEmployee(fname2, lname2, email2)

    // merge contacts from first employee to second employee
    await contactsPage.mergeContacts(lname1, fname1, lname2, fname2, false)
  })

  test('merge person contact to final contact from search', async () => {
    await contactsPage.menuPerson.click()

    // create first person
    const fname1 = 'fname-' + generateId(5)
    const lname1 = 'lname-' + generateId(5)

    await contactsPage.addPerson(fname1, lname1)

    // create second person
    const fname2 = 'fname-' + generateId(5)
    const lname2 = 'lname-' + generateId(5)

    await contactsPage.addPerson(fname2, lname2)

    // merge contacts from first person to second person
    await contactsPage.mergeContacts(lname1, fname1, lname2, fname2)

    // delete merged contact
    await contactsPage.deleteContact(lname1, fname1)
  })

  test('merge person contact to current selected contact', async () => {
    await contactsPage.menuPerson.click()

    // create first person
    const fname1 = 'fname-' + generateId(5)
    const lname1 = 'lname-' + generateId(5)

    await contactsPage.addPerson(fname1, lname1)

    // create second person
    const fname2 = 'fname-' + generateId(5)
    const lname2 = 'lname-' + generateId(5)

    await contactsPage.addPerson(fname2, lname2)

    // merge contacts from first person to second person
    await contactsPage.mergeContacts(lname1, fname1, lname2, fname2, false)

    // delete merged contact
    await contactsPage.deleteContact(lname2, fname2)
  })
})
