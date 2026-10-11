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

import card, { type CardSpace, type MasterTag } from '@hcengineering/card'
import core, { type Client, type MeasureContext, type PersonUuid, type Ref, type WorkspaceUuid } from '@hcengineering/core'
import { type FormConfiguration } from '@hcengineering/forms'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { createClient } from '@hcengineering/server-client'
import guest from '@hcengineering/guest'
import type { Express, Request, Response } from 'express'
import { registerFormsRoutes } from '../forms'

jest.mock('@hcengineering/account-client', () => ({ getClient: jest.fn() }))
jest.mock('@hcengineering/server-client', () => ({ createClient: jest.fn() }))
jest.mock('../forms-author', () => ({ ensureFormAuthor: jest.fn(async () => {}) }))
jest.mock('@hcengineering/server-token', () => ({
  generateToken: () => 'system-token',
  decodeToken: () => ({ account: 'account' })
}))

const workspace = 'workspace' as WorkspaceUuid
const type = { _id: 'card-type', _class: card.class.MasterTag, label: 'Type' } as MasterTag
const space = {
  _id: 'space', _class: card.class.CardSpace, archived: false, types: [type._id]
} as CardSpace
const title = {
  _id: 'title', label: 'Title', type: { _class: core.class.TypeString }, name: 'title'
}
const configuration = {
  _id: 'form-one', _class: 'forms:class:FormConfiguration', masterTag: type._id,
  enabled: true, targetSpace: space._id, mode: 'public'
} as FormConfiguration

function setup (current: FormConfiguration | undefined = configuration, member = false, accessible = [space]) {
  const hierarchy = {
    findClass: () => type,
    isMixin: () => false,
    isDerived: (child: string, parent: string) => child === parent || (child === type._id && parent === card.class.Card),
    getAllAttributes: () => new Map([['title', title]]),
    findDomain: () => 'card',
    classHierarchyMixin: () => undefined
  }
  const service = {
    getHierarchy: () => hierarchy,
    findOne: jest.fn(async (_class, query) => {
      if (_class === guest.class.PublicLink) return { _id: query._id, attachedTo: query.attachedTo, url: '' }
      return current?._id === query._id ? current : undefined
    }),
    findAll: jest.fn(async () => [space]),
    close: jest.fn(async () => {}),
    tx: jest.fn().mockResolvedValue({ success: true, serverTime: 0 })
  }
  const user = {
    ...service, findAll: jest.fn(async () => accessible), close: jest.fn(async () => {}),
    tx: jest.fn().mockResolvedValue({ success: true, serverTime: 0 })
  }
  const systemAccounts = {
    selectWorkspace: jest.fn(async () => ({ workspace, token: 'system-workspace', endpoint: 'service', workspaceUrl: 'slug' }))
  }
  const userAccounts = {
    getLoginInfoByToken: jest.fn(async () => ({ account: 'account' })),
    isReadOnlyGuest: jest.fn(async () => false),
    getSocialIds: jest.fn(async () => [{
      _id: 'email-id', type: 'email', value: 'member@example.com', verifiedOn: 123
    }]),
    getPerson: jest.fn(async () => ({ uuid: 'account' as PersonUuid, firstName: 'Member', lastName: 'Name' })),
    getUserWorkspaces: jest.fn(async () => member ? [{ uuid: workspace }] : []),
    selectWorkspace: jest.fn(async () => ({ workspace, token: 'user-workspace', endpoint: 'user', workspaceUrl: 'slug' }))
  }
  jest.mocked(getAccountClient).mockImplementation((_, token) =>
    (token === 'system-token' ? systemAccounts : userAccounts) as unknown as ReturnType<typeof getAccountClient>)
  jest.mocked(createClient).mockImplementation(async (endpoint) =>
    (endpoint === 'service' ? service : user) as unknown as Client)
  const routes = new Map<string, (req: Request, res: Response) => void>()
  const app = {
    get: (path: string, handler: (req: Request, res: Response) => void) => routes.set(path, handler),
    post: (path: string, handler: (req: Request, res: Response) => void) => routes.set(path, handler)
  } as unknown as Express
  registerFormsRoutes(app, { error: jest.fn() } as unknown as MeasureContext, { accountsUrl: 'accounts', collaboratorUrl: 'collaborator' })

  async function get (id: string, authenticated = false, method = 'GET'): Promise<{ status: number, body: unknown }> {
    return await new Promise((resolve) => {
      let status = 200
      const response = {
        setHeader: jest.fn(),
        status: (code: number) => { status = code; return response },
        json: (body: unknown) => { resolve({ status, body }); return response }
      } as unknown as Response
      const request = {
        method, ip: '127.0.0.1', params: { workspace: 'slug', form: id },
        body: { requestId: '123456789012345678901234', fields: { title: 'Response' } },
        header: () => authenticated ? 'Bearer member-token' : undefined
      } as unknown as Request
      routes.get('/api/forms/:workspace/:form')?.(request, response)
    })
  }
  return { get, service, user, userAccounts }
}

describe('form instance access', () => {
  it('resolves public schemas by form ID rather than card type ID', async () => {
    const { get } = setup()
    expect(await get(configuration._id)).toMatchObject({ status: 200, body: { id: configuration._id, mode: 'public' } })
    expect(await get(type._id)).toMatchObject({ status: 404 })
  })

  it('allows distinct forms for the same type and does not resolve deleted links to replacements', async () => {
    const second = { ...configuration, _id: 'form-two' as Ref<FormConfiguration> }
    const { get } = setup(second)
    expect(await get(configuration._id)).toMatchObject({ status: 404 })
    expect(await get(second._id)).toMatchObject({ status: 200, body: { id: second._id } })
  })

  it('does not expose a private schema before authentication', async () => {
    const { get, user } = setup({ ...configuration, mode: 'private-fixed' })
    expect(await get(configuration._id)).toEqual({ status: 401, body: { error: 'private_required' } })
    expect(user.findAll).not.toHaveBeenCalled()
  })

  it('rejects a verified account without existing workspace membership', async () => {
    const { get, userAccounts, user } = setup({ ...configuration, mode: 'private-fixed' })
    expect(await get(configuration._id, true)).toMatchObject({ status: 403 })
    expect(userAccounts.selectWorkspace).not.toHaveBeenCalled()
    expect(user.tx).not.toHaveBeenCalled()
  })

  it('loads private forms through the existing workspace member session', async () => {
    const { get, userAccounts, user } = setup({ ...configuration, mode: 'private-fixed' }, true)
    expect(await get(configuration._id, true)).toMatchObject({ status: 200, body: { mode: 'private-fixed' } })
    expect(userAccounts.selectWorkspace).toHaveBeenCalledWith('slug', 'internal')
    expect(user.findAll).toHaveBeenCalledWith(card.class.CardSpace, { archived: false, _id: space._id }, { sort: { _id: 1 } })
  })

  it('rejects fixed private forms when the user cannot access the target space', async () => {
    const { get } = setup({ ...configuration, mode: 'private-fixed' }, true, [])
    expect(await get(configuration._id, true)).toMatchObject({ status: 403 })
  })

  it('searches accessible spaces for automatic private forms without requiring a configured target', async () => {
    const { get, user } = setup({ ...configuration, mode: 'private-auto', targetSpace: undefined }, true)
    expect(await get(configuration._id, true)).toMatchObject({ status: 200, body: { mode: 'private-auto' } })
    expect(user.findAll).toHaveBeenCalledWith(card.class.CardSpace, { archived: false }, { sort: { _id: 1 } })
  })

  it('creates private cards using the member connection and the member author', async () => {
    const { get, user, service } = setup({ ...configuration, mode: 'private-fixed' }, true)
    expect(await get(configuration._id, true, 'POST')).toMatchObject({ status: 200 })
    expect(service.tx).not.toHaveBeenCalled()
    expect(user.tx).toHaveBeenCalledWith(expect.objectContaining({
      txes: expect.arrayContaining([expect.objectContaining({
        objectClass: type._id, objectSpace: space._id, modifiedBy: 'email-id'
      })])
    }))
  })
})
