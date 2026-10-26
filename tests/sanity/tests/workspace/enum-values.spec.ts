import { expect, type Locator, type Page, test } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignUpPage } from '../model/signup-page'
import { UserProfilePage } from '../model/profile/user-profile-page'
import { ButtonType, WorkspaceSettingsPage } from '../model/workspace/workspace-settings-page'
import { generateId } from '../utils'

const tableSelector = '.hulyComponent-content__column.content .hulyTableAttr-container'
const rowSelector = '.options > button.hulyTableAttr-content__row'

async function expectSavedOptions (page: Page, enumTitle: string, values: string[]): Promise<void> {
  // A second reader must see the write before reloading the editor. The local
  // input alone is optimistic and cannot serve as a persistence assertion.
  const reader = await page.context().newPage()
  try {
    await reader.goto(page.url())
    await reader
      .locator('button.enum__list-item')
      .filter({ has: reader.getByText(enumTitle, { exact: true }) })
      .click()
    const inputs = reader
      .locator(tableSelector)
      .locator(rowSelector)
      .getByPlaceholder('Enter option title', { exact: true })
    await expect(inputs).toHaveCount(values.length)
    for (const [index, value] of values.entries()) {
      await expect(inputs.nth(index)).toHaveValue(value)
    }
  } finally {
    await reader.close()
  }
}

test.describe('Inline enum values', () => {
  let enumTitle: string
  let table: Locator
  let inputs: Locator
  let rows: Locator
  const original = ['First', 'Second']

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.clickSignUp()
    await new SignUpPage(page).signUp({
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    })
    await new SelectWorkspacePage(page).createWorkspace(`Enum checks ${generateId(8)}`)
    const profile = new UserProfilePage(page)
    await profile.openProfileMenu()
    await profile.clickSettings()
    await new WorkspaceSettingsPage(page).selectWorkspaceSettingsTab(ButtonType.Enums)
    enumTitle = `Enum ${generateId(8)}`
    await page.getByRole('button', { name: 'Create enum', exact: true }).click()
    const modal = page.locator('.hulyModal-container.type-popup').filter({
      has: page.getByPlaceholder('Enum title', { exact: true })
    })
    await modal.getByPlaceholder('Enum title', { exact: true }).fill(enumTitle)
    await modal.locator('.hulyTableAttr-header .buttons-group > button').nth(1).click()
    const addInput = modal.locator('.options > div.hulyTableAttr-content__row').getByPlaceholder('Enter option title')
    for (const option of original) {
      await addInput.fill(option)
      await addInput.press('Enter')
    }
    await modal.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(modal).toHaveCount(0)
    await page
      .locator('button.enum__list-item')
      .filter({ has: page.getByText(enumTitle, { exact: true }) })
      .click()
    table = page.locator(tableSelector)
    rows = table.locator(rowSelector)
    inputs = rows.getByPlaceholder('Enter option title', { exact: true })
    await expect(inputs.first()).toHaveValue(original[0])
  })

  for (const kind of ['empty', 'duplicate']) {
    for (const submit of ['Enter', 'Tab', 'click']) {
      test(`${kind} feedback survives ${submit} and focus on another option`, async ({ page }) => {
        await inputs.first().fill(kind === 'empty' ? '   ' : ` ${original[1]} `)
        if (submit !== 'click') await inputs.first().press(submit)
        await inputs.nth(1).click()
        await expect(table.getByRole('alert')).toContainText(
          kind === 'empty' ? 'An option cannot be empty.' : 'An option with this title already exists.'
        )
        await expect(inputs.first()).toHaveValue(original[0])
        await expect(inputs.nth(1)).toBeFocused()
        // Focus alone retains the error; actual input clears it and a valid save persists.
        await inputs.nth(1).fill(' Corrected ')
        await expect(table.getByRole('alert')).toHaveCount(0)
        await inputs.nth(1).press('Enter')
        await inputs.first().click()
        await expect(inputs.nth(1)).toHaveValue('Corrected')
        await expectSavedOptions(page, enumTitle, [original[0], 'Corrected'])
        await page.reload()
        await page
          .locator('button.enum__list-item')
          .filter({ has: page.getByText(enumTitle, { exact: true }) })
          .click()
        await expect(inputs.first()).toHaveValue(original[0])
        await expect(inputs.nth(1)).toHaveValue('Corrected')
      })
    }
  }

  test('canceled native drag restores the order before the next text save', async ({ page }) => {
    const first = await rows.first().boundingBox()
    const second = await rows.last().boundingBox()
    if (first === null || second === null) throw new Error('Missing enum row bounds')
    await page.mouse.move(first.x + 12, first.y + first.height / 2)
    await page.mouse.down()
    await page.mouse.move(second.x + 12, second.y + second.height * 0.8, { steps: 10 })
    await page.mouse.move(second.x + 12, second.y + second.height * 0.8)
    await expect(inputs.first()).toHaveValue(original[1])
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(inputs.first()).toHaveValue(original[0])
    await expect(inputs.nth(1)).toHaveValue(original[1])
    await inputs.nth(1).fill('Corrected')
    await inputs.nth(1).press('Enter')
    await expectSavedOptions(page, enumTitle, [original[0], 'Corrected'])
    await page.reload()
    await page
      .locator('button.enum__list-item')
      .filter({ has: page.getByText(enumTitle, { exact: true }) })
      .click()
    await expect(inputs.first()).toHaveValue(original[0])
    await expect(inputs.nth(1)).toHaveValue('Corrected')
  })

  test('native drop survives dragend and reload', async ({ page }) => {
    const first = await rows.first().boundingBox()
    const second = await rows.last().boundingBox()
    if (first === null || second === null) throw new Error('Missing enum row bounds')
    await rows.first().dragTo(rows.last(), {
      sourcePosition: { x: 12, y: first.height / 2 },
      targetPosition: { x: 12, y: second.height * 0.8 }
    })
    await expect(inputs.first()).toHaveValue(original[1])
    await expect(inputs.nth(1)).toHaveValue(original[0])
    await expectSavedOptions(page, enumTitle, [original[1], original[0]])
    await page.reload()
    await page
      .locator('button.enum__list-item')
      .filter({ has: page.getByText(enumTitle, { exact: true }) })
      .click()
    await expect(inputs.first()).toHaveValue(original[1])
    await expect(inputs.nth(1)).toHaveValue(original[0])
  })
})
