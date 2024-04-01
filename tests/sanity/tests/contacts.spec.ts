import { expect, test } from '@playwright/test'
import { fillSearch, generateId, PlatformSetting, PlatformURI } from './utils'
import { LoginPage } from './model/login-page'
import { PlatformUser } from './utils'
import { SignUpPage } from './model/signup-page'
import { SignUpData } from './model/common-types'
import { SelectWorkspacePage } from './model/select-workspace-page'
import { LeftSideMenuPage } from './model/left-side-menu-page'


test.use({

  storageState: PlatformSetting
})

test.describe('contact tests', () => {
  test.beforeEach(async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.linkSignUp.click()
    const signUpPage = new SignUpPage(page)
    await signUpPage.signUp(newUser)
    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonContacts.click()
  })

  test('create-contact', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Person")')
    await page.click('button:has-text("Person")')
    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
  })

  test('create-employee', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Employee")')
    await page.click('button:has-text("Employee")')
    const first = 'Jhon-' + generateId(5)
    const last = 'Wick-' + generateId(5)
    const mailId = 'Jhon' + generateId(3) + '@' + 'test.com'
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    const email = page.locator('[placeholder ="Email"]')
    await email.click()
    await email.fill(mailId)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
  })

  test('create-company', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Company")')
    await page.click('button:has-text("Company")')
    const orgName = 'Company' + generateId(5)
    const firstName = page.locator('[placeholder="Company name"]')
    await firstName.click()
    await firstName.fill(orgName)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator(`text=${orgName}`)).toBeVisible()
  })

  test('person contact-search', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Person")')
    await page.click('button:has-text("Person")')
    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator('text=Elton')).toBeVisible()
    await fillSearch(page, 'Elton')
    await expect(page.locator('.antiTable-body__row')).toHaveCount(1, {
      timeout: 15000
    })
    await fillSearch(page, 'Andrey')
    await expect(page.locator('text=P. Andrey')).not.toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toEqual(0)
  })

  test('employee contact-search', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Employee")')
    await page.click('button:has-text("Employee")')
    const first = 'Jhon-' + generateId(5)
    const last = 'Wick-' + generateId(5)
    const mailId = 'Jhon' + generateId(3) + '@' + 'test.com'
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    const email = page.locator('[placeholder ="Email"]')
    await email.click()
    await email.fill(mailId)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator('text=Jhon')).toBeVisible()
    await fillSearch(page, 'Jhon')
    await expect(page.locator('.antiTable-body__row')).toHaveCount(1, {
      timeout: 15000
    })
    await fillSearch(page, 'Andrey')
    await expect(page.locator('text=P. Andrey')).not.toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toEqual(0)
  })

  test('company contact-search', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Company")')
    await page.click('button:has-text("Company")')
    const orgName = 'Company' + generateId(5)
    const firstName = page.locator('[placeholder="Company name"]')
    await firstName.click()
    await firstName.fill(orgName)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator(`text=${orgName}`)).toBeVisible()
    await expect(page.locator(`text=${orgName}`)).toBeVisible()
    await fillSearch(page, `${orgName}`)
    await expect(page.locator('.antiTable-body__row')).toHaveCount(1, {
      timeout: 15000
    })
    await fillSearch(page, 'Test')
    await expect(page.locator('text=P. Test')).not.toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toEqual(0)
  })

  test('edit person contact', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Person")')
    await page.click('button:has-text("Person")')
    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    await page.locator('.antiCard button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await page.hover(`td:has-text("${last} ${first}")`)
    await page.click(`td:has-text("${last} ${first}")`, {
      button: 'left'
    })
    await firstName.click()
    await firstName.fill("updated")
    await lastName.click()
    await page.waitForTimeout(5000)
    const headers = page.locator('.activityMessage .header');
    const count = await headers.count();
    let textFound = false;
    for (let i = 0; i < count; ++i) {
      const text = await headers.nth(i).textContent();
      if (text.includes('changed')) {
        textFound = true;
        break;
      }
    }
    expect(textFound).toBe(true);
  })

  test('edit employee contact', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Employee")')
    await page.click('button:has-text("Employee")')
    const first = 'Jhon-' + generateId(6)
    const last = 'Wick-' + generateId(4)
    const mailId = 'Jhon' + generateId(6) + '@' + 'testing.com'
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    const email = page.locator('[placeholder ="Email"]')
    await email.click()
    await email.fill(mailId)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await page.hover(`td:has-text("${last} ${first}")`)
    await page.click(`td:has-text("${last} ${first}")`, {
      button: 'left'
    })
    await firstName.click()
    await firstName.fill("updated")
    await lastName.click()
    await page.waitForTimeout(5000)
    const headers = page.locator('.activityMessage .header');
    const count = await headers.count();
    let textFound = false;
    for (let i = 0; i < count; ++i) {
      const text = await headers.nth(i).textContent();
      if (text.includes('changed')) {
        textFound = true;
        break;
      }
    }
    expect(textFound).toBe(true);
  })

  test('edit company contact', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Company")')
    await page.click('button:has-text("Company")')
    const orgName = 'Company' + generateId(5)
    const firstName = page.locator('[placeholder="Company name"]')
    const CompanyName = page.locator('[placeholder="First name"]')
    const Description = page.locator('[data-placeholder="Description"]')
    await firstName.click()
    await firstName.fill(orgName)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await page.hover(`td:has-text("${orgName}")`)
    await page.click(`td:has-text("${orgName}")`, {
      button: 'left'
    })

    await CompanyName.click()
    await CompanyName.fill("updated")
    await Description.click()
    const changedTextLocator = page.locator('.activityMessage .header:has-text("changed")');
    await expect(changedTextLocator).toHaveCount(1);
  })

  test('person delete-contact', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Person")')
    await page.click('button:has-text("Person")')
    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    await page.locator('.antiCard button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator(`td:has-text("${last} ${first}")`)).toHaveCount(1)
    await page.hover(`td:has-text("${last} ${first}")`)
    await page.click(`td:has-text("${last} ${first}")`, {
      button: 'right'
    })
    await page.click('text="Delete"')
    await page.click('form[id="view:string:DeleteObject"] button[type="submit"]')
    await expect(page.locator(`td:has-text("${last} ${first}")`)).toHaveCount(0)
  })

  test('company delete-contact', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Company")')
    await page.click('button:has-text("Company")')
    const orgName = 'Company' + generateId(5)
    const firstName = page.locator('[placeholder="Company name"]')
    await firstName.click()
    await firstName.fill(orgName)
    await page.locator('.antiCard').locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(page.locator(`td:has-text("${orgName}")`)).toHaveCount(1)
    await page.hover(`td:has-text("${orgName}")`)
    await page.click(`td:has-text("${orgName}")`, {
      button: 'right'
    })
    await page.click('text="Delete"')
    await page.click('form[id="view:string:DeleteObject"] button[type="submit"]')
    await expect(page.locator(`td:has-text("${orgName}")`)).toHaveCount(0)
  })

  test('kick-and-delete-employee', async ({ page }) => {
    await page.locator('[id="app-contact\\:string\\:Contacts"]').click()
    await page.click('.antiNav-element:has-text("Employee")')
    await page.click('button:has-text("Employee")')
    const first = 'Elton-' + generateId(5)
    const last = 'John-' + generateId(5)
    const mail = 'eltonjohn@' + generateId(5)
    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)
    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)
    const email = page.locator('[placeholder="Email"]')
    await email.click()
    await email.fill(mail)
    await page.locator('.antiCard button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    // Kick employee
    // Click #context-menu svg
    await page.hover(`td:has-text("${last} ${first}")`)
    await page.click(`td:has-text("${last} ${first}")`, { button: 'right' })
    await page.click('text="Kick employee"')
    // Click text=Ok
    await page.click('text=Ok')
    await expect(page.locator(`td:has-text("${last} ${first}")`)).toHaveCount(1)
  })
})
