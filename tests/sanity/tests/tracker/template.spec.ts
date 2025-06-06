import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { Issue, NewIssue } from '../model/tracker/types'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { TemplatePage } from '../model/tracker/templates-page'
import { TemplateDetailsPage } from '../model/tracker/template-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker template tests', () => {
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let templatePage: TemplatePage
  let templateDetailsPage: TemplateDetailsPage

  test.beforeEach(async ({ page }) => {
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

    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await templatePage.createNewTemplate(newTemplate)
    await templatePage.openTemplate(newTemplate.title)
    await templateDetailsPage.checkTemplate(newTemplate)
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
    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await templatePage.createNewTemplate(newTemplate)
    await templatePage.openTemplate(newTemplate.title)
    await templateDetailsPage.editTemplate(editTemplate)
    await templateDetailsPage.checkTemplate({
      ...newTemplate,
      ...editTemplate
    })

    await templateDetailsPage.checkActivityContent(`New template: ${newTemplate.title}`)

    const estimations = ['0', '1', '1.25', '1.259', '1.26', '1.27', '1.5', '1.75', '2', '7', '8', '9', '9.5']

    for (const input of estimations) {
      await templateDetailsPage.editTemplate({
        estimation: input
      })
      await templateDetailsPage.checkTemplate({
        ...newTemplate,
        ...editTemplate,
        estimation: input
      })
    }
  })

  test('Delete a Template', async () => {
    const deleteTemplate: NewIssue = {
      title: `Template for delete-${generateId()}`,
      description: 'Created template for delete'
    }
    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await templatePage.createNewTemplate(deleteTemplate)
    await templatePage.openTemplate(deleteTemplate.title)
    await templateDetailsPage.deleteTemplate()
    await templatePage.checkTemplateNotExist(deleteTemplate.title)
  })
})
