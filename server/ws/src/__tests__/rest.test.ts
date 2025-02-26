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

import { generateToken } from '@hcengineering/server-token'

import { createRestClient, createRestTxOperations, type RestClient } from '@hcengineering/api-client'
import core, {
  generateId,
  getWorkspaceId,
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  toFindResult,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type Space,
  type Tx,
  type TxCreateDoc,
  type TxOperations,
  type TxResult
} from '@hcengineering/core'
import { ClientSession, startSessionManager, type TSessionManager } from '@hcengineering/server'
import { createDummyStorageAdapter, type SessionManager, type WorkspaceLoginInfo } from '@hcengineering/server-core'
import { startHttpServer } from '../server_http'
import { genMinModel, test } from './minmodel'

describe('rest-server', () => {
  async function getModelDb (): Promise<{ modelDb: ModelDb, hierarchy: Hierarchy, txes: Tx[] }> {
    const txes = genMinModel()
    const hierarchy = new Hierarchy()
    for (const tx of txes) {
      hierarchy.tx(tx)
    }
    const modelDb = new ModelDb(hierarchy)
    for (const tx of txes) {
      await modelDb.tx(tx)
    }
    return { modelDb, hierarchy, txes }
  }

  let shutdown: () => Promise<void>
  let sessionManager: SessionManager
  const port: number = 11000

  beforeAll(async () => {
    ;({ shutdown, sessionManager } = startSessionManager(new MeasureMetricsContext('test', {}), {
      pipelineFactory: async () => {
        const { modelDb, hierarchy, txes } = await getModelDb()
        return {
          hierarchy,
          modelDb,
          context: {
            workspace: {
              name: 'test-ws',
              workspaceName: 'test-ws',
              workspaceUrl: 'test-ws'
            },
            hierarchy,
            modelDb,
            lastTx: generateId(),
            lastHash: generateId(),
            contextVars: {},
            branding: null
          },
          handleBroadcast: async (ctx) => {},
          findAll: async <T extends Doc>(
            ctx: MeasureContext,
            _class: Ref<Class<T>>,
            query: DocumentQuery<T>,
            options?: FindOptions<T>
          ): Promise<FindResult<T>> => toFindResult(await modelDb.findAll(_class, query, options)),
          tx: async (ctx: MeasureContext, tx: Tx[]): Promise<[TxResult, Tx[], string[] | undefined]> => [
            await modelDb.tx(...tx),
            [],
            undefined
          ],
          close: async () => {},
          domains: async () => hierarchy.domains(),
          groupBy: async () => new Map(),
          find: (ctx: MeasureContext, domain: Domain) => ({
            next: async (ctx: MeasureContext) => undefined,
            close: async (ctx: MeasureContext) => {}
          }),
          load: async (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => [],
          upload: async (ctx: MeasureContext, domain: Domain, docs: Doc[]) => {},
          clean: async (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => {},
          searchFulltext: async (ctx, query, options) => {
            return { docs: [] }
          },
          loadModel: async (ctx, lastModelTx, hash) => ({
            full: true,
            hash: generateId(),
            transactions: txes
          })
        }
      },
      sessionFactory: (token, workspace) => new ClientSession(token, workspace, true),
      port,
      brandingMap: {},
      serverFactory: startHttpServer,
      accountsUrl: '',
      externalStorage: createDummyStorageAdapter()
    }))
    jest
      .spyOn(sessionManager as TSessionManager, 'getWorkspaceInfo')
      .mockImplementation(async (ctx: MeasureContext, token: string): Promise<WorkspaceLoginInfo> => {
        return {
          workspaceId: 'test-ws',
          workspaceUrl: 'test-ws',
          workspaceName: 'Test Workspace',
          uuid: 'test-ws',
          createdBy: 'test-owner',
          mode: 'active',
          createdOn: Date.now(),
          lastVisit: Date.now(),
          disabled: false,
          endpoint: `http://localhost:${port}`,
          region: 'test-region',
          targetRegion: 'test-region',
          backupInfo: {
            dataSize: 0,
            blobsSize: 0,
            backupSize: 0,
            lastBackup: 0,
            backups: 0
          }
        }
      })
  })
  afterAll(async () => {
    await shutdown()
  })

  async function connect (): Promise<RestClient> {
    const token: string = generateToken('user1@site.com', getWorkspaceId('test-ws'))
    return await createRestClient(`http://localhost:${port}`, 'test-ws', token)
  }

  async function connectTx (): Promise<TxOperations> {
    const token: string = generateToken('user1@site.com', getWorkspaceId('test-ws'))
    return await createRestTxOperations(`http://localhost:${port}`, 'test-ws', token)
  }

  it('get account', async () => {
    const conn = await connect()
    const account = await conn.getAccount()

    expect(account.email).toBe('user1@site.com')
    expect(account.role).toBe('OWNER')
    expect(account._id).toBe('User1')
    expect(account._class).toBe('core:class:Account')
    expect(account.space).toBe('core:space:Model')
    expect(account.modifiedBy).toBe('core:account:System')
    expect(account.createdBy).toBe('core:account:System')
    expect(typeof account.modifiedOn).toBe('number')
    expect(typeof account.createdOn).toBe('number')
  })

  it('find spaces', async () => {
    const conn = await connect()
    const spaces = await conn.findAll(core.class.Space, {})
    expect(spaces.length).toBe(2)
    expect(spaces[0].name).toBe('Sp1')
    expect(spaces[1].name).toBe('Sp2')
  })

  it('find avg', async () => {
    const conn = await connect()
    let ops = 0
    let total = 0
    const attempts = 1000
    for (let i = 0; i < attempts; i++) {
      const st = performance.now()
      const spaces = await conn.findAll(core.class.Space, {})
      expect(spaces.length).toBe(2)
      expect(spaces[0].name).toBe('Sp1')
      expect(spaces[1].name).toBe('Sp2')
      const ed = performance.now()
      ops++
      total += ed - st
    }
    const avg = total / ops
    // console.log('ops:', ops, 'total:', total, 'avg:', )
    expect(ops).toEqual(attempts)
    expect(avg).toBeLessThan(5) // 5ms max per operation
  })

  it('add space', async () => {
    const conn = await connect()
    const account = await conn.getAccount()
    const tx: TxCreateDoc<Space> = {
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      _id: generateId(),
      objectSpace: core.space.Model,
      modifiedBy: account._id,
      modifiedOn: Date.now(),
      attributes: {
        name: 'Sp3',
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
    expect(spaces.length).toBe(3)
  })

  it('check-model-operations', async () => {
    const conn = await connectTx()
    const h = conn.getHierarchy()
    const domains = h.domains()
    expect(domains.length).toBe(2)

    expect(h.isDerived(test.class.TestComment, core.class.AttachedDoc)).toBe(true)
  })
})
