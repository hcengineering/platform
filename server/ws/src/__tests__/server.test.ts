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

import { readResponse, serialize, UNAUTHORIZED } from '@hcengineering/platform'
import { generateToken } from '@hcengineering/server-token'
import WebSocket from 'ws'
import { disableLogging, start } from '../server'

import {
  Class,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  getWorkspaceId,
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  Ref,
  ServerStorage,
  toFindResult,
  Tx,
  TxResult
} from '@hcengineering/core'
import { SessionContext } from '@hcengineering/server-core'
import { ClientSession } from '../client'
import { genMinModel } from './minmodel'

describe('server', () => {
  disableLogging()

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

  const cancelOp = start(
    new MeasureMetricsContext('test', {}),
    async () => ({
      modelDb: await getModelDb(),
      findAll: async <T extends Doc>(
        ctx: SessionContext,
        _class: Ref<Class<T>>,
        query: DocumentQuery<T>,
        options?: FindOptions<T>
      ): Promise<FindResult<T>> => toFindResult([]),
      tx: async (ctx: SessionContext, tx: Tx): Promise<[TxResult, Tx[], string | undefined]> => [{}, [], undefined],
      close: async () => {},
      storage: {} as unknown as ServerStorage,
      domains: async () => [],
      find: (domain: Domain) => ({
        next: async () => undefined,
        close: async () => {}
      }),
      load: async (domain: Domain, docs: Ref<Doc>[]) => [],
      upload: async (domain: Domain, docs: Doc[]) => {},
      clean: async (domain: Domain, docs: Ref<Doc>[]) => {}
    }),
    (token, pipeline, broadcast) => new ClientSession(broadcast, token, pipeline),
    3335,
    ''
  )

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
      conn.close()
    })
    conn.on('close', () => {
      done()
    })
  })

  it('should not connect to server without token', (done) => {
    const conn = new WebSocket('ws://localhost:3335/xyz')
    conn.on('error', () => {
      conn.close()
    })
    conn.on('message', (msg: string) => {
      const resp = readResponse(msg)
      expect(resp.result === 'hello')
      expect(resp.error?.code).toBe(UNAUTHORIZED.code)
      conn.close()
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
        conn.send(serialize({ method: 'tx', params: [], id: i }))
      }
    })
    let received = 0
    conn.on('message', (msg: string) => {
      readResponse(msg)
      if (++received === total) {
        // console.log('resp:', resp, ' Time: ', Date.now() - start)
        conn.close()
      }
    })
    conn.on('close', () => {
      done()
    })
  })
})
