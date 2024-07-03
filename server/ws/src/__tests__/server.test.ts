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

import { UNAUTHORIZED } from '@hcengineering/platform'
import { readResponse, serialize } from '@hcengineering/rpc'
import { generateToken } from '@hcengineering/server-token'
import WebSocket from 'ws'
import { start } from '../server'

import {
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  getWorkspaceId,
  toFindResult,
  type Account,
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
  type TxResult
} from '@hcengineering/core'
import { createDummyStorageAdapter, type ServerStorage, type SessionContext } from '@hcengineering/server-core'
import { ClientSession } from '../client'
import { startHttpServer } from '../server_http'
import { genMinModel } from './minmodel'

describe('server', () => {
  async function getModelDb (): Promise<ModelDb> {
    const txes = genMinModel()
    const hierarchy = new Hierarchy()
    for (const tx of txes) {
      hierarchy.tx(tx)
    }
    const modelDb = new ModelDb(hierarchy)
    for (const tx of txes) {
      await modelDb.tx(tx)
    }
    return modelDb
  }

  const cancelOp = start(new MeasureMetricsContext('test', {}), {
    pipelineFactory: async () => ({
      modelDb: await getModelDb(),
      findAll: async <T extends Doc>(
        ctx: SessionContext,
        _class: Ref<Class<T>>,
        query: DocumentQuery<T>,
        options?: FindOptions<T>
      ): Promise<FindResult<T>> => toFindResult([]),
      tx: async (ctx: SessionContext, tx: Tx): Promise<[TxResult, Tx[], string[] | undefined]> => [{}, [], undefined],
      close: async () => {},
      storage: {} as unknown as ServerStorage,
      domains: async () => [],
      find: (ctx: MeasureContext, domain: Domain) => ({
        next: async (ctx: MeasureContext) => undefined,
        close: async (ctx: MeasureContext) => {}
      }),
      load: async (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => [],
      upload: async (ctx: MeasureContext, domain: Domain, docs: Doc[]) => {},
      clean: async (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => {},
      searchFulltext: async (ctx, query, options) => {
        return { docs: [] }
      }
    }),
    sessionFactory: (token, pipeline) => new ClientSession(token, pipeline),
    port: 3335,
    productId: '',
    brandingMap: {},
    serverFactory: startHttpServer,
    accountsUrl: '',
    externalStorage: createDummyStorageAdapter()
  })

  function connect (): WebSocket {
    const token: string = generateToken('', getWorkspaceId('latest', ''))
    return new WebSocket(`ws://localhost:3335/${token}`)
  }

  afterAll(async () => {
    await cancelOp()
  })

  it('should connect to server', (done) => {
    const conn = connect()
    conn.on('open', () => {
      conn.close(1000)
    })
    conn.on('close', () => {
      done()
    })
  })

  it('should not connect to server without token', (done) => {
    const conn = new WebSocket('ws://localhost:3335/xyz')
    conn.on('error', () => {
      conn.close(1000)
    })
    conn.on('message', (msg: string) => {
      const resp = readResponse(msg, false)
      expect(resp.result === 'hello')
      expect(resp.error?.code).toBe(UNAUTHORIZED.code)
      conn.close(1000)
    })
    conn.on('close', () => {
      done()
    })
  })

  it('should send many requests', (done) => {
    const conn = connect()
    const total = 10
    // const start = Date.now()
    conn.on('open', () => {
      for (let i = 0; i < total; i++) {
        conn.send(serialize({ method: 'tx', params: [], id: i }, false))
      }
    })
    let received = 0
    conn.on('message', (msg: string) => {
      readResponse(msg, false)
      if (++received === total) {
        // console.log('resp:', resp, ' Time: ', Date.now() - start)
        conn.close(1000)
      }
    })
    conn.on('close', () => {
      done()
    })
  })

  it('reconnect', async () => {
    const cancelOp = start(new MeasureMetricsContext('test', {}), {
      pipelineFactory: async () => ({
        modelDb: await getModelDb(),
        findAll: async <T extends Doc>(
          ctx: SessionContext,
          _class: Ref<Class<T>>,
          query: DocumentQuery<T>,
          options?: FindOptions<T>
        ): Promise<FindResult<T>> => {
          const d: Doc & { sessionId: string } = {
            _class: 'result' as Ref<Class<Doc>>,
            _id: '1' as Ref<Doc & { sessionId: string }>,
            space: '' as Ref<Space>,
            modifiedBy: '' as Ref<Account>,
            modifiedOn: Date.now(),
            sessionId: ctx.sessionId
          }
          return toFindResult([d as unknown as T])
        },
        tx: async (ctx: SessionContext, tx: Tx): Promise<[TxResult, Tx[], string[] | undefined]> => [{}, [], undefined],
        close: async () => {},
        storage: {} as unknown as ServerStorage,
        domains: async () => [],
        find: (ctx: MeasureContext, domain: Domain) => ({
          next: async (ctx: MeasureContext) => undefined,
          close: async (ctx: MeasureContext) => {}
        }),
        load: async (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => [],
        upload: async (ctx: MeasureContext, domain: Domain, docs: Doc[]) => {},
        clean: async (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => {},
        searchFulltext: async (ctx, query, options) => {
          return { docs: [] }
        }
      }),
      sessionFactory: (token, pipeline) => new ClientSession(token, pipeline),
      port: 3336,
      productId: '',
      brandingMap: {},
      serverFactory: startHttpServer,
      accountsUrl: '',
      externalStorage: createDummyStorageAdapter()
    })

    async function findClose (token: string, timeoutPromise: Promise<void>, code: number): Promise<string> {
      const newConn = new WebSocket(`ws://localhost:3336/${token}?sessionId=s1`)

      await Promise.race([
        timeoutPromise,
        new Promise((resolve) => {
          newConn.on('open', () => {
            newConn.send(serialize({ method: 'hello', params: [], id: -1 }, false))
            newConn.send(serialize({ method: 'findAll', params: [], id: -1 }, false))
            resolve(null)
          })
        })
      ])

      let helloReceived = false

      let responseMsg: any = {}

      await Promise.race([
        timeoutPromise,
        new Promise((resolve) => {
          newConn.on('message', (msg: Buffer) => {
            try {
              console.log('resp:', msg.toString())
              const parsedMsg = readResponse(msg.toString(), false) // Hello
              if (!helloReceived) {
                expect(parsedMsg.result === 'hello')
                helloReceived = true
                return
              }
              responseMsg = readResponse(msg.toString(), false) // our message
              resolve(null)
            } catch (err: any) {
              console.error(err)
            }
          })
        })
      ])

      if (code === 1005) {
        newConn.close()
      } else {
        newConn.close(code)
      }
      return responseMsg.result[0].sessionId
    }

    try {
      //
      const token: string = generateToken('my@email.com', getWorkspaceId('latest', ''))
      let clearTo: any
      const timeoutPromise = new Promise<void>((resolve) => {
        clearTo = setTimeout(resolve, 4000)
      })
      const t1 = await findClose(token, timeoutPromise, 1005)
      const t2 = await findClose(token, timeoutPromise, 1000)

      expect(t1).toBe(t2)
      clearTimeout(clearTo)
    } catch (err: any) {
      console.error(err)
    } finally {
      console.log('calling shutdown')
      await cancelOp()
    }
  })
})
