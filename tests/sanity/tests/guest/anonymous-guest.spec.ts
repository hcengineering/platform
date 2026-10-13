/**

Copyright © 2026 TraceX SAS.

Licensed under the PolyForm Shield License 1.0.0 (the "License");
you may not use this file except in compliance with the License. You may
obtain a copy of the License at https://polyformproject.org/licenses/shield/1.0.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.
*/

import core, { readOnlyGuestAccountUuid, type Class, type Doc, type Ref, type Space } from '@hcengineering/core'
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'
import { ApiEndpoint } from '../API/Api'
import { WorkspaceRestClient } from '../API/WorkspaceRestClient'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { NewProjectPage } from '../model/tracker/new-project-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { prepareNewIssueWithOpenStep } from '../tracker/common-steps'
import { generateProjectId } from '../tracker/tracker.utils'
import { generateId, PlatformURI, PlatformUser, PlatformWs, setTestOptions, waitForNetworIdle } from '../utils'
import { connectOwnerRest, FORBIDDEN, openAsOwner, OWNER_PASSWORD, withRequest, type OpenedPage } from './guest-utils'

// Class ids are spelled out: the sanity tests do not depend on the tracker and contact plugins.
const ISSUE = 'tracker:class:Issue' as Ref<Class<IssueDoc>>
const PROJECT = 'tracker:class:Project' as Ref<Class<Space>>
const PERSON = 'contact:class:Person' as Ref<Class<PersonDoc>>
const PROJECT_PREFERENCE = 'tracker:class:ProjectTargetPreference' as Ref<Class<ProjectPreferenceDoc>>
const EMPLOYEE_MIXIN = 'contact:mixin:Employee'

interface IssueDoc extends Doc {
  title: string
}

interface ProjectPreferenceDoc extends Doc {
  attachedTo: Ref<Space>
}

interface PersonDoc extends Doc {
  personUuid?: string
  [EMPLOYEE_MIXIN]?: { active?: boolean }
}

/** Status shown in the top bar for the anonymous (read-only) guest: `platform:status:ReadOnlyAccount`. */
const ANONYMOUS_STATUS = 'Anonymous Guest'
const ANONYMOUS_ACCESS_ROW = 'Allows anonymous users to visit your workspace in read-only mode'

/**
 * Basic scenarios of an anonymous guest: a visitor without an account who opens a workspace through
 * "Continue as a guest" or a direct link. The workspace owner turns anonymous access on in the settings,
 * and only spaces the anonymous guest is a member of are visible to it. Rejections are also checked
 * through the transactor REST API: a read-only UI proves nothing about the server.
 *
 * Anonymous access is a workspace-wide switch of the shared sanity-ws, so the last test turns it off again
 * (with an API fallback in afterAll).
 */
test.describe('Anonymous guest', () => {
  test.describe.configure({ mode: 'serial' })

  const sharedProject = `Anon-shared-${generateProjectId()}`
  const hiddenProject = `Anon-hidden-${generateProjectId()}`
  const sharedIssueTitle = `Anonymous shared issue-${generateId()}`
  const hiddenIssueTitle = `Anonymous hidden issue-${generateId()}`

  let sharedIssue: IssueDoc
  let sharedIssueUrl = ''

  test.beforeAll(async ({ browser, playwright }) => {
    // Settings, two projects and two issues through the UI: more than a single test budget.
    test.setTimeout(300_000)

    const { page, context } = await openAsOwner(browser)
    try {
      await setAnonymousAccess(page, true)

      await (await page.goto(`${PlatformURI}/workbench/${PlatformWs}/tracker`))?.finished()
      const navigation = new TrackerNavigationMenuPage(page)
      for (const title of [sharedProject, hiddenProject]) {
        await navigation.pressCreateProjectButton()
        await new NewProjectPage(page).createNewProject({
          title,
          identifier: title.slice(-5),
          description: 'Private project for anonymous guest tests',
          private: true,
          members: []
        })
        await navigation.checkProjectExist(title)
      }

      await prepareNewIssueWithOpenStep(page, {
        title: hiddenIssueTitle,
        description: 'Issue in a project the anonymous guest is not a member of',
        projectName: hiddenProject
      })
      // Leave the opened issue, so the second issue starts from the plain issue list.
      await (await page.goto(`${PlatformURI}/workbench/${PlatformWs}/tracker`))?.finished()
      await prepareNewIssueWithOpenStep(page, {
        title: sharedIssueTitle,
        description: 'Issue in a project shared with anonymous guests',
        projectName: sharedProject
      })
      await new IssuesDetailsPage(page).waitDetailsOpened(sharedIssueTitle)
      sharedIssueUrl = page.url()
    } finally {
      await context.close()
    }

    await withRequest(playwright, async (request) => {
      const owner = await connectOwnerRest(request)

      // The settings UI creates the Employee of the anonymous guest; without it the workbench can not connect.
      await expect
        .poll(async () => {
          const person = await owner.findOne(PERSON, { personUuid: readOnlyGuestAccountUuid })
          return person?.[EMPLOYEE_MIXIN]?.active
        })
        .toBe(true)

      const project = await owner.findOne(PROJECT, { name: sharedProject })
      if (project === undefined) throw new Error(`Project "${sharedProject}" was not created`)
      // Same as the "Anonymous guest access" switch of the space settings.
      const share = owner.factory.createTxUpdateDoc(PROJECT, core.space.Space, project._id, {
        $push: { members: readOnlyGuestAccountUuid }
      })
      expect(await owner.tx(share), 'share the project with anonymous guests').toMatchObject({ ok: true })

      const issue = await owner.findOne(ISSUE, { title: sharedIssueTitle })
      if (issue === undefined) throw new Error(`Issue "${sharedIssueTitle}" was not created`)
      sharedIssue = issue
    })
  })

  test.afterAll(async ({ playwright }) => {
    // Normally done by the last test through the UI; keeps sanity-ws closed for anonymous guests if it failed.
    await withRequest(playwright, async (request) => {
      await new ApiEndpoint(request).setAllowReadOnlyGuests(PlatformUser, OWNER_PASSWORD, PlatformWs, false)
    })

    // The projects are created through the UI, so the "New issue" popup remembers the last of them as the default
    // project (ProjectTargetPreference). Left behind, they redirect issues created by the other tracker specs,
    // which do not pick a project, away from "Default". Remove them together with that preference.
    await withRequest(playwright, async (request) => {
      const owner = await connectOwnerRest(request)
      for (const name of [sharedProject, hiddenProject]) {
        const project = await owner.findOne(PROJECT, { name })
        if (project === undefined) continue
        for (const pref of await owner.findAll(PROJECT_PREFERENCE, { attachedTo: project._id })) {
          await owner.tx(owner.factory.createTxRemoveDoc(PROJECT_PREFERENCE, pref.space, pref._id))
        }
        await owner.tx(owner.factory.createTxRemoveDoc(PROJECT, core.space.Space, project._id))
      }
    })
  })

  /**
   * Turns the workspace-wide anonymous access on or off in Settings > Access management > Anonymous guest.
   * Idempotent: a retry may find the switch already in the wanted state.
   */
  async function setAnonymousAccess (page: Page, enabled: boolean): Promise<void> {
    // Opened through the menu: a direct `/setting/accessControl` link leaves the settings panel empty.
    await (await page.goto(`${PlatformURI}/workbench/${PlatformWs}/setting`))?.finished()
    await page.getByRole('button', { name: 'Access management', exact: true }).click()
    await page.waitForURL((url) => url.pathname.endsWith('/setting/accessControl'))
    await page.getByRole('button', { name: 'Anonymous guest', exact: true }).click()

    const row = page.locator('div.guestAccessRow', { hasText: ANONYMOUS_ACCESS_ROW })
    const toggle = row.locator('input[type="checkbox"]')
    // Enabled once the workspace info is loaded and the owner rights are known.
    await expect(toggle).toBeEnabled()
    if ((await toggle.isChecked()) !== enabled) {
      // The checkbox itself is visually hidden by the Toggle component: click its label.
      await row.locator('label.toggle').click()
    }
    await expect(toggle).toBeChecked({ checked: enabled })
    // Switching on also creates the Employee of the anonymous guest: let the client finish it.
    await waitForNetworIdle(page)
  }

  /** A fresh browser without any stored account: an unauthenticated visitor. */
  async function openAsVisitor (browser: Browser): Promise<OpenedPage> {
    const context = await browser.newContext()
    const page = await context.newPage()
    return { page, context }
  }

  /** Enters sanity-ws through the "Continue as a guest" link of the login page. */
  async function continueAsGuest (browser: Browser): Promise<OpenedPage> {
    const { page, context } = await openAsVisitor(browser)
    await (await page.goto(`${PlatformURI}/login/login`))?.finished()
    await new LoginPage(page).linkContinueAsGuest().click()

    const selectWorkspace = new SelectWorkspacePage(page)
    await expect(selectWorkspace.title()).toBeVisible()
    await selectWorkspace.selectWorkspace(PlatformWs)
    await page.waitForURL((url) => url.pathname.startsWith(`/workbench/${PlatformWs}`))
    await setTestOptions(page)
    return { page, context }
  }

  function anonymousStatus (page: Page): Locator {
    return page.locator('div.status-info', { hasText: ANONYMOUS_STATUS })
  }

  test('Visitor enters the workspace with "Continue as a guest"', async ({ browser }) => {
    const { page, context } = await continueAsGuest(browser)
    try {
      await expect(anonymousStatus(page)).toBeVisible()
      await expect(new LoginPage(page).profileButton()).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Anonymous guest sees only the spaces shared with anonymous guests', async ({ browser, playwright }) => {
    const { page, context } = await continueAsGuest(browser)
    try {
      await (await page.goto(`${PlatformURI}/workbench/${PlatformWs}/tracker`))?.finished()
      const navigation = new TrackerNavigationMenuPage(page)
      // The positive check waits for the project list, so the negative one runs on a loaded list.
      await navigation.checkProjectExist(sharedProject)
      await navigation.checkProjectNotExist(hiddenProject)
    } finally {
      await context.close()
    }

    await withRequest(playwright, async (request) => {
      const anonymous = await WorkspaceRestClient.connectAnonymous(request, PlatformWs)
      expect(anonymous.account.uuid).toBe(readOnlyGuestAccountUuid)
      expect(await anonymous.findAll(ISSUE, { title: sharedIssueTitle })).toHaveLength(1)
      expect(await anonymous.findAll(ISSUE, { title: hiddenIssueTitle })).toHaveLength(0)
      // Control: the same query finds the hidden issue for the owner.
      const owner = await connectOwnerRest(request)
      expect(await owner.findAll(ISSUE, { title: hiddenIssueTitle })).toHaveLength(1)
    })
  })

  test('Anonymous guest can open an issue only for reading', async ({ browser }) => {
    const { page, context } = await continueAsGuest(browser)
    try {
      await (await page.goto(sharedIssueUrl))?.finished()
      const details = new IssuesDetailsPage(page)
      await expect(details.inputTitle()).toHaveValue(sharedIssueTitle)
      await expect(details.inputTitle()).toBeDisabled()
    } finally {
      await context.close()
    }
  })

  test('Server rejects any change from an anonymous guest', async ({ playwright }) => {
    await withRequest(playwright, async (request) => {
      const anonymous = await WorkspaceRestClient.connectAnonymous(request, PlatformWs)
      const owner = await connectOwnerRest(request)

      const update = await anonymous.tx(
        anonymous.factory.createTxUpdateDoc(ISSUE, sharedIssue.space, sharedIssue._id, {
          title: `Renamed by an anonymous guest ${generateId(8)}`
        })
      )
      expect(update.ok, 'update an issue of a shared project').toBe(false)
      expect(update.error).toContain(FORBIDDEN)
      expect((await owner.findOne(ISSUE, { _id: sharedIssue._id }))?.title).toBe(sharedIssueTitle)

      const remove = await anonymous.tx(anonymous.factory.createTxRemoveDoc(ISSUE, sharedIssue.space, sharedIssue._id))
      expect(remove.ok, 'remove an issue of a shared project').toBe(false)
      expect(remove.error).toContain(FORBIDDEN)
      expect(await owner.findAll(ISSUE, { _id: sharedIssue._id })).toHaveLength(1)
    })
  })

  test('Direct workspace link opens for a visitor without logging in', async ({ browser }) => {
    const { page, context } = await openAsVisitor(browser)
    try {
      await (await page.goto(sharedIssueUrl))?.finished()
      await expect(new IssuesDetailsPage(page).inputTitle()).toHaveValue(sharedIssueTitle)
      await expect(anonymousStatus(page)).toBeVisible()
      expect(new URL(page.url()).pathname.startsWith('/login')).toBe(false)
    } finally {
      await context.close()
    }
  })

  test('Anonymous guest is offered to log in instead of signing out', async ({ browser }) => {
    const { page, context } = await continueAsGuest(browser)
    try {
      const loginPage = new LoginPage(page)
      await loginPage.openProfileMenu()
      await expect(loginPage.popupItemButton('Create workspace')).toBeVisible()
      await expect(loginPage.popupItemButton('Sign out')).toHaveCount(0)

      await loginPage.popupItemButton('Log In').click()
      await page.waitForURL((url) => url.pathname.startsWith('/login'))
      await expect(loginPage.inputEmail()).toBeVisible()
      await expect(loginPage.linkContinueAsGuest()).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Turning anonymous access off closes the workspace for visitors', async ({ browser, playwright }) => {
    const owner = await openAsOwner(browser)
    try {
      await setAnonymousAccess(owner.page, false)
    } finally {
      await owner.context.close()
    }

    await withRequest(playwright, async (request) => {
      await expect(new ApiEndpoint(request).getAnonymousWorkspaceLoginInfo(PlatformWs)).rejects.toThrow()
    })

    // A direct link now leads to the login page.
    const visitor = await openAsVisitor(browser)
    try {
      await (await visitor.page.goto(sharedIssueUrl))?.finished()
      await visitor.page.waitForURL((url) => url.pathname.startsWith('/login'))
      await expect(new LoginPage(visitor.page).linkContinueAsGuest()).toBeVisible()

      // "Continue as a guest" still works, but sanity-ws is no longer listed.
      await new LoginPage(visitor.page).linkContinueAsGuest().click()
      const selectWorkspace = new SelectWorkspacePage(visitor.page)
      await expect(selectWorkspace.title()).toBeVisible()
      // Either the remaining workspaces with anonymous access or the "Sign Up" button for none.
      await expect(visitor.page.locator('div.form div.workspace, div.form-row.send button').first()).toBeVisible()
      await expect(selectWorkspace.workspaceButtonByName(PlatformWs)).toHaveCount(0)
    } finally {
      await visitor.context.close()
    }
  })
})
