import { expect, test } from '@playwright/test'
import { navigate } from './tracker.utils'
import { generateId, PlatformSetting, PlatformURI, fillSearch } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { ComponentsPage } from '../model/tracker/components-page'
import { NewComponent } from '../model/tracker/types'
import { ComponentsDetailsPage } from '../model/tracker/component-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker component tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('create-component-issue', async ({ page }) => {
    await page.click('[id="app-tracker\\:string\\:TrackerApplication"]')

    await navigate(page)
    await page.click('text=Components')
    await expect(page).toHaveURL(
      `${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/components`
    )
    await page.click('button:has-text("Component")')
    await page.click('[placeholder="Component\\ name"]')
    const componentName = 'component-' + generateId()
    await page.fill('[placeholder="Component\\ name"]', componentName)

    await page.click('button:has-text("Create component")')

    await fillSearch(page, componentName)

    await page.click(`text=${componentName}`)
    await page.click('button:has-text("New issue")')
    await page.fill('[placeholder="Issue\\ title"]', 'issue')
    await page.click('form button:has-text("Component")')
    await page.click(`.selectPopup button:has-text("${componentName}")`)
    await page.click('form button:has-text("Create issue")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openComponentsForProject('Default')

    const componentsPage = new ComponentsPage(page)
    await componentsPage.createNewComponent(newComponent)
    await componentsPage.openComponentByName(newComponent.name)

    const componentsDetailsPage = new ComponentsDetailsPage(page)
    await componentsDetailsPage.checkComponent(newComponent)

    await componentsDetailsPage.editComponent(editComponent)
    await trackerNavigationMenuPage.openComponentsForProject('Default')

    await componentsPage.openComponentByName(editComponent.name)
    await componentsDetailsPage.checkComponent(editComponent)
  })

  test('Delete a component', async ({ page }) => {
    const newComponent: NewComponent = {
      name: 'Delete component test',
      description: 'Delete component test description'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openComponentsForProject('Default')

    const componentsPage = new ComponentsPage(page)
    await componentsPage.openComponentByName(newComponent.name)

    const componentsDetailsPage = new ComponentsDetailsPage(page)

    await componentsDetailsPage.checkComponent(newComponent)
    await componentsDetailsPage.deleteComponent()

    await componentsPage.checkComponentNotExist(newComponent.name)
  })
})
