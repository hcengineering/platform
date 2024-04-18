import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
import { LeadsPage } from './model/leads/leads-page'

test.use({
  storageState: PlatformSetting
})

test.describe('duplicate-org-test', () => {
  let leadsPage: LeadsPage
  test.beforeEach(async ({ page }) => {
    leadsPage = new LeadsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('check-contact-exists', async () => {
    const genId = 'Asoft-' + generateId(4)
    await leadsPage.clickLeadApplication()
    await leadsPage.clickCustomersNavElement()
    await leadsPage.clickNewCustomerButton()
    await leadsPage.clickPersonButton()
    await leadsPage.clickCompanyButton()
    await leadsPage.inputCompanyName(genId)
    await leadsPage.clickCreateButton()
    await leadsPage.waitForAntiCardFormDetached()
    await leadsPage.clickNewCustomerButton()
    await leadsPage.clickPersonButton()
    await leadsPage.clickCompanyButton()
    await leadsPage.inputCompanyName(genId)
    await leadsPage.checkContactExistsMessage()
  })
})
