import { expect, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'
import { RecruitingPage } from './model/recruiting/recruiting-page'

test.use({
  storageState: PlatformSetting
})
test.describe('workbench tests', () => {
  let recruitingPage: RecruitingPage
  test.beforeEach(async ({ page }) => {
    recruitingPage = new RecruitingPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('navigator', async ({ page }) => {
    const platformUri = `${PlatformURI}/workbench/sanity-ws`

    await recruitingPage.navigateToRecruitApplication(platformUri)
    await recruitingPage.openRecruitApplication()
    await recruitingPage.checkApplicationsVisibility()
    await recruitingPage.verifyTalentSection()
    await recruitingPage.navigateToVacanciesAndCheckSoftwareEngineer()
    await recruitingPage.navigateToGeneralChatAndContacts()
  })
  test('check-for-last-loc', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit`)
    const urlToCheck = page.url()
    await page.goto(`${PlatformURI}`)
    await expect(page).toHaveURL(urlToCheck)
  })
})
