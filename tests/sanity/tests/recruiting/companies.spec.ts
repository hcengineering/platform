import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { CompaniesPage } from '../model/recruiting/companies-page'
import { NewCompany } from '../model/recruiting/types'
import { CompanyDetailsPage } from '../model/recruiting/company-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Companies tests', () => {
  test.beforeEach(async ({ page }) => {
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

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonCompanies.click()

    const companiesPage = new CompaniesPage(page)
    await companiesPage.createNewCompany(newCompany)
    await companiesPage.openCompanyByName(newCompany.name)

    const companyDetailsPage = new CompanyDetailsPage(page)
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

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonCompanies.click()

    const companiesPage = new CompaniesPage(page)
    await companiesPage.createNewCompany({ name: createdCompany })
    await companiesPage.openCompanyByName(createdCompany)

    const companyDetailsPage = new CompanyDetailsPage(page)
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

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonCompanies.click()

    const companiesPage = new CompaniesPage(page)
    await companiesPage.createNewCompany(deleteCompany)
    await companiesPage.openCompanyByName(deleteCompany.name)

    const companyDetailsPage = new CompanyDetailsPage(page)
    await companyDetailsPage.checkCompany(deleteCompany)
    await companyDetailsPage.deleteEntity()

    await navigationMenuPage.buttonCompanies.click()
    await companiesPage.checkCompanyNotExist(deleteCompany.name)
  })
})
