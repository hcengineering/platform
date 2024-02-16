import { test } from '@playwright/test'
import { getSecondPage, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { ApplicationsPage } from '../model/recruiting/applications-page'
import { ApplicationsDetailsPage } from '../model/recruiting/applications-details-page'
import { TalentName } from '../model/recruiting/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Collaborative tests for Application', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test.skip('Add comment from several users', async ({ page, browser }) => {
    const vacancyName = 'Software Engineer'
    let talentName: TalentName
    // open second page
    const userSecondPage = await getSecondPage(browser)

    await test.step('User1. Add collaborators and comment from user1', async () => {
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.buttonApplications.click()

      const applicationsPage = new ApplicationsPage(page)
      talentName = await applicationsPage.createNewApplicationWithNewTalent({
        vacancy: vacancyName,
        recruiterName: 'first'
      })
      await applicationsPage.openApplicationByTalentName(talentName)

      const applicationsDetailsPage = new ApplicationsDetailsPage(page)
      await applicationsDetailsPage.addCollaborators('Dirak Kainin')
      await applicationsDetailsPage.addComment('Test Comment from user1')
      await applicationsDetailsPage.checkCommentExist('Test Comment from user1')
    })

    await test.step('User2. Check notification and add comment from user2', async () => {
      await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()

      const leftSideMenuPageSecond = new LeftSideMenuPage(userSecondPage)
      await leftSideMenuPageSecond.checkExistNewNotification(userSecondPage)
      await leftSideMenuPageSecond.buttonNotification.click()

      // TODO: rewrite checkNotificationCollaborators and uncomment
      // const notificationPageSecond = new NotificationPage(userSecondPage)
      // await notificationPageSecond.checkNotificationCollaborators(
      //   `${talentName.lastName} ${talentName.firstName}`,
      //   'You have been added to collaborators'
      // )

      await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
      const navigationMenuPageSecond = new NavigationMenuPage(userSecondPage)
      await navigationMenuPageSecond.buttonApplications.click()

      const applicationsPageSecond = new ApplicationsPage(userSecondPage)
      await applicationsPageSecond.openApplicationByTalentName(talentName)

      const applicationsDetailsPageSecond = new ApplicationsDetailsPage(userSecondPage)
      await applicationsDetailsPageSecond.checkCommentExist('Test Comment from user1')
      await applicationsDetailsPageSecond.addComment('Test Comment from user2')
      await applicationsDetailsPageSecond.checkCommentExist('Test Comment from user2')
    })

    await test.step('User1. Check notification and check comment from user1', async () => {
      const leftSideMenuPage = new LeftSideMenuPage(page)
      await leftSideMenuPage.checkExistNewNotification(page)
      await leftSideMenuPage.buttonNotification.click()

      // TODO: rewrite checkNotificationCollaborators and uncomment
      // const notificationPage = new NotificationPage(page)
      // await notificationPage.checkNotificationCollaborators(
      //   `${talentName.lastName} ${talentName.firstName}`,
      //   'left a comment'
      // )

      await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.buttonApplications.click()

      const applicationsPage = new ApplicationsPage(page)
      await applicationsPage.openApplicationByTalentName(talentName)

      const applicationsDetailsPage = new ApplicationsDetailsPage(page)
      await applicationsDetailsPage.checkCommentExist('Test Comment from user2')
    })
  })
})
