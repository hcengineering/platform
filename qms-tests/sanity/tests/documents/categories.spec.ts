import { test } from '@playwright/test'
import { attachScreenshot, generateId, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { DocumentStatus, NewCategory, NewTemplate, UpdateCategory } from '../model/types'
import { allure } from 'allure-playwright'
import { CategoriesPage } from '../model/documents/categories-page'
import { CategoryDetailsPage } from '../model/documents/category-details-page'
import { prepareCategoryStep } from './common-documents-steps'
import { NavigationMenuPage } from '../model/documents/navigation-menu-page'
import { TemplatesPage } from '../model/documents/templates-page'
import { DocumentContentPage } from '../model/documents/document-content-page'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. Categories tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-131. Create a new category', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new category')
    await allure.tms('TESTS-131', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-131')
    const newCategory: NewCategory = {
      title: `New category-${generateId()}`,
      code: `CODE-${generateId(4)}`,
      description: `New category description-${generateId()}`,
      attachFileName: 'cat.jpeg'
    }

    await prepareCategoryStep(page, newCategory)

    await test.step('2. Check category information', async () => {
      const categoriesPage = new CategoriesPage(page)
      await categoriesPage.openCategory(newCategory.title)

      const categoryDetailsPage = new CategoryDetailsPage(page)
      await categoryDetailsPage.checkTitle(newCategory.title)
    })

    await attachScreenshot('TESTS-131_create_category.png', page)
  })

  test('TESTS-132. Edit a Category', async ({ page }) => {
    await allure.description('Requirement\nUsers need to edit a category')
    await allure.tms('TESTS-132', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-132')
    const editCategory: NewCategory = {
      title: `Edit category-${generateId()}`,
      code: `EDIT-${generateId(4)}`,
      description: `Edit category description-${generateId()}`
    }
    const updatedEditCategory: UpdateCategory = {
      description: `Updated edit category description-${generateId()}`,
      attachFileName: 'cat.jpeg'
    }

    await prepareCategoryStep(page, editCategory)

    await test.step('2. Edit Description and add Attachments', async () => {
      const categoriesPage = new CategoriesPage(page)
      await categoriesPage.openCategory(editCategory.title)

      const categoryDetailsPage = new CategoryDetailsPage(page)
      await categoryDetailsPage.checkCategory(editCategory)
      await categoryDetailsPage.editCategory(updatedEditCategory)
    })

    await test.step('3. Check category information', async () => {
      const categoryDetailsPage = new CategoryDetailsPage(page)
      await categoryDetailsPage.checkCategory({
        ...editCategory,
        ...updatedEditCategory
      })
    })

    await attachScreenshot('TESTS-132_edit_category.png', page)
  })

  test('TESTS-133. Delete Category', async ({ page }) => {
    await allure.description('Requirement\nUsers need to delete category')
    await allure.tms('TESTS-133', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-133')
    const editCategory: NewCategory = {
      title: `Delete category-${generateId()}`,
      code: `DELETE-${generateId(4)}`,
      description: `Delete category description-${generateId()}`
    }

    await prepareCategoryStep(page, editCategory)

    await test.step('2. Delete a Category', async () => {
      const categoriesPage = new CategoriesPage(page)
      await categoriesPage.openCategory(editCategory.title)

      const categoryDetailsPage = new CategoryDetailsPage(page)
      await categoryDetailsPage.checkCategory(editCategory)
      await categoryDetailsPage.executeMoreAction('Delete')
    })

    await test.step('3. Check category doesn’t exist', async () => {
      const categoriesPage = new CategoriesPage(page)
      await categoriesPage.checkCategoryNotExist(editCategory.title)
    })

    await attachScreenshot('TESTS-133_delete_category.png', page)
  })

  test('TESTS-215. Can not Delete Category if there are templates associated', async ({ page }) => {
    await allure.description('Requirement\nUsers can not delete the category if there are templates associated')
    await allure.tms('TESTS-215', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-215')
    const canNotDeleteCategory: NewCategory = {
      title: `Can not Delete category-${generateId()}`,
      code: `CANT_DELETE-${generateId(4)}`,
      description: `Can not Delete category description-${generateId()}`
    }
    const canNotDeleteCategoryTemplate: NewTemplate = {
      location: {
        space: 'Quality documents',
        parent: 'Quality documents'
      },
      title: `Can not Delete Category Template-${generateId()}`,
      description: `Can not Delete Category Template description-${generateId()}`,
      code: generateId(4),
      category: canNotDeleteCategory.title,
      reason: 'Test reason',
      reviewers: ['Appleseed John'],
      approvers: ['Appleseed John']
    }

    await prepareCategoryStep(page, canNotDeleteCategory)

    await test.step('2. Create new templates to the category', async () => {
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.buttonTemplates.click()

      const templatesPage = new TemplatesPage(page)
      await templatesPage.buttonCreateTemplate.click()

      await templatesPage.createTemplate(canNotDeleteCategoryTemplate)

      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentTitle(canNotDeleteCategoryTemplate.title)
      await documentContentPage.checkDocument({
        type: 'N/A',
        category: canNotDeleteCategoryTemplate.category ?? '',
        version: 'v0.1',
        status: DocumentStatus.DRAFT,
        owner: 'Appleseed John',
        author: 'Appleseed John'
      })
    })

    await test.step('3. Try to Delete a Category', async () => {
      const navigationMenuPage = new NavigationMenuPage(page)
      await navigationMenuPage.buttonCategories.click()

      const categoriesPage = new CategoriesPage(page)
      await categoriesPage.openCategory(canNotDeleteCategory.title)

      const categoryDetailsPage = new CategoryDetailsPage(page)
      await categoryDetailsPage.checkCategory(canNotDeleteCategory)
      await categoryDetailsPage.checkMoreActionNotExist('Delete')
    })

    await attachScreenshot('TESTS-215_can_not_delete_category.png', page)
  })
})
