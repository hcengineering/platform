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

import {
  getClient as getAccountClient,
  type AccountClient,
  type WorkspaceLoginInfo
} from '@hcengineering/account-client'
import type { ClientFactory } from '@hcengineering/client'
import {
  AccountRole,
  type AccountUuid,
  type Client,
  type Doc,
  type Hierarchy,
  type WithLookup,
  type WorkspaceUuid
} from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import { decodeTokenPayload } from '@hcengineering/presentation'
import { getCurrentLocation, type Location } from '@hcengineering/ui'
import { connect, disconnect } from './connect'

jest.mock('@hcengineering/account-client', () => ({ getClient: jest.fn() }))
jest.mock('@hcengineering/platform', () => ({
  ...jest.requireActual('@hcengineering/platform'),
  getMetadata: jest.fn(),
  getResource: jest.fn(),
  setMetadata: jest.fn()
}))
jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { metadata: { Token: 'token' } },
  decodeTokenPayload: jest.fn(),
  setPresentationCookie: jest.fn(),
  setClient: jest.fn(),
  refreshClient: jest.fn()
}))
jest.mock('@hcengineering/ui', () => ({ getCurrentLocation: jest.fn(), getPanelURI: jest.fn(() => 'panel') }))
jest.mock('@hcengineering/view', () => ({
  __esModule: true,
  default: { mixin: { ObjectPanel: 'object-panel' }, component: { EditDoc: 'edit-doc' } }
}))
jest.mock('svelte/store', () => jest.requireActual('../../../packages/presentation/src/__mocks__/svelte-store'))

describe('print connection', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const browserDocument: Pick<Document, 'title'> = { title: '' }
  const getItem = jest.fn<string | null, [string]>()
  const removeItem = jest.fn<undefined, [string]>()
  const storage: Pick<Storage, 'getItem' | 'removeItem'> = { getItem, removeItem }
  let document: Partial<Doc> | undefined
  const findOne = jest.fn<Promise<Partial<Doc> | undefined>, unknown[]>(async () => document)
  const hierarchy: Partial<Hierarchy> = { classHierarchyMixin: jest.fn(() => undefined) }
  const client: Partial<Client> = {
    close: jest.fn(async () => {}),
    findOne: async <T extends Doc>(...args: unknown[]): Promise<WithLookup<T> | undefined> => {
      const result = await findOne(...args)
      return result as WithLookup<T> | undefined
    },
    getHierarchy: () => hierarchy as Hierarchy
  }
  const factory = jest.fn<ReturnType<ClientFactory>, Parameters<ClientFactory>>()
  const selectWorkspace = jest.fn<Promise<WorkspaceLoginInfo>, [string]>()
  const accounts: Partial<AccountClient> = { selectWorkspace, getSocialIds: jest.fn(async () => []) }
  const workspaceInfo: WorkspaceLoginInfo = {
    account: 'account' as AccountUuid,
    workspace: 'workspace' as WorkspaceUuid,
    workspaceUrl: 'workspace',
    endpoint: 'ws://transactor',
    token: 'workspace-token',
    role: AccountRole.User
  }

  beforeAll(() => {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: browserDocument })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    document = {}
    findOne.mockImplementation(async (_class) => (_class === 'document' ? document : undefined))
    selectWorkspace.mockResolvedValue(workspaceInfo)
    factory.mockReset().mockResolvedValue(client as Client)
    getItem.mockReturnValue('print-token')
    const loc: Location = { path: ['print', 'workspace'], query: { objectClass: 'document', objectId: 'document-id' } }
    jest.mocked(getCurrentLocation).mockReturnValue(loc)
    jest.mocked(getMetadata).mockImplementation((key) => (key === 'token' ? 'session-token' : undefined))
    jest.mocked(decodeTokenPayload).mockReturnValue({ extra: { readonly: 'true' } })
    jest.mocked(getAccountClient).mockReturnValue(accounts as AccountClient)
    jest.mocked(getResource).mockResolvedValue(factory)
  })

  afterEach(async () => {
    await disconnect()
  })

  afterAll(() => {
    if (storageDescriptor !== undefined) Object.defineProperty(globalThis, 'sessionStorage', storageDescriptor)
    else Reflect.deleteProperty(globalThis, 'sessionStorage')
    if (documentDescriptor !== undefined) Object.defineProperty(globalThis, 'document', documentDescriptor)
    else Reflect.deleteProperty(globalThis, 'document')
  })

  it('consumes the injected token and prepares the document panel', async () => {
    await expect(connect('Platform')).resolves.toEqual({ path: ['print', 'workspace'], fragment: 'panel' })
    expect(removeItem).toHaveBeenCalledWith('print-token')
    expect(getAccountClient).toHaveBeenCalledWith(undefined, 'print-token')
    expect(selectWorkspace).toHaveBeenCalledWith('workspace')
    expect(getResource).toHaveBeenCalledWith('edit-doc')
    expect(findOne).toHaveBeenCalledWith('document', { _id: 'document-id' })
  })

  it('rejects an unrestricted injected token instead of using the existing session', async () => {
    jest.mocked(decodeTokenPayload).mockReturnValue({ extra: {} })
    await expect(connect('Platform')).rejects.toThrow('injected tokens must be read-only')
    expect(selectWorkspace).not.toHaveBeenCalled()
    expect(removeItem).toHaveBeenCalledWith('print-token')
  })

  it('rejects a guest token', async () => {
    jest.mocked(decodeTokenPayload).mockReturnValue({ extra: { guest: 'true', readonly: 'true' } })
    await expect(connect('Platform')).rejects.toThrow('requires a user token')
    expect(selectWorkspace).not.toHaveBeenCalled()
  })

  it('allows the ordinary session token for browser debugging', async () => {
    getItem.mockReturnValue(null)
    jest.mocked(decodeTokenPayload).mockReturnValue({ extra: {} })
    await connect('Platform')
    expect(getAccountClient).toHaveBeenCalledWith(undefined, 'session-token')
  })

  it('allows workspace selection to use the existing cookie without an explicit token', async () => {
    getItem.mockReturnValue(null)
    jest.mocked(getMetadata).mockReturnValue(undefined)
    await connect('Platform')
    expect(getAccountClient).toHaveBeenCalledWith(undefined, undefined)
    expect(decodeTokenPayload).not.toHaveBeenCalled()
  })

  it('rejects a missing document target before connecting', async () => {
    const loc: Location = { path: ['print', 'workspace'] }
    jest.mocked(getCurrentLocation).mockReturnValue(loc)
    await expect(connect('Platform')).rejects.toThrow('Print session is missing')
    expect(selectWorkspace).not.toHaveBeenCalled()
  })

  it('rejects an inaccessible document', async () => {
    document = undefined
    await expect(connect('Platform')).rejects.toThrow('Document is not accessible')
  })

  it('closes a connection that completes after the print page was closed', async () => {
    let complete: ((value: Client) => void) | undefined
    let starting: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      starting = resolve
    })
    factory.mockImplementationOnce(async () => {
      starting?.()
      return await new Promise((resolve) => {
        complete = resolve
      })
    })
    const pending = connect('Platform')
    await started
    await disconnect()
    complete?.(client as Client)
    await expect(pending).rejects.toThrow('Print session was closed')
    expect(client.close).toHaveBeenCalled()
    expect(findOne).not.toHaveBeenCalledWith('document', { _id: 'document-id' })
  })
})
