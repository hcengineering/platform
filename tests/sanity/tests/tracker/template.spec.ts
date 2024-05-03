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
  let leftSideMenuPage: LeftSideMenuPage
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let templatePage: TemplatePage
  let templateDetailsPage: TemplateDetailsPage

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    templatePage = new TemplatePage(page)
    templateDetailsPage = new TemplateDetailsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a Template', async () => {
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

    await leftSideMenuPage.clickTracker()
    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await templatePage.createNewTemplate(newTemplate)
    await templatePage.openTemplate(newTemplate.title)
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
    await leftSideMenuPage.clickTracker()
    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await templatePage.createNewTemplate(newTemplate)
    await templatePage.openTemplate(newTemplate.title)
    await templateDetailsPage.editTemplate(editTemplate)
    await templateDetailsPage.checkTemplate({
      ...newTemplate,
      ...editTemplate,
      estimation: '1d'
    })

    await templateDetailsPage.checkActivityContent(`New template: ${newTemplate.title}`)

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

  test('Delete a Template', async () => {
    const deleteTemplate: NewIssue = {
      title: `Template for delete-${generateId()}`,
      description: 'Created template for delete'
    }
    await leftSideMenuPage.clickTracker()
    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await templatePage.createNewTemplate(deleteTemplate)
    await templatePage.openTemplate(deleteTemplate.title)
    await templateDetailsPage.deleteTemplate()
    await templatePage.checkTemplateNotExist(deleteTemplate.title)
  })
})
