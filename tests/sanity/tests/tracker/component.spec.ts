import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI, fillSearch } from '../utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { ComponentsPage } from '../model/tracker/components-page'
import { NewComponent } from '../model/tracker/types'
import { ComponentsDetailsPage } from '../model/tracker/component-details-page'
import { CommonTrackerPage } from '../model/tracker/common-tracker-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker component tests', () => {
  let commonTrackerPage: CommonTrackerPage
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let componentsPage: ComponentsPage
  let componentsDetailsPage: ComponentsDetailsPage

  test.beforeEach(async ({ page }) => {
    commonTrackerPage = new CommonTrackerPage(page)
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    componentsPage = new ComponentsPage(page)
    componentsDetailsPage = new ComponentsDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('create-component-issue', async ({ page }) => {
    await commonTrackerPage.navigateToComponents(PlatformURI)
    const componentName = 'component-' + generateId()
    await commonTrackerPage.createComponent(componentName)
    await page.locator('#btnPClose').click()
    await fillSearch(page, componentName)
    await commonTrackerPage.createIssueForComponent(componentName)
  })

  test('Edit a component', async ({ page }) => {
    const newComponent: NewComponent = {
      name: `Edit component test create-${generateId()}`,
      description: 'Edit component test description create',
      lead: 'Dirak Kainin'
    }
    const editComponent: NewComponent = {
      name: `Edit component test update-${generateId()}`,
      description: 'Edit component test description update',
      lead: 'Appleseed John'
    }
    await trackerNavigationMenuPage.openComponentsForProject('Default')
    await componentsPage.createNewComponent(newComponent)
    await componentsPage.openComponentByName(newComponent.name)
    await componentsDetailsPage.checkComponent(newComponent)
    await componentsDetailsPage.editComponent(editComponent)
    await trackerNavigationMenuPage.openComponentsForProject('Default')
    await componentsPage.openComponentByName(editComponent.name)
    await componentsDetailsPage.checkComponent(editComponent)
  })

  test('Delete a component', async () => {
    const newComponent: NewComponent = {
      name: 'Delete component test',
      description: 'Delete component test description'
    }

    await trackerNavigationMenuPage.openComponentsForProject('Default')
    await componentsPage.openComponentByName(newComponent.name)
    await componentsDetailsPage.checkComponent(newComponent)
    await componentsDetailsPage.deleteComponent()
    await componentsPage.checkComponentNotExist(newComponent.name)
  })
})
