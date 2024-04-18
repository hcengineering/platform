import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
import { ContractPage } from './model/contacts/contract-page'

test.use({
  storageState: PlatformSetting
})

test.describe('recruit tests', () => {
  let contractPage: ContractPage

  test.beforeEach(async ({ page }) => {
    contractPage = new ContractPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('org-add-member', async ({ page }) => {
    const orgId = 'Company-' + generateId()
    await contractPage.clickAppContact()
    await contractPage.clickEmployeeNavElement('Company')
    await contractPage.clickAddCompany()
    await contractPage.fillCompanyInput(orgId)
    await contractPage.clickCreateCompany()
    await contractPage.waitForFormAntiCardDetached()
    await contractPage.clickCompanyByName(orgId)
    await contractPage.clickAddMember()
    await contractPage.clickEmployeeButton('Chen Rosamund')
    await contractPage.clickSelectMember()
    await contractPage.clickOpenNewMember(orgId)
    await contractPage.checkIfNewMemberIsAdded()
  })
})
