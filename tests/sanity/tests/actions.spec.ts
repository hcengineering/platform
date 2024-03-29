import { expect, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'
import { RecruitingPage } from './model/recruiting/recruiting-page'

test.use({
  storageState: PlatformSetting
})

test.describe('actions tests', () => {
  let recruitingPage: RecruitingPage
  test.beforeEach(async ({ page }) => {
    recruitingPage = new RecruitingPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/sanity-ws`))?.finished()
  })

  test('action-new-candidate', async () => {
    await recruitingPage.clickRecruitApplication()
    await recruitingPage.clickTalentsNavElement()
    await recruitingPage.checkIfCorrectURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    await recruitingPage.clickFrontendEngineerOption()
    await recruitingPage.pressMetaK()
    await recruitingPage.fillSearchOrRunCommandInput('Talent')
    await recruitingPage.checkIfnewTalentPopupOptionIsVisible()
    await recruitingPage.clickNewTalentPopup()
    await recruitingPage.clickTalentCloseButton()
    await recruitingPage.checkIfNewTalentModalIsClosed()
  })

  test('action-switch-vacancies', async ({ page }) => {
    await recruitingPage.clickRecruitApplication()
    await recruitingPage.clickTalentsNavElement()
    await recruitingPage.checkIfCorrectURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    await recruitingPage.checkIfSelectedTalentsNavElementIsVisible()
    await recruitingPage.pressMetaK()
    await recruitingPage.checkIfnewTalentPopupOptionIsVisible()
    await recruitingPage.inputActionsInput('go to ')
    await page.waitForTimeout(1000)
    await recruitingPage.clickGoToVacanciesPopupOption()
    await recruitingPage.checkIfCorrectURL(`${PlatformURI}/workbench/sanity-ws/recruit/vacancies`)
  })

  test('action-switch-applications', async ({ page }) => {
    await recruitingPage.clickRecruitApplication()
    await recruitingPage.clickTalentsNavElement()
    await recruitingPage.checkIfCorrectURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    await recruitingPage.checkIfSelectedTalentsNavElementIsVisible()
    await recruitingPage.pressMetaK()
    await recruitingPage.checkIfnewTalentPopupOptionIsVisible()
    await recruitingPage.inputActionsInput('go to ')
    await page.waitForTimeout(1000)
    await recruitingPage.clickOnGoToApplicationsPopupOption()
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/candidates`)
  })
})
