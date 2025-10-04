import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { CompaniesPage } from '../model/recruiting/companies-page'
import { NewCompany } from '../model/recruiting/types'
import { CompanyDetailsPage } from '../model/recruiting/company-details-page'
import { DEFAULT_USER } from '../tracker/tracker.utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Companies tests', () => {
  let navigationMenuPage: NavigationMenuPage
  let companiesPage: CompaniesPage
  let companyDetailsPage: CompanyDetailsPage

  test.beforeEach(async ({ page }) => {
    navigationMenuPage = new NavigationMenuPage(page)
    companiesPage = new CompaniesPage(page)
    companyDetailsPage = new CompanyDetailsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('Create a new Company', async ({ page }) => {
    const newCompany: NewCompany = {
      name: `Create a new Company test-${generateId()}`,
      socials: [
        {
          type: 'Phone',
          value: '3213221321213'
        },
        {
          type: 'Email',
          value: 'test+321313123@gmail.com'
        }
      ]
    }

    await navigationMenuPage.clickButtonCompanies()
    await companiesPage.createNewCompany(newCompany)
    await companiesPage.openCompanyByName(newCompany.name)
    await companyDetailsPage.checkCompany(newCompany)
  })

  test('Edit a Company', async ({ page }) => {
    const createdCompany = `Edit Company--${generateId()}`
    const editCompany: NewCompany = {
      name: `Updated Edit Company-${generateId()}`,
      socials: [
        {
          type: 'Phone',
          value: '+79835227364'
        },
        {
          type: 'Email',
          value: 'edit-company+1@gmail.com'
        },
        {
          type: 'LinkedIn',
          value: 'https://www.linkedin.com/in/test-contact/'
        }
      ],
      location: 'London'
    }

    await navigationMenuPage.clickButtonCompanies()
    await companiesPage.createNewCompany({ name: createdCompany })
    await companiesPage.openCompanyByName(createdCompany)
    await companyDetailsPage.checkCompany({
      name: createdCompany
    })

    await companyDetailsPage.editCompany(editCompany)
    await companyDetailsPage.checkCompany(editCompany)
  })

  test('Delete a Company', async ({ page }) => {
    const deleteCompany: NewCompany = {
      name: `Delete Company-${generateId()}`
    }
    await navigationMenuPage.clickButtonCompanies()
    await companiesPage.createNewCompany(deleteCompany)
    await companiesPage.openCompanyByName(deleteCompany.name)
    await companyDetailsPage.checkCompany(deleteCompany)
    await companyDetailsPage.deleteEntity()
    await navigationMenuPage.clickButtonCompanies()
    await companiesPage.checkCompanyNotExist(deleteCompany.name)
  })

  test('Filtering companies', async ({ page }) => {
    const firstCompany: NewCompany = {
      name: `Company for filtering one-${generateId()}`
    }
    const secondCompany: NewCompany = {
      name: `Company for filtering two-${generateId()}`
    }
    await test.step('Create companies', async () => {
      await navigationMenuPage.clickButtonCompanies()
      await companiesPage.createNewCompany(firstCompany)
      await companiesPage.checkCompanyExist(firstCompany.name)
      await companiesPage.createNewCompany(secondCompany)
      await companiesPage.checkCompanyExist(secondCompany.name)
    })
    await test.step('Filtering by creator', async () => {
      await companiesPage.selectFilter('Created by', DEFAULT_USER)
      await companiesPage.pressEscape()
      await companiesPage.checkCompanyExist(firstCompany.name)
      await companiesPage.checkCompanyExist(secondCompany.name)
    })
    await test.step('Filtering by name', async () => {
      await companiesPage.selectFilter('Name', firstCompany.name, companiesPage.addFilterButton())
      await companiesPage.checkCompanyExist(firstCompany.name)
      await companiesPage.checkCompanyNotExist(secondCompany.name)
    })
    await test.step('Remove name filter', async () => {
      await companiesPage.removeFilterOption('Name')
      await companiesPage.checkCompanyExist(firstCompany.name)
      await companiesPage.checkCompanyExist(secondCompany.name)
    })
  })
})
