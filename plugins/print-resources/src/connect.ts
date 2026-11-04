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

import { getClient as getAccountClient } from '@hcengineering/account-client'
import clientPlugin from '@hcengineering/client'
import contact, { setCurrentEmployee, setCurrentEmployeeSpace, type Employee } from '@hcengineering/contact'
import core, {
  AccountRole,
  type Class,
  type Doc,
  ClientConnectEvent,
  pickPrimarySocialId,
  setCurrentAccount,
  versionToString,
  type Account,
  type Client,
  type PersonId,
  type Ref,
  type Version
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation, {
  decodeTokenPayload,
  refreshClient,
  setClient,
  setPresentationCookie
} from '@hcengineering/presentation'
import { getCurrentLocation, getPanelURI, type Location } from '@hcengineering/ui'
import view from '@hcengineering/view'
import { writable } from 'svelte/store'

export const versionError = writable<string | undefined>(undefined)
export const connectionError = writable(false)
let activeClient: Client | undefined
let activeToken: string | undefined
async function connectWorkspace (title: string, workspace: string, token?: string): Promise<Client> {
  connectionError.set(false)
  versionError.set(undefined)
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const accounts = getAccountClient(accountsUrl, token)
  const info = await accounts.selectWorkspace(workspace)
  const selectedToken = info.token
  if (activeClient !== undefined && activeToken === selectedToken) return activeClient
  await closeWorkspace()

  setMetadata(presentation.metadata.Token, selectedToken)
  setMetadata(presentation.metadata.WorkspaceUuid, info.workspace)
  setMetadata(presentation.metadata.WorkspaceDataId, info.workspaceDataId)
  setMetadata(presentation.metadata.WorkspaceName, info.name ?? info.workspaceUrl)
  setMetadata(presentation.metadata.Endpoint, info.endpoint)
  setPresentationCookie(selectedToken, info.workspace)

  const socialIds =
    info.role === AccountRole.DocGuest ? [] : await getAccountClient(accountsUrl, selectedToken).getSocialIds(true)
  const account: Account = {
    uuid: info.account,
    role: info.role,
    primarySocialId: socialIds.length === 0 ? ('' as PersonId) : pickPrimarySocialId(socialIds)._id,
    socialIds: socialIds.map((id) => id._id),
    fullSocialIds: socialIds
  }
  setCurrentAccount(account)
  setCurrentEmployee('' as Ref<Employee>)

  const factory = await getResource(clientPlugin.function.GetClient)
  let connected = false
  const client = await factory(selectedToken, info.endpoint, {
    onHello: (version?: string) => {
      const expected = getMetadata(presentation.metadata.FrontVersion)
      if (
        expected !== undefined &&
        expected !== '' &&
        version !== undefined &&
        version !== '' &&
        expected !== version
      ) {
        versionError.set('Client and server versions do not match')
        return false
      }
      return true
    },
    onUpgrade: () => {
      versionError.set('Workspace upgrade interrupted the session')
    },
    onError: () => {
      connectionError.set(true)
    },
    onConnect: async (event: ClientConnectEvent, _lastTx: string | undefined, sessionId: unknown) => {
      if (event === ClientConnectEvent.Connected || event === ClientConnectEvent.Reconnected) {
        if (typeof sessionId === 'string') setMetadata(presentation.metadata.SessionId, sessionId)
        if (connected && event === ClientConnectEvent.Connected) await refreshClient(true)
        connected = true
      } else if (event === ClientConnectEvent.Refresh) {
        await refreshClient(true)
      } else if (event === ClientConnectEvent.Upgraded) {
        versionError.set('Workspace upgrade interrupted the session')
      }
    }
  })
  activeClient = client
  activeToken = selectedToken

  try {
    const required = getMetadata(presentation.metadata.ModelVersion)
    const version = await client.findOne<Version>(core.class.Version, {})
    if (required !== undefined && required !== '' && (version === undefined || versionToString(version) !== required)) {
      versionError.set('Workspace model version does not match')
      throw new Error('Workspace model version does not match')
    }
    if (account.role !== AccountRole.DocGuest) {
      const employee = await client.findOne(contact.mixin.Employee, { personUuid: info.account })
      if (employee !== undefined) {
        setCurrentEmployee(employee._id)
        const space = await client.findOne(contact.class.PersonSpace, { person: employee._id })
        if (space !== undefined) setCurrentEmployeeSpace(space._id)
      }
    }
    await setClient(client)
    document.title = [workspace, title].filter((value) => value !== '').join(' - ')
    return client
  } catch (error) {
    connectionError.set(true)
    await closeWorkspace()
    throw error
  }
}

/** Dispose the lightweight workspace, optionally only if it still belongs to the supplied client. */
async function closeWorkspace (expectedClient?: Client): Promise<void> {
  if (expectedClient !== undefined && activeClient !== expectedClient) return
  const client = activeClient
  activeClient = undefined
  activeToken = undefined
  if (client !== undefined) await client.close()
}

let generation = 0

/** Authenticate the print session and prepare the selected document route. */
export async function connect (title: string): Promise<Location> {
  const request = ++generation
  const loc = getCurrentLocation()
  const printToken = sessionStorage.getItem('print-token')
  sessionStorage.removeItem('print-token')
  const token = printToken ?? getMetadata(presentation.metadata.Token)
  const workspace = loc.path[1]
  const objectId = loc.query?.objectId
  const objectClass = loc.query?.objectClass
  if (
    workspace == null ||
    workspace === '' ||
    objectId == null ||
    objectId === '' ||
    objectClass == null ||
    objectClass === ''
  ) {
    throw new Error('Print session is missing')
  }
  if (token !== undefined) {
    const payload = decodeTokenPayload(token)
    if (payload.extra?.guest === 'true' || (printToken !== null && payload.extra?.readonly !== 'true')) {
      throw new Error('Print session requires a user token; injected tokens must be read-only')
    }
  }
  const connected = await connectWorkspace(title, workspace, token)
  if (request !== generation) {
    await closeWorkspace(connected)
    throw new Error('Print session was closed')
  }
  const _class = objectClass as Ref<Class<Doc>>
  const _id = objectId as Ref<Doc>
  const doc = await connected.findOne(_class, { _id })
  if (doc === undefined) throw new Error('Document is not accessible')
  const component =
    connected.getHierarchy().classHierarchyMixin(_class, view.mixin.ObjectPanel)?.component ?? view.component.EditDoc
  await getResource(component)
  if (request !== generation) throw new Error('Print session was closed')
  const target: Location = { path: ['print', workspace], fragment: getPanelURI(component, _id, _class, 'content') }
  return target
}

/** Close the print session and dispose a connection that may still be opening. */
export async function disconnect (): Promise<void> {
  generation++
  await closeWorkspace()
}
