import { test } from '@playwright/test'
import { attachScreenshot, generateId, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { DocumentStatus, NewTemplate } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { NavigationMenuPage } from '../model/documents/navigation-menu-page'
import { TemplatesPage } from '../model/documents/templates-page'
import { allure } from 'allure-playwright'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. Templates tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-129. Create Template', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new template')
    await allure.tms('TESTS-129', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-129')
    const newTemplate: NewTemplate = {
      location: {
        space: 'Quality documents',
        parent: 'Quality documents'
      },
      title: `New Template-${generateId()}`,
      description: `New Template description-${generateId()}`,
      code: generateId(4),
      category: 'Document-Control',
      reason: 'Test reason',
      reviewers: ['Appleseed John'],
      approvers: ['Appleseed John']
    }

    await test.step('1. Create a new template', async () => {
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.buttonTemplates.click()

      const templatesPage = new TemplatesPage(page)
      await templatesPage.buttonCreateTemplate.click()

      await templatesPage.createTemplate(newTemplate)
    })

    await test.step('2. Check document information', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentTitle(newTemplate.title)
      await documentContentPage.checkDocument({
        type: 'N/A',
        category: newTemplate.category ?? '',
        version: 'v0.1',
        status: DocumentStatus.DRAFT,
        owner: 'Appleseed John',
        author: 'Appleseed John'
      })
    })

    await attachScreenshot('TESTS-129_create_template.png', page)
  })

  test('TESTS-181. Delete template', async ({ page }) => {
    await allure.description('Requirement\nUsers need to delete the template')
    await allure.tms('TESTS-181', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-181')
    const deleteTemplate: NewTemplate = {
      title: `Delete Template-${generateId()}`,
      description: `Delete Template description-${generateId()}`,
      code: generateId(4),
      location: {
        space: 'Quality documents',
        parent: 'Quality documents'
      }
    }

    const documentContentPage = new DocumentContentPage(page)
    await test.step('1. Create a new template', async () => {
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.buttonTemplates.click()

      const templatesPage = new TemplatesPage(page)
      await templatesPage.buttonCreateTemplate.click()

      await templatesPage.createTemplate(deleteTemplate)
      await documentContentPage.checkDocumentTitle(deleteTemplate.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
    })

    await test.step('2. Delete the template', async () => {
      await documentContentPage.executeMoreActions('Delete')
    })

    await test.step('3. Check that the document status is equal to the deleted', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.DELETED)
    })
    await attachScreenshot('TESTS-181_delete_template.png', page)
  })
})
