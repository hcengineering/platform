import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { MilestonesPage } from '../model/tracker/milestones-page'
import { NewMilestone } from '../model/tracker/types'
import { MilestonesDetailsPage } from '../model/tracker/milestones-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker milestone tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a Milestone', async ({ page }) => {
    const newMilestone: NewMilestone = {
      name: `Created Milestone-${generateId()}`,
      description: 'Create a Milestone',
      status: 'In progress',
      targetDateInDays: 'in 3 days'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openMilestonesForProject('Default')

    const milestonesPage = new MilestonesPage(page)
    await milestonesPage.createNewMilestone(newMilestone)
    await milestonesPage.openMilestoneByName(newMilestone.name)

    const milestonesDetailsPage = new MilestonesDetailsPage(page)
    await milestonesDetailsPage.checkIssue(newMilestone)
  })

  test('Edit a Milestone', async ({ page }) => {
    const commentText = 'Edit Milestone comment'
    const editMilestone: NewMilestone = {
      name: 'Edit Milestone',
      description: 'Edit Milestone Description',
      status: 'Completed',
      targetDateInDays: 'in 30 days'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openMilestonesForProject('Default')

    const milestonesPage = new MilestonesPage(page)
    await milestonesPage.openMilestoneByName(editMilestone.name)

    const milestonesDetailsPage = new MilestonesDetailsPage(page)
    await milestonesDetailsPage.editIssue(editMilestone)
    await milestonesDetailsPage.checkIssue(editMilestone)

    await milestonesDetailsPage.addComment(commentText)
    await milestonesDetailsPage.checkCommentExist(commentText)
    await milestonesDetailsPage.checkActivityExist('created milestone')
    await milestonesDetailsPage.checkActivityExist('changed target date at')
    await milestonesDetailsPage.checkActivityExist('changed status at')
    await milestonesDetailsPage.checkActivityExist('changed description at')
  })

  test('Delete a Milestone', async ({ page }) => {
    const deleteMilestone: NewMilestone = {
      name: 'Delete Milestone',
      description: 'Delete Milestone Description',
      status: 'Canceled'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openMilestonesForProject('Default')

    const milestonesPage = new MilestonesPage(page)
    await milestonesPage.openMilestoneByName(deleteMilestone.name)

    const milestonesDetailsPage = new MilestonesDetailsPage(page)
    await milestonesDetailsPage.checkIssue(deleteMilestone)
    await milestonesDetailsPage.deleteMilestone()

    await milestonesPage.checkMilestoneNotExist(deleteMilestone.name)
  })
})
