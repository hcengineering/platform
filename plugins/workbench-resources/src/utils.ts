//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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

import { getClient as getAccountClient } from '@hcengineering/account-client'
import type {
  Account,
  Class,
  Client,
  Doc,
  ModulePermissionGroup,
  Ref,
  Space,
  TxOperations,
  WorkspaceInfoWithStatus
} from '@hcengineering/core'
import core, { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
import login from '@hcengineering/login'
import { getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation, { closeClient, getClient, setPresentationCookie } from '@hcengineering/presentation'
import {
  closePanel,
  getCurrentLocation,
  type Location,
  location,
  navigate,
  setMetadataLocalStorage
} from '@hcengineering/ui'
import view from '@hcengineering/view'
import workbench, { type Application, type NavigatorModel } from '@hcengineering/workbench'
import { derived, get, writable } from 'svelte/store'

export const workspaceCreating = writable<number | undefined>(undefined)

export function getSpecialSpaceClass (model: NavigatorModel): Array<Ref<Class<Space>>> {
  const spaceResult = model.spaces.map((x) => x.spaceClass)
  const result = (model.specials ?? [])
    .map((it) => it.spaceClass)
    .filter((it) => it !== undefined && !spaceResult.includes(it))
  return spaceResult.concat(result as Array<Ref<Class<Space>>>)
}

export async function getSpaceName (client: Client, space: Space): Promise<string> {
  const hierarchy = client.getHierarchy()
  const clazz = hierarchy.getClass(space._class)
  const nameMixin = hierarchy.as(clazz, view.mixin.SpaceName)

  if (nameMixin?.getName !== undefined) {
    const getSpaceName = await getResource(nameMixin.getName)
    const name = await getSpaceName(client, space)

    return name
  }

  return space.name
}

/**
 * @public
 */
export async function doNavigate (
  doc: Doc | Doc[],
  evt: Event | undefined,
  props: {
    mode: 'app' | 'special' | 'space'
    application?: string
    special?: string
    spaceSpecial?: string
    space?: Ref<Space>
    // If no space is selected, select first space from list
    spaceClass?: Ref<Class<Space>>
    query?: Record<string, string | null>
  }
): Promise<void> {
  evt?.preventDefault()

  closePanel()
  const loc = getCurrentLocation()
  const client = getClient()
  switch (props.mode) {
    case 'app':
      loc.path[2] = props.application ?? ''
      if (props.special !== undefined) {
        loc.path[3] = props.special
        loc.path.length = 4
      } else {
        loc.path.length = 3
      }
      loc.query = props.query
      loc.fragment = undefined
      navigate(loc)
      break
    case 'special':
      if (props.application !== undefined && loc.path[2] !== props.application) {
        loc.path[2] = props.application
      }
      loc.path[3] = props.special ?? ''
      loc.path.length = 4
      loc.query = props.query
      loc.fragment = undefined
      navigate(loc)
      break
    case 'space': {
      if (props.space !== undefined) {
        loc.path[3] = props.space
      } else {
        if (doc !== undefined && !Array.isArray(doc) && client.getHierarchy().isDerived(doc._class, core.class.Space)) {
          loc.path[3] = doc._id
        }
      }
      if (props.spaceSpecial !== undefined) {
        loc.path[4] = props.spaceSpecial
      }
      if (props.spaceClass !== undefined) {
        const ex = await client.findOne(props.spaceClass, { _id: loc.path[3] as Ref<Space> })
        if (ex === undefined) {
          const r = await client.findOne(props.spaceClass, {})
          if (r !== undefined) {
            loc.path[3] = r._id
          }
        }
      }
      loc.path.length = 5
      loc.query = props.query
      loc.fragment = undefined
      navigate(loc)

      break
    }
  }
}

export function isAllowedToRole (role: AccountRole | undefined, acc: Account): boolean {
  if (role === undefined) return true
  return hasAccountRole(acc, role)
}

export function isModuleDisabledForAccount (group: ModulePermissionGroup, account: Account): boolean {
  if (group.enabled ?? true) {
    return false
  }
  if (account.role === group.role) {
    return true
  }
  // DocGuest should also respect Guest module disables.
  return account.role === AccountRole.DocGuest && group.role === AccountRole.Guest
}

export async function hideApplication (app: Application): Promise<void> {
  const client = getClient()

  await client.createDoc(workbench.class.HiddenApplication, core.space.Workspace, {
    attachedTo: app._id
  })
}

export async function showApplication (app: Application): Promise<void> {
  const client = getClient()

  const current = await client.findOne(workbench.class.HiddenApplication, { attachedTo: app._id })
  if (current !== undefined) {
    await client.remove(current)
  }
}

export const workspacesStore = writable<WorkspaceInfoWithStatus[]>([])

// Inbox unread state of the current workspace (used instead of the server hasUnread flag).
export const currentWorkspaceHasInboxUnread = writable<boolean>(false)
export const locationWorkspaceStore = derived(location, (loc: Location) => loc.path[1])
export const currentWorkspaceStore = derived(
  [workspacesStore, locationWorkspaceStore],
  ([$workspaces, $locationWorkspace]) => {
    return $workspaces.find((it) => it.url === $locationWorkspace)
  }
)

/**
 * True when the account has unread notifications in some workspace other than
 * the one currently open. Single source of truth for the cross-workspace unread
 * indicator across the switcher, the workbench logo, and the desktop badge.
 */
export const hasCrossWorkspaceUnread = derived(
  [workspacesStore, locationWorkspaceStore],
  ([$workspaces, $locationWorkspace]) =>
    $workspaces.some((ws) => ws.hasUnread === true && ws.url !== $locationWorkspace)
)

/**
 * Re-fetches the account's workspaces (including their per-workspace hasUnread
 * flag) into workspacesStore. Called on workspace change, window focus and a
 * periodic poll so the cross-workspace indicator reflects the server without a
 * relogin, since the flag is raised server-side in workspaces the client isn't
 * connected to.
 */
export async function refreshWorkspaces (): Promise<void> {
  try {
    const getWorkspacesFn = await getResource(login.function.GetWorkspaces)
    workspacesStore.set(await getWorkspacesFn())
  } catch (err) {
    console.error('Failed to refresh workspaces', err)
  }
}

/**
 * @public
 */
export async function buildNavModel (
  client: TxOperations,
  currentApplication?: Application
): Promise<NavigatorModel | undefined> {
  let newNavModel = currentApplication?.navigatorModel
  if (currentApplication !== undefined) {
    const models = await client.findAll(workbench.class.ApplicationNavModel, { extends: currentApplication._id })
    for (const nm of models) {
      const spaces = newNavModel?.spaces ?? []
      // Check for extending
      for (const sp of spaces) {
        const extend = (nm.spaces ?? []).find((p) => p.id === sp.id)
        if (extend !== undefined) {
          sp.label = sp.label ?? extend.label
          sp.createComponent = sp.createComponent ?? extend.createComponent
          sp.addSpaceLabel = sp.addSpaceLabel ?? extend.addSpaceLabel
          sp.icon = sp.icon ?? extend.icon
          sp.visibleIf = sp.visibleIf ?? extend.visibleIf
          sp.specials = [...(sp.specials ?? []), ...(extend.specials ?? [])]
        }
      }
      const newSpaces = (nm.spaces ?? []).filter((it) => !spaces.some((sp) => sp.id === it.id))
      newNavModel = {
        spaces: [...spaces, ...newSpaces],
        specials: [...(newNavModel?.specials ?? []), ...(nm.specials ?? [])]
      }
    }
  }
  return newNavModel
}

export async function logIn (loginInfo: { account: string, token?: string }): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  await getAccountClient(accountsUrl, loginInfo.token).setCookie()

  setMetadata(presentation.metadata.Token, loginInfo.token)
  setMetadataLocalStorage(login.metadata.LastAccount, loginInfo.account)
  setMetadataLocalStorage(login.metadata.LoginAccount, loginInfo.account)
}

/**
 * Self-service clear of the cross-workspace "unread notifications" flag for the
 * current account in the current workspace. Called once the local inbox has no
 * more unread notifications left. Setting the flag back to true is handled
 * server-side (OnInboxNotificationCreate trigger), not by the client.
 */
export async function reportWorkspaceRead (): Promise<void> {
  try {
    const accountsUrl = getMetadata(login.metadata.AccountsUrl)
    const token = getMetadata(presentation.metadata.Token)
    if (token === undefined) return
    await getAccountClient(accountsUrl, token).setWorkspaceMemberUnread(getCurrentAccount().uuid, false)
    // Optimistically clear the flag locally so switching away and back reflects
    // the read state immediately, without waiting for the next refresh.
    const currentUrl = get(locationWorkspaceStore)
    workspacesStore.update((wss) => wss.map((ws) => (ws.url === currentUrl ? { ...ws, hasUnread: false } : ws)))
  } catch (err) {
    console.error('Failed to clear workspace unread flag', err)
  }
}

export async function logOut (): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  try {
    await getAccountClient(accountsUrl).deleteCookie()
  } catch (error) {}

  const currentWorkspace = getMetadata(presentation.metadata.WorkspaceUuid)
  if (currentWorkspace !== undefined) {
    setPresentationCookie('', currentWorkspace)
  }

  setMetadata(presentation.metadata.Token, null)
  setMetadata(presentation.metadata.WorkspaceUuid, null)
  setMetadata(presentation.metadata.WorkspaceDataId, null)
  setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
  setMetadataLocalStorage(login.metadata.LoginAccount, null)

  void closeClient()
}
