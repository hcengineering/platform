import { expect, Page, Locator } from '@playwright/test'

export class SettingsPage {
  readonly page: Page
  readonly profileButton: Locator
  readonly settings: Locator
  readonly defaultDocuments: Locator
  readonly managerRole: Locator
  readonly qaraRole: Locator
  readonly qualifiedUserRole: Locator
  readonly createDocumentPermission: Locator
  readonly addPermissionButton: Locator
  readonly reviewDocumentPermission: Locator
  readonly approveDocumentPermission: Locator
  readonly coAuthorDocumentPermission: Locator
  readonly createDocumentCategoryPermission: Locator
  readonly updateDocumentCategoryPermission: Locator
  readonly deleteDocumentCategoryPermission: Locator
  readonly updateSpacePermission: Locator
  readonly addRoleUpdatePermissionOwner: Locator
  readonly addUpdateDocumentOwnerPermission: Locator

  constructor (page: Page) {
    this.page = page
    this.profileButton = page.locator('#profile-button')
    this.settings = page.getByRole('button', { name: 'Settings' })
    this.defaultDocuments = page.getByRole('button', { name: 'Default Documents Controlled' })
    this.managerRole = page.getByRole('button', { name: 'Manager', exact: true })
    this.qaraRole = page.getByRole('button', { name: 'QARA', exact: true })
    this.qualifiedUserRole = page.getByRole('button', { name: 'Qualified User', exact: true })
    this.createDocumentPermission = page.getByText('Create document', { exact: true })
    this.addPermissionButton = page.locator('.hulyTableAttr-header > .font-medium-14')
    this.reviewDocumentPermission = page.getByText('Review document', { exact: true })
    this.approveDocumentPermission = page.getByText('Approve document', { exact: true })
    this.coAuthorDocumentPermission = page.getByText('Co-author document', { exact: true })
    this.createDocumentCategoryPermission = page.getByText('Create document category', { exact: true })
    this.updateDocumentCategoryPermission = page.getByText('Update document category', { exact: true })
    this.deleteDocumentCategoryPermission = page.getByText('Delete document category', { exact: true })
    this.updateSpacePermission = page.getByText('Update space', { exact: true })
    this.addRoleUpdatePermissionOwner = page.getByRole('button', { name: 'Update document owner' })
    this.addUpdateDocumentOwnerPermission = page.locator('.hulyTableAttr-header > .font-medium-14')
  }

  async openProfileMenu (): Promise<void> {
    await this.profileButton.click()
  }

  async clickSettings (): Promise<void> {
    await this.settings.click()
  }

  async clickDefaultDocuments (): Promise<void> {
    await this.defaultDocuments.click()
  }

  async clickAddPermissionButton (): Promise<void> {
    await this.addPermissionButton.click()
  }

  async clickAddRoleUpdatePermissionOwner (): Promise<void> {
    await this.addRoleUpdatePermissionOwner.click()
  }

  async checkIfPermissionsExist (): Promise<void> {
    await expect(this.reviewDocumentPermission).toBeVisible()
    await expect(this.approveDocumentPermission).toBeVisible()
    await expect(this.coAuthorDocumentPermission).toBeVisible()
    await expect(this.createDocumentCategoryPermission).toBeVisible()
    await expect(this.updateDocumentCategoryPermission).toBeVisible()
    await expect(this.deleteDocumentCategoryPermission).toBeVisible()
    await expect(this.updateSpacePermission).toBeVisible()
  }

  async checkIfAddUpdateDocumentOwnerPermissionIsDisabled (): Promise<void> {
    await expect(this.addUpdateDocumentOwnerPermission).toBeDisabled()
  }

  async checkPermissionsExistQualifyUser (): Promise<void> {
    await expect(this.reviewDocumentPermission).toBeVisible()
    await expect(this.approveDocumentPermission).toBeVisible()
  }

  async chooseRole (role: string): Promise<void> {
    switch (role) {
      case 'Manager':
        await this.managerRole.click()
        break
      case 'QARA':
        await this.qaraRole.click()
        break
      case 'Qualified User':
        await this.qualifiedUserRole.click()
        break
      default:
        throw new Error('Role not found')
    }
  }
}
