import { type Locator, type Page } from '@playwright/test'

export enum ButtonType {
  General,
  Owners,
  Spaces,
  TextTemplate,
  RelatedIssues,
  Classes,
  Enums,
  InviteSettings
}

export class WorkspaceSettingsPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  general = (): Locator => this.page.getByRole('button', { name: 'General' })
  owners = (): Locator => this.page.getByRole('button', { name: 'Owners' })
  spaces = (): Locator => this.page.getByRole('button', { name: 'Spaces', exact: true })
  textTemplate = (): Locator => this.page.getByRole('button', { name: 'Text Templates' })
  relatedIssues = (): Locator => this.page.getByRole('button', { name: 'Related issues' })
  classes = (): Locator => this.page.locator('#navGroup-setting').getByRole('button', { name: 'Classes' })
  enums = (): Locator => this.page.getByRole('button', { name: 'Enums' })
  inviteSettings = (): Locator => this.page.getByRole('button', { name: 'Invite settings' })

  async selectWorkspaceSettingsTab (button: ButtonType): Promise<void> {
    switch (button) {
      case ButtonType.General:
        await this.general().click()
        break
      case ButtonType.Owners:
        await this.owners().click()
        break
      case ButtonType.Spaces:
        await this.spaces().click()
        break
      case ButtonType.TextTemplate:
        await this.textTemplate().click()
        break
      case ButtonType.RelatedIssues:
        await this.relatedIssues().click()
        break
      case ButtonType.Classes:
        await this.classes().click()
        break
      case ButtonType.Enums:
        await this.enums().click()
        break
      case ButtonType.InviteSettings:
        await this.inviteSettings().click()
        break
      default:
        throw new Error('Unknown button type')
    }
  }
}
