import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { MilestonesPage } from '../model/tracker/milestones-page'
import { NewMilestone } from '../model/tracker/types'
import { MilestonesDetailsPage } from '../model/tracker/milestones-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker milestone tests', () => {
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let milestonesPage: MilestonesPage
  let milestonesDetailsPage: MilestonesDetailsPage

  test.beforeEach(async ({ page }) => {
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    milestonesPage = new MilestonesPage(page)
    milestonesDetailsPage = new MilestonesDetailsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a Milestone', async () => {
    const newMilestone: NewMilestone = {
      name: `Created Milestone-${generateId()}`,
      description: 'Create a Milestone',
      status: 'In progress',
      targetDateInDays: 'in 3 days'
    }
    await trackerNavigationMenuPage.openMilestonesForProject('Default')
    await milestonesPage.createNewMilestone(newMilestone)
    await milestonesPage.openMilestoneByName(newMilestone.name)
    await milestonesDetailsPage.checkIssue(newMilestone)
  })

  test('Edit a Milestone', async () => {
    const commentText = 'Edit Milestone comment'
    const editMilestone: NewMilestone = {
      name: 'Edit Milestone',
      description: 'Edit Milestone Description',
      status: 'Completed',
      targetDateInDays: 'in 30 days'
    }
    await trackerNavigationMenuPage.openMilestonesForProject('Default')
    await milestonesPage.openMilestoneByName(editMilestone.name)
    await milestonesDetailsPage.editIssue(editMilestone)
    await milestonesDetailsPage.checkIssue(editMilestone)
    await milestonesDetailsPage.addComment(commentText)
    await milestonesDetailsPage.checkCommentExist(commentText)
    await milestonesDetailsPage.checkActivityContentExist(`New milestone: ${editMilestone.name}`)
    await milestonesDetailsPage.checkActivityContentExist(`Status set to ${editMilestone.status}`)
    await milestonesDetailsPage.checkActivityExist('changed description at')
  })

  test('Delete a Milestone', async () => {
    const deleteMilestone: NewMilestone = {
      name: 'Delete Milestone',
      description: 'Delete Milestone Description',
      status: 'Canceled'
    }
    await trackerNavigationMenuPage.openMilestonesForProject('Default')
    await milestonesPage.openMilestoneByName(deleteMilestone.name)
    await milestonesDetailsPage.checkIssue(deleteMilestone)
    await milestonesDetailsPage.deleteMilestone()
    await milestonesPage.checkMilestoneNotExist(deleteMilestone.name)
  })
})
