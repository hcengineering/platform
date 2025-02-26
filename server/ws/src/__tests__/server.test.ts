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
import { RPCHandler, type Response } from '@hcengineering/rpc'
import { generateToken } from '@hcengineering/server-token'
import WebSocket from 'ws'

import {
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  toFindResult,
  type PersonId,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type SessionData,
  type Space,
  type Tx,
  type TxResult,
  type PersonUuid,
  type WorkspaceUuid
} from '@hcengineering/core'
import { ClientSession, startSessionManager } from '@hcengineering/server'
import { createDummyStorageAdapter } from '@hcengineering/server-core'
import { startHttpServer } from '../server_http'
import { genMinModel } from './minmodel'

describe('server', () => {
  const port = 10000
  const handler = new RPCHandler()
  async function getModelDb (): Promise<{ modelDb: ModelDb, hierarchy: Hierarchy }> {
    const txes = genMinModel()
    const hierarchy = new Hierarchy()
    for (const tx of txes) {
      hierarchy.tx(tx)
    }
    const modelDb = new ModelDb(hierarchy)
    for (const tx of txes) {
      await modelDb.tx(tx)
    }
    return { modelDb, hierarchy }
  }

  const cancelOp = startSessionManager(new MeasureMetricsContext('test', {}), {
    pipelineFactory: async () => {
      const { modelDb, hierarchy } = await getModelDb()
      return {
        hierarchy,
        modelDb,
        context: {} as any,
        handleBroadcast: async (ctx) => {},
        findAll: async <T extends Doc>(
          ctx: MeasureContext,
          _class: Ref<Class<T>>,
          query: DocumentQuery<T>,
          options?: FindOptions<T>
        ): Promise<FindResult<T>> => toFindResult([]),
        tx: async (ctx: MeasureContext, tx: Tx[]): Promise<[TxResult, Tx[], string[] | undefined]> => [
          {},
          [],
          undefined
        ],
        close: async () => {},
        domains: async () => [],
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
        loadModel: async (ctx, lastModelTx, hash) => []
      }
    },
    sessionFactory: (token, workspace, account) => new ClientSession(token, workspace, account, true),
    port: 3335,
    brandingMap: {},
    serverFactory: startHttpServer,
    accountsUrl: '',
    externalStorage: createDummyStorageAdapter()
  })

  function connect (): WebSocket {
    const token: string = generateToken('' as PersonUuid, 'latest' as WorkspaceUuid)
    return new WebSocket(`ws://localhost:3335/${token}`)
  }

  afterAll(async () => {
    await cancelOp.shutdown()
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
    const conn = new WebSocket(`ws://localhost:${port}/xyz`)
    conn.on('error', () => {
      conn.close(1000)
    })
    conn.on('message', (msg: string) => {
      const resp: Response<any> = handler.readResponse(msg, false)
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
        conn.send(handler.serialize({ method: 'tx', params: [], id: i }, false))
      }
    })
    let received = 0
    conn.on('message', (msg: string) => {
      handler.readResponse(msg, false)
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
    const cancelOp = startSessionManager(new MeasureMetricsContext('test', {}), {
      pipelineFactory: async () => {
        const { modelDb, hierarchy } = await getModelDb()
        return {
          hierarchy,
          modelDb,
          context: {} as any,
          handleBroadcast: async (ctx) => {},
          findAll: async <T extends Doc>(
            ctx: MeasureContext<SessionData>,
            _class: Ref<Class<T>>,
            query: DocumentQuery<T>,
            options?: FindOptions<T>
          ): Promise<FindResult<T>> => {
            const d: Doc & { sessionId: string } = {
              _class: 'result' as Ref<Class<Doc>>,
              _id: '1' as Ref<Doc & { sessionId: string }>,
              space: '' as Ref<Space>,
              modifiedBy: '' as PersonId,
              modifiedOn: Date.now(),
              sessionId: ctx.contextData.sessionId
            }
            return toFindResult([d as unknown as T])
          },
          tx: async (ctx: MeasureContext, tx: Tx[]): Promise<[TxResult, Tx[], string[] | undefined]> => [
            {},
            [],
            undefined
          ],
          groupBy: async () => new Map(),
          close: async () => {},
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
          },
          loadModel: async (ctx, lastModelTx, hash) => []
        }
      },
      sessionFactory: (token, workspace, account) => new ClientSession(token, workspace, account, true),
      port: 3336,
      brandingMap: {},
      serverFactory: startHttpServer,
      accountsUrl: '',
      externalStorage: createDummyStorageAdapter()
    })

    async function findClose (token: string, timeoutPromise: Promise<void>, code: number): Promise<string> {
      const newConn = new WebSocket(`ws://localhost:${port + 1}/${token}?sessionId=s1`)

      await Promise.race([
        timeoutPromise,
        new Promise((resolve) => {
          newConn.on('open', () => {
            newConn.send(handler.serialize({ method: 'hello', params: [], id: -1 }, false))
            newConn.send(handler.serialize({ method: 'findAll', params: [], id: -1 }, false))
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
              const parsedMsg: Response<any> = handler.readResponse(msg.toString(), false) // Hello
              if (!helloReceived) {
                expect(parsedMsg.result === 'hello')
                helloReceived = true
                return
              }
              responseMsg = handler.readResponse(msg.toString(), false) // our message
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
      const token: string = generateToken('my-account-uuid' as PersonUuid, 'latest' as WorkspaceUuid)
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
      await cancelOp.shutdown()
    }
  })
})
