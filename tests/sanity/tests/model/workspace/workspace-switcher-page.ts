//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { expect, type Locator, type Page } from '@playwright/test'

export class WorkspaceSwitcherPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  logo = (): Locator => this.page.locator('.logo-container')
  workspaceRow = (workspaceName: string): Locator =>
    this.page.locator('button.ap-menuItem').filter({ hasText: workspaceName }).first()

  unreadMarker = (workspaceName: string): Locator => this.workspaceRow(workspaceName).locator('.workspaceAvatar-unread')

  async open (): Promise<void> {
    await this.logo().click()
    await expect(this.page.locator('button.ap-menuItem').first()).toBeVisible()
  }

  async close (): Promise<void> {
    await this.page.keyboard.press('Escape')
    await expect(this.page.locator('button.ap-menuItem')).toHaveCount(0)
  }

  async switchTo (workspaceName: string): Promise<void> {
    await this.open()
    await this.workspaceRow(workspaceName).click()
    await expect(this.logo()).toBeVisible()
  }

  /**
   * The switcher re-fetches workspaces (and their hasUnread flags) on every open,
   * while the server raises/clears the flag asynchronously, so reopen until the
   * expected state shows up.
   */
  async expectUnread (workspaceName: string, unread: boolean, timeout = 60000): Promise<void> {
    await expect(async () => {
      await this.open()
      try {
        if (unread) {
          await expect(this.unreadMarker(workspaceName)).toBeVisible({ timeout: 2000 })
        } else {
          await expect(this.workspaceRow(workspaceName)).toBeVisible({ timeout: 2000 })
          await expect(this.unreadMarker(workspaceName)).toHaveCount(0, { timeout: 2000 })
        }
      } finally {
        await this.close()
      }
    }).toPass({ timeout, intervals: [1000, 2000, 5000] })
  }
}
