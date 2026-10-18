//
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 Intabia Fusion.
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

import core, { MeasureMetricsContext, type Tx, WorkspaceEvent } from '@hcengineering/core'
import { ClientSession } from '../client'

jest.mock('@hcengineering/server-core', () => ({
  ...jest.requireActual('@hcengineering/server-core'),
  estimateDocSize: jest.fn(() => 0)
}))

const modelDbStub = {}

function makeCounter (): { counter: any, names: string[] } {
  const names: string[] = []
  const counter = {
    add: jest.fn((name: string) => names.push(name)),
    withCounter: jest.fn(async (name: string, _count: number, op: () => Promise<any>) => {
      names.push(name)
      return await op()
    })
  }
  return { counter, names }
}

function makeSession (counter: any): ClientSession {
  const token: any = { account: 'user-1', workspace: 'ws-1', extra: {} }
  const account: any = { uuid: 'user-1', role: 'USER', primarySocialId: 'social-1', socialIds: ['social-1'] }
  const info: any = { socialIds: [], workspaces: {} }
  return new ClientSession(token, { uuid: 'ws-1', url: 'ws' } as any, account, info, true, counter)
}

function makeCtx (pipeline: Record<string, any>): { ctx: any, sendResponse: jest.Mock, sendError: jest.Mock } {
  const sendResponse = jest.fn().mockResolvedValue(undefined)
  const sendError = jest.fn().mockResolvedValue(undefined)
  const ctx = {
    requestId: 'req-1',
    ctx: new MeasureMetricsContext('test', {}),
    pipeline: {
      context: { modelDb: modelDbStub, hierarchy: { findDomain: () => 'domain' } },
      handleBroadcast: jest.fn().mockResolvedValue(undefined),
      ...pipeline
    },
    socialStringsToUsers: new Map(),
    sendResponse,
    sendError,
    sendPong: jest.fn()
  }
  return { ctx, sendResponse, sendError }
}

describe('ClientSession response path', () => {
  // The size estimate walked the whole result just to feed a counter - it must not come back.
  it('sends findAll results as is, without sizing them or counting clientSendMemory', async () => {
    const { counter, names } = makeCounter()
    const result = [{ _id: 'a' }, { _id: 'b' }]
    const { ctx, sendResponse, sendError } = makeCtx({ findAll: jest.fn().mockResolvedValue(result) })
    const { estimateDocSize } = jest.requireMock('@hcengineering/server-core')

    await makeSession(counter).findAll(ctx, core.class.Doc, {})

    expect(sendResponse).toHaveBeenCalledWith('req-1', result)
    expect(sendError).not.toHaveBeenCalled()
    expect(estimateDocSize).not.toHaveBeenCalled()
    expect(names).not.toContain('clientSendMemory')
  })

  it('sends loadModel results as is, without sizing them or counting clientSendMemory', async () => {
    const { counter, names } = makeCounter()
    const model = { full: true, hash: 'h', transactions: [] }
    const { ctx, sendResponse, sendError } = makeCtx({ loadModel: jest.fn().mockResolvedValue(model) })
    const { estimateDocSize } = jest.requireMock('@hcengineering/server-core')

    await makeSession(counter).loadModel(ctx, 0, 'old-hash')

    expect(ctx.pipeline.loadModel).toHaveBeenCalledWith(ctx.ctx, 0, 'old-hash')
    expect(sendResponse).toHaveBeenCalledWith('req-1', model)
    expect(sendError).not.toHaveBeenCalled()
    expect(estimateDocSize).not.toHaveBeenCalled()
    expect(names).toEqual(['loadModel'])
  })

  it('sends searchFulltext results as is', async () => {
    const { counter, names } = makeCounter()
    const result = { docs: [] }
    const { ctx, sendResponse } = makeCtx({ searchFulltext: jest.fn().mockResolvedValue(result) })

    await makeSession(counter).searchFulltext(ctx, { query: 'x' }, {})

    expect(sendResponse).toHaveBeenCalledWith('req-1', result)
    expect(names).not.toContain('clientSendMemory')
  })

  it('sends domainRequest results as is and still broadcasts', async () => {
    const { counter, names } = makeCounter()
    const result = { domain: 'x', value: 1 }
    const { ctx, sendResponse } = makeCtx({ domainRequest: jest.fn().mockResolvedValue(result) })

    const res = await makeSession(counter).domainRequestRaw(ctx, 'x' as any, {})
    await res.broadcastPromise

    expect(sendResponse).toHaveBeenCalledWith('req-1', result)
    expect(ctx.pipeline.handleBroadcast).toHaveBeenCalledTimes(1)
    expect(names).not.toContain('clientSendMemory')
  })

  it('reports a failed loadModel through sendError instead of sending a response', async () => {
    const { counter } = makeCounter()
    const { ctx, sendResponse, sendError } = makeCtx({ loadModel: jest.fn().mockRejectedValue(new Error('db down')) })

    await makeSession(counter).loadModel(ctx, 0)

    expect(sendResponse).not.toHaveBeenCalled()
    expect(sendError).toHaveBeenCalledWith('req-1', 'Failed to loadModel', expect.anything())
  })
})

describe('ClientSession upload and clean access control', () => {
  function makeReadOnlySession (): {
    session: ClientSession
    ctx: ReturnType<typeof makeCtx>
    ops: { upload: jest.Mock, clean: jest.Mock }
  } {
    const { counter } = makeCounter()
    const session = new ClientSession(
      { account: 'user-1', workspace: 'ws-1', extra: {} } as any,
      { uuid: 'ws-1', url: 'ws' } as any,
      {} as any,
      {} as any,
      false,
      counter
    )
    const ops = { upload: jest.fn(), clean: jest.fn() }
    jest.spyOn(session, 'getOps').mockReturnValue(ops as any)
    return { session, ctx: makeCtx({}), ops }
  }

  it('rejects upload without running it when upload is disallowed', async () => {
    const { session, ctx, ops } = makeReadOnlySession()

    await session.upload(ctx.ctx, 'tx' as any, [])

    expect(ops.upload).not.toHaveBeenCalled()
    expect(ctx.sendResponse).toHaveBeenCalledTimes(1)
    expect(ctx.sendResponse).toHaveBeenCalledWith('req-1', { error: 'Upload not allowed' })
  })

  it('rejects clean without running it when upload is disallowed', async () => {
    const { session, ctx, ops } = makeReadOnlySession()

    await session.clean(ctx.ctx, 'tx' as any, [])

    expect(ops.clean).not.toHaveBeenCalled()
    expect(ctx.sendResponse).toHaveBeenCalledTimes(1)
    expect(ctx.sendResponse).toHaveBeenCalledWith('req-1', { error: 'Clean not allowed' })
  })
})

describe('ClientSession broadcast', () => {
  function txes (count: number): Tx[] {
    return Array.from(
      { length: count },
      (_, index) =>
        ({ _id: `tx-${index}`, _class: core.class.TxCreateDoc, objectClass: core.class.Space }) as unknown as Tx
    )
  }

  it('collapses more than 10,000 transactions into a bulk update event', () => {
    const { counter } = makeCounter()
    const session = makeSession(counter)
    const socket = { send: jest.fn() }

    session.broadcast(new MeasureMetricsContext('test', {}), socket as any, txes(10001))

    const result = socket.send.mock.calls[0][1].result
    expect(result).toHaveLength(1)
    expect(result[0].event).toBe(WorkspaceEvent.BulkUpdate)
    expect(result[0].params._class).toEqual([core.class.Space])
  })
})
