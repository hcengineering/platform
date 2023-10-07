//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import builder, { migrateOperations, version } from '@hcengineering/model-all'
import { randomBytes } from 'crypto'
import { Db, MongoClient } from 'mongodb'
import accountPlugin, { getAccount, getMethods, getWorkspace } from '..'
import { setMetadata } from '@hcengineering/platform'

const DB_NAME = 'test_accounts'

const methods = getMethods(version, builder().getTxes(), migrateOperations)

describe('server', () => {
  const dbUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
  let conn: MongoClient
  let db: Db
  let workspace: string = 'ws-' + randomBytes(8).toString('hex')

  beforeAll(async () => {
    setMetadata(accountPlugin.metadata.SES_URL, '')
    conn = await MongoClient.connect(dbUri)
  })
  beforeEach(async () => {
    const olddb = conn.db(DB_NAME)
    await olddb.dropDatabase()
    db = conn.db(DB_NAME)
    await db.collection('account').createIndex({ email: 1 }, { unique: true })
    await db.collection('workspace').createIndex({ workspace: 1 }, { unique: true })
  })

  it('should create workspace', async () => {
    const request: any = {
      method: 'createWorkspace',
      params: [workspace, 'ООО Рога и Копыта']
    }

    const result = await methods.createWorkspace(db, '', request)
    expect(result.result).toBeDefined()
    workspace = result.result as string
  })

  it('should create account', async () => {
    const request: any = {
      method: 'createAccount',
      params: ['andrey2', '123']
    }

    const result = await methods.createAccount(db, '', request)
    expect(result.result).toBeDefined()
  })

  it('should not create, duplicate account', async () => {
    await methods.createAccount(db, '', {
      method: 'createAccount',
      params: ['andrey', '123']
    })

    const request: any = {
      method: 'createAccount',
      params: ['andrey', '123']
    }

    const result = await methods.createAccount(db, '', request)
    expect(result.error).toBeDefined()
  })

  it('should login', async () => {
    await methods.createAccount(db, '', {
      method: 'createAccount',
      params: ['andrey', '123']
    })
    await methods.createWorkspace(db, '', {
      method: 'createWorkspace',
      params: [workspace, 'ООО Рога и Копыта']
    })
    await methods.assignWorkspace(db, '', {
      method: 'assignWorkspace',
      params: ['andrey', workspace]
    })

    const request: any = {
      method: 'login',
      params: ['andrey', '123', workspace]
    }

    const result = await methods.login(db, '', request)
    expect(result.result).toBeDefined()
  })

  it('should not login, wrong password', async () => {
    const request: any = {
      method: 'login',
      params: ['andrey', '123555', workspace]
    }

    const result = await methods.login(db, '', request)
    expect(result.error).toBeDefined()
  })

  it('should not login, unknown user', async () => {
    const request: any = {
      method: 'login',
      params: ['andrey1', '123555', workspace]
    }

    const result = await methods.login(db, '', request)
    expect(result.error).toBeDefined()
  })

  it('should not login, wrong workspace', async () => {
    const request: any = {
      method: 'login',
      params: ['andrey', '123', 'non-existent-workspace']
    }

    const result = await methods.login(db, '', request)
    expect(result.error).toBeDefined()
  })

  it('do remove workspace', async () => {
    await methods.createAccount(db, '', {
      method: 'createAccount',
      params: ['andrey', '123']
    })
    await methods.createWorkspace(db, '', {
      method: 'createWorkspace',
      params: [workspace, 'ООО Рога и Копыта']
    })
    await methods.assignWorkspace(db, '', {
      method: 'assignWorkspace',
      params: ['andrey', workspace]
    })

    // Check we had one
    expect((await getAccount(db, 'andrey'))?.workspaces.length).toEqual(1)
    expect((await getWorkspace(db, '', workspace))?.accounts.length).toEqual(1)

    await methods.removeWorkspace(db, '', {
      method: 'removeWorkspace',
      params: ['andrey', workspace]
    })
    expect((await getAccount(db, 'andrey'))?.workspaces.length).toEqual(0)
    expect((await getWorkspace(db, '', workspace))?.accounts.length).toEqual(0)
  })

  afterAll(async () => {
    await conn.close()
  })
})
