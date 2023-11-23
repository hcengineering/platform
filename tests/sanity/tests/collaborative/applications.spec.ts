import { expect, test } from '@playwright/test'
import { generateId, getSecondPage, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { ApplicationsPage } from '../model/recruiting/applications-page'
import { ApplicationsDetailsPage } from '../model/recruiting/applications-details-page'
import { allure } from 'allure-playwright'

test.use({
  storageState: PlatformSetting
})

test.describe('Collaborative tests for Application', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Collaborative tests')
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('Add comment from several users', async ({ page, browser }) => {
    // open second page
    const userSecondPage = await getSecondPage(browser)
    const navigationMenuPageSecond = new NavigationMenuPage(userSecondPage)
    await navigationMenuPageSecond.buttonApplications.click()

    // add Collaborators
    const vacancyName = 'Software Engineer'
    const applicationsPage = new ApplicationsPage(page)
    const talentName = await applicationsPage.createNewApplicationWithNewTalent({
      vacancy: vacancyName,
      recruiterName: 'first'
    })
    await applicationsPage.selectType(vacancyName)
    await applicationsPage.openApplicationByTalentName(talentName)
    await applicationsPage.addCollaborators()



    // add comment from user1
    await applicationsPage.openApplicationByTalentName(talentName)

    const applicationsDetailsPage = new ApplicationsDetailsPage(page)
    await applicationsDetailsPage.addComment('Test Comment from user1')
    await applicationsDetailsPage.checkCommentExist('Test Comment from user1')

    // add comment from user2
    const applicationsPageSecond = new ApplicationsPage(page)

  })
})
