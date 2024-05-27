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
    await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`)
  })

  test.skip('Add comment from several users', async ({ page, browser }) => {
    const vacancyName = 'Software Engineer'
    let talentName: TalentName
    const { page: userSecondPage, context } = await getSecondPage(browser)

    await test.step('User1. Add collaborators and comment from user1', async () => {
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.clickButtonApplications()

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
      await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/recruit`)

      const leftSideMenuPageSecond = new LeftSideMenuPage(userSecondPage)
      await leftSideMenuPageSecond.checkExistNewNotification()
      await leftSideMenuPageSecond.clickNotification()

      // TODO: rewrite checkNotificationCollaborators and uncomment
      // const notificationPageSecond = new NotificationPage(userSecondPage)
      // await notificationPageSecond.checkNotificationCollaborators(
      //   `${talentName.lastName} ${talentName.firstName}`,
      //   'You have been added to collaborators'
      // )

      await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/recruit`)
      const navigationMenuPageSecond = new NavigationMenuPage(userSecondPage)
      await navigationMenuPageSecond.clickButtonApplications()

      const applicationsPageSecond = new ApplicationsPage(userSecondPage)
      await applicationsPageSecond.openApplicationByTalentName(talentName)

      const applicationsDetailsPageSecond = new ApplicationsDetailsPage(userSecondPage)
      await applicationsDetailsPageSecond.checkCommentExist('Test Comment from user1')
      await applicationsDetailsPageSecond.addComment('Test Comment from user2')
      await applicationsDetailsPageSecond.checkCommentExist('Test Comment from user2')
    })

    await test.step('User1. Check notification and check comment from user1', async () => {
      const leftSideMenuPage = new LeftSideMenuPage(page)
      await leftSideMenuPage.checkExistNewNotification()
      await leftSideMenuPage.clickNotification()

      // TODO: rewrite checkNotificationCollaborators and uncomment
      // const notificationPage = new NotificationPage(page)
      // await notificationPage.checkNotificationCollaborators(
      //   `${talentName.lastName} ${talentName.firstName}`,
      //   'left a comment'
      // )

      await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`)
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.clickButtonApplications()

      const applicationsPage = new ApplicationsPage(page)
      await applicationsPage.openApplicationByTalentName(talentName)

      const applicationsDetailsPage = new ApplicationsDetailsPage(page)
      await applicationsDetailsPage.checkCommentExist('Test Comment from user2')
    })

    await userSecondPage.close()
    await context.close()
  })
})
