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

import { faker } from '@faker-js/faker'
import { AccountRole, type Class, type Doc, type Ref } from '@hcengineering/core'
import { expect, test, type Page } from '@playwright/test'
import { ApiEndpoint } from '../API/Api'
import { WorkspaceRestClient } from '../API/WorkspaceRestClient'
import { type SignUpData } from '../model/common-types'
import { InboxPage } from '../model/inbox.ts/inbox-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { WorkspaceSwitcherPage } from '../model/workspace/workspace-switcher-page'
import { createNewIssueData, prepareNewIssueWithOpenStep } from '../tracker/common-steps'
import { generateTestData, PlatformURI, setTestOptions } from '../utils'

test.describe('Cross-workspace unread indicator', () => {
  let api: ApiEndpoint
  let data: { workspaceName: string, userName: string, firstName: string, lastName: string }
  let assignee: SignUpData
  let assigneeWorkspace: string
  let workspaceUrl: string

  async function login (page: Page, email: string, password: string, workspace: string): Promise<void> {
    await (await page.goto(`${PlatformURI}`))?.finished()
    await setTestOptions(page)
    await new LoginPage(page).login(email, password)
    await new SelectWorkspacePage(page).selectWorkspace(workspace)
  }

  // Resolves once the client has cleared the server-side hasUnread flag of the open workspace.
  async function waitForUnreadCleared (page: Page): Promise<void> {
    await page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        (response.request().postData() ?? '').includes('"setWorkspaceMemberUnread"') &&
        response.ok(),
      { timeout: 60000 }
    )
  }

  // Marks all unread inbox notifications of the user as viewed, as reading them in the UI would.
  async function markAllRead (rest: WorkspaceRestClient): Promise<void> {
    const InboxNotification = 'notification:class:InboxNotification' as Ref<Class<Doc>>
    const unread = await rest.findAll(InboxNotification, { user: rest.account.uuid, isViewed: false })
    expect(unread.length).toBeGreaterThan(0)
    for (const n of unread) {
      const res = await rest.tx(rest.factory.createTxUpdateDoc(n._class, n.space, n._id, { isViewed: true } as any))
      expect(res).toMatchObject({ ok: true })
    }
  }

  test.beforeEach(async ({ request }) => {
    data = generateTestData()
    assignee = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    assigneeWorkspace = `ws-${faker.string.alphanumeric(8).toLowerCase()}`

    api = new ApiEndpoint(request)
    await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
    await api.createAccount(assignee.email, assignee.password, assignee.firstName, assignee.lastName)
    const ws = await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
    workspaceUrl = ws.workspaceUrl
    // Created with demo content: the init script leaves the creator an activity
    // notification without its message, which the Inbox never shows.
    await api.createWorkspaceWithLogin(assigneeWorkspace, assignee.email, assignee.password)

    const inviteId = await api.createWorkspaceInvite(data.userName, '1234', ws.workspaceUrl, AccountRole.User)
    await api.joinWorkspace(assignee.email, assignee.password, inviteId, ws.workspaceUrl)
  })

  test('keeps the indicator until notifications are read', async ({ page, browser, request }) => {
    test.setTimeout(240_000)
    const page2 = await browser.newPage()
    try {
      // The assignee's employee is created on the first visit, so open A's workspace once.
      await login(page2, assignee.email, assignee.password, data.workspaceName)
      await expect(new LeftSideMenuPage(page2).profileButton()).toBeVisible()
      const switcher = new WorkspaceSwitcherPage(page2)
      await switcher.switchTo(assigneeWorkspace)

      await login(page, data.userName, '1234', data.workspaceName)

      const newIssue = createNewIssueData(assignee.firstName, assignee.lastName)
      await prepareNewIssueWithOpenStep(page, newIssue, false)
      await new IssuesDetailsPage(page).checkIssue(newIssue)

      await test.step('Indicator appears for the other workspace', async () => {
        await switcher.expectUnread(data.workspaceName, true)
      })

      await test.step('Opening the workspace does not clear the indicator while unread exist', async () => {
        await switcher.switchTo(data.workspaceName)
        // The current workspace reflects its own Inbox state.
        await switcher.expectUnread(data.workspaceName, true)
        await switcher.switchTo(assigneeWorkspace)
        await switcher.expectUnread(data.workspaceName, true)
      })

      await test.step('Reading the notification clears the indicator', async () => {
        await switcher.switchTo(data.workspaceName)
        await new LeftSideMenuPage(page2).clickNotification()
        await new InboxPage(page2).checkIfTaskIsPresentInInbox(newIssue.title)
        const rest = await WorkspaceRestClient.connect(request, assignee.email, assignee.password, workspaceUrl)
        const cleared = waitForUnreadCleared(page2)
        await markAllRead(rest)
        await cleared

        await switcher.expectUnread(data.workspaceName, false)
        await switcher.switchTo(assigneeWorkspace)
        await switcher.expectUnread(data.workspaceName, false)
      })
    } finally {
      await page2.close()
    }
  })

  test('clears the indicator of a workspace whose Inbox is empty', async ({ page }) => {
    test.setTimeout(120_000)
    // The demo-content workspace has an orphaned unread notification, so the
    // server flag is raised although the Inbox is empty.
    const cleared = waitForUnreadCleared(page)
    await login(page, assignee.email, assignee.password, assigneeWorkspace)
    await cleared

    const switcher = new WorkspaceSwitcherPage(page)
    await switcher.switchTo(data.workspaceName)
    await switcher.expectUnread(assigneeWorkspace, false)
  })
})
