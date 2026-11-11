//
// Copyright © 2026 Hardcore Engineering Inc.
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

import core, { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
import { getMetadata, type IntlString, setMetadata, translate } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import { getCurrentLocation, languageStore, type Location, locationToUrl } from '@hcengineering/ui'
import workbench, { type Application, workbenchId } from '@hcengineering/workbench'
import { get } from 'svelte/store'

// Registration belongs to the mounted Workbench, not the resource module: public
// guest pages also load resources but have no tab shell. Never cache a positive
// capability across account, connection, workspace or shell changes.
export function registerWorkbenchTabNavigation (): () => void {
  // Profile edits replace the account object. UUID plus connection/session/token
  // identify authentication; role and application access are checked live below.
  const accountUuid = getCurrentAccount()?.uuid
  const client = getClient()
  const model = client.getModel()
  const workspace = getCurrentLocation().path[1]
  const sessionId = getMetadata(presentation.metadata.SessionId)
  const token = getMetadata(presentation.metadata.Token)
  const workspaceUuid = getMetadata(presentation.metadata.WorkspaceUuid)
  let mounted = true

  const canOpen = (loc: Location): boolean => {
    const current = getCurrentLocation()
    const me = getCurrentAccount()
    if (
      !mounted ||
      me == null ||
      me.uuid !== accountUuid ||
      !hasAccountRole(me, AccountRole.Guest) ||
      getClient() !== client ||
      getClient().getModel() !== model ||
      getMetadata(presentation.metadata.SessionId) !== sessionId ||
      getMetadata(presentation.metadata.Token) !== token ||
      getMetadata(presentation.metadata.WorkspaceUuid) !== workspaceUuid ||
      workspace === undefined ||
      workspace.length === 0 ||
      current.path[0] !== workbenchId ||
      current.path[1] !== workspace ||
      loc.path[0] !== workbenchId ||
      loc.path[1] !== workspace ||
      loc.path[2] === undefined
    ) {
      return false
    }

    const app = model.findAllSync<Application>(workbench.class.Application, { alias: loc.path[2] })[0]
    return app !== undefined && (app.accessLevel === undefined || hasAccountRole(me, app.accessLevel))
  }

  setMetadata(presentation.metadata.OpenInNewTab, workbench.function.OpenInNewTab)
  setMetadata(presentation.metadata.CanOpenInNewTab, canOpen)
  return () => {
    mounted = false
    // An older shell's teardown must not clear a newer shell's registration.
    if (getMetadata(presentation.metadata.CanOpenInNewTab) === canOpen) {
      setMetadata(presentation.metadata.CanOpenInNewTab, undefined)
    }
  }
}

// Keep the write bound to the initiating shell/client/account even when metadata
// or translation is slow. Pending reads may finish after invalidation, but must
// never create a tab for a replacement session or resume the browser default.
export async function openWorkbenchTab (
  loc: Location,
  loadData: (loc: Location, client: ReturnType<typeof getClient>) => Promise<{ name?: string, label: IntlString }>
): Promise<void> {
  const canOpen = getMetadata(presentation.metadata.CanOpenInNewTab)
  if (canOpen?.(loc) !== true) return
  const client = getClient()
  const accountUuid = getCurrentAccount().uuid
  const isCurrent = (): boolean => getMetadata(presentation.metadata.CanOpenInNewTab) === canOpen && canOpen(loc)

  const data = await loadData(loc, client)
  if (!isCurrent()) return
  const name = data.name ?? (await translate(data.label, {}, get(languageStore)))
  if (!isCurrent()) return
  await client.createDoc(workbench.class.WorkbenchTab, core.space.Workspace, {
    attachedTo: accountUuid,
    location: locationToUrl(loc),
    isPinned: false,
    name
  })
}
