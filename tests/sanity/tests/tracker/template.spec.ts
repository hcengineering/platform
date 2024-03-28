import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { Issue, NewIssue } from '../model/tracker/types'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { TemplatePage } from '../model/tracker/templates-page'
import { TemplateDetailsPage } from '../model/tracker/template-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker template tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a Template', async ({ page }) => {
    const newTemplate: NewIssue = {
      title: `Template with all parameters-${generateId()}`,
      description: 'Created template with all parameters',
      priority: 'Urgent',
      assignee: 'Dirak Kainin',
      createLabel: true,
      labels: `CREATE-TEMPLATE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openTemplateForProject('Default')

    const templatePage = new TemplatePage(page)
    await templatePage.createNewTemplate(newTemplate)
    await templatePage.openTemplate(newTemplate.title)

    const templateDetailsPage = new TemplateDetailsPage(page)
    await templateDetailsPage.checkTemplate({
      ...newTemplate,
      estimation: '2h'
    })
  })

  test('Edit a Template', async ({ page }) => {
    const newTemplate: NewIssue = {
      title: `Template for edit-${generateId()}`,
      description: 'Created template for edit'
    }

    const editTemplate: Issue = {
      priority: 'High',
      assignee: 'Dirak Kainin',
      createLabel: true,
      labels: `EDIT-TEMPLATE-${generateId()}`,
      component: 'No component',
      estimation: '8',
      duedate: 'today'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openTemplateForProject('Default')

    const templatePage = new TemplatePage(page)
    await templatePage.createNewTemplate(newTemplate)
    await templatePage.openTemplate(newTemplate.title)

    const templateDetailsPage = new TemplateDetailsPage(page)
    await templateDetailsPage.editTemplate(editTemplate)

    await templateDetailsPage.checkTemplate({
      ...newTemplate,
      ...editTemplate,
      estimation: '1d'
    })

    await templateDetailsPage.checkCommentExist('Appleseed John created template')

    const estimations = new Map([
      ['0', '0h'],
      ['1', '1h'],
      ['1.25', '1h 15m'],
      ['1.259', '1h 15m'],
      ['1.26', '1h 15m'],
      ['1.27', '1h 16m'],
      ['1.5', '1h 30m'],
      ['1.75', '1h 45m'],
      ['2', '2h'],
      ['7', '7h'],
      ['8', '1d'],
      ['9', '1d 1h'],
      ['9.5', '1d 1h 30m']
    ])

    for (const [input, expected] of estimations.entries()) {
      await templateDetailsPage.editTemplate({
        estimation: input
      })
      await templateDetailsPage.checkTemplate({
        ...newTemplate,
        ...editTemplate,
        estimation: expected
      })
    }
  })

  test('Delete a Template', async ({ page }) => {
    const deleteTemplate: NewIssue = {
      title: `Template for delete-${generateId()}`,
      description: 'Created template for delete'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openTemplateForProject('Default')

    let templatePage = new TemplatePage(page)
    await templatePage.createNewTemplate(deleteTemplate)
    await templatePage.openTemplate(deleteTemplate.title)

    const templateDetailsPage = new TemplateDetailsPage(page)

    await templateDetailsPage.deleteTemplate()

    templatePage = new TemplatePage(page)
    await templatePage.checkTemplateNotExist(deleteTemplate.title)
  })
})
