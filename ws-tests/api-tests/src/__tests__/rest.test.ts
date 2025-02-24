//
// Copyright © 2025 Hardcore Engineering Inc.
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
  createRestClient,
  createRestTxOperations,
  getWorkspaceToken,
  type RestClient,
  type WorkspaceToken
} from '@hcengineering/api-client'
import core, { generateId, type Space, type TxCreateDoc, type TxOperations } from '@hcengineering/core'

import chunter from '@hcengineering/chunter'
import contact from '@hcengineering/contact'

describe('rest-api-server', () => {
  const wsName = 'api-tests'
  let apiWorkspace1: WorkspaceToken
  let apiWorkspace2: WorkspaceToken

  beforeAll(async () => {
    apiWorkspace1 = await getWorkspaceToken('http://localhost:8083', {
      email: 'user1',
      password: '1234',
      workspace: wsName
    })

    apiWorkspace2 = await getWorkspaceToken('http://localhost:8083', {
      email: 'user1',
      password: '1234',
      workspace: wsName + '-cr'
    })
  })

  async function connect (ws?: WorkspaceToken): Promise<RestClient> {
    const tok = ws ?? apiWorkspace1
    return await createRestClient(tok.endpoint, tok.workspaceId, tok.token)
  }

  async function connectTx (ws?: WorkspaceToken): Promise<TxOperations> {
    const tok = ws ?? apiWorkspace1
    return await createRestTxOperations(tok.endpoint, tok.workspaceId, tok.token)
  }

  it('get account', async () => {
    const conn = await connect()
    const account = await conn.getAccount()

    expect(account.email).toBe('user1')
    expect(account.role).toBe('USER')
    expect(account._class).toBe(contact.class.PersonAccount)
    expect(account.space).toBe(core.space.Model)
    expect(account.modifiedBy).toBe(core.account.System)
    expect(account.createdBy).toBe(core.account.System)
    expect(typeof account.modifiedOn).toBe('number')
    expect(typeof account.createdOn).toBe('number')
  })

  it('find spaces', async () => {
    const conn = await connect()
    const spaces = await conn.findAll(core.class.Space, {})
    expect(spaces.length).toBeGreaterThanOrEqual(20)
    const personSpace = spaces.find((it) => it.name === 'Pesonal space' && it.private)
    expect(personSpace).not.toBeNull()
  })

  it('find spaces limit', async () => {
    const conn = await connect()
    const spaces = await conn.findAll(core.class.Space, {}, { limit: 5 })
    expect(spaces.length).toBe(5)
  })
  it('find spaces by-name', async () => {
    const conn = await connect()
    const spaces = await conn.findAll(
      contact.class.PersonSpace,
      { name: 'Personal space' },
      {
        lookup: {
          person: contact.class.Person
        }
      }
    )
    expect(spaces.length).toBe(1)
    expect(spaces[0].name).toBe('Personal space')
    expect(spaces[0].$lookup?.person?.name).toBe('Appleseed,John')
  })

  it('find channels', async () => {
    const conn = await connect()
    const spaces = await conn.findAll(chunter.class.Channel, {})
    expect(spaces.length).toBeGreaterThanOrEqual(2)
    expect(spaces.find((it) => it._id === 'chunter:space:General')).not.toBeNull()
  })

  it('find avg', async () => {
    const conn = await connect()
    await checkFindPerformance(conn) // 5ms max per operation
  })

  it('find avg-europe', async () => {
    const conn = await connect(apiWorkspace2)
    await checkFindPerformance(conn) // 5ms max per operation
  })

  it('add space', async () => {
    const conn = await connect()
    const account = await conn.getAccount()
    const spaceName = generateId()
    const tx: TxCreateDoc<Space> = {
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      _id: generateId(),
      objectSpace: core.space.Model,
      modifiedBy: account._id,
      modifiedOn: Date.now(),
      attributes: {
        name: spaceName,
        description: '',
        private: false,
        archived: false,
        members: [],
        autoJoin: false
      },
      objectClass: core.class.Space,
      objectId: generateId()
    }
    await conn.tx(tx)
    const spaces = await conn.findAll(core.class.Space, {})
    expect(spaces.filter((it) => it.name === spaceName).length).toBe(1)
  })

  it('get-model', async () => {
    const conn = await connect()
    const { hierarchy, model } = await conn.getModel()

    const dsc = hierarchy.getDescendants(core.class.Space)
    expect(dsc.length).toBe(32)
    expect(model.getObject(core.class.Space)).not.toBeNull()
  })

  it('tx-client', async () => {
    const conn = await connectTx()

    const employee = await conn.findAll(contact.mixin.Employee, {}, { limit: 5 })

    expect(employee.length).toBeGreaterThanOrEqual(1)
    expect(employee[0].active).toBe(true)
  })
})
async function checkFindPerformance (conn: RestClient): Promise<void> {
  let ops = 0
  let total = 0
  const attempts = 1000
  for (let i = 0; i < attempts; i++) {
    const st = performance.now()
    const spaces = await conn.findAll(core.class.Space, {})
    expect(spaces.length).toBeGreaterThanOrEqual(22)
    const ed = performance.now()
    ops++
    total += ed - st
  }
  const avg = total / ops
  // console.log('ops:', ops, 'total:', total, 'avg:', )
  expect(ops).toEqual(attempts)
  expect(avg).toBeLessThan(5)
}
