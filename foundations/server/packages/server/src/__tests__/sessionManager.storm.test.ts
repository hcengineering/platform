//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import core, {
  AccountRole,
  MeasureMetricsContext,
  type AccountUuid,
  type PersonId,
  type WorkspaceUuid
} from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'

import { TSessionManager } from '../sessionManager'

jest.mock('@hcengineering/account-client', () => ({
  getClient: jest.fn(() => ({
    getWorkspaceInfo: jest.fn(),
    updateLastVisit: jest.fn(),
    updateAccountsLastVisit: jest.fn(),
    getLoginWithWorkspaceInfo: jest.fn()
  }))
}))

jest.mock('@hcengineering/analytics', () => ({
  Analytics: { handleError: jest.fn(), handleEvent: jest.fn() }
}))

jest.mock('../workspace', () => ({
  // Records the factory so tests can drive cold builds directly.
  Workspace: jest.fn().mockImplementation((context, token, factory, tickHash, softShutdown, wsId, branding) => ({
    context,
    factory,
    wsId,
    branding,
    sessions: new Map(),
    maintenance: false,
    tickHandlers: new Map(),
    close: jest.fn().mockResolvedValue(undefined)
  }))
}))

jest.mock('../utils', () => ({ sendResponse: jest.fn().mockResolvedValue(undefined) }))

const ws = 'ws-1' as WorkspaceUuid

function mkSession (user: string, role: AccountRole = AccountRole.User): any {
  return {
    getUser: () => user as AccountUuid,
    getRawAccount: () => ({ role, primarySocialId: `social-${user}` as PersonId })
  }
}

interface FakePipeline {
  findAll: jest.Mock
  tx: jest.Mock
  handleBroadcast: jest.Mock
  context: { modelDb: any }
}

const statusDoc = (user: string, online: boolean): any => ({
  _id: `status-${user}`,
  _class: core.class.UserStatus,
  space: core.space.Space,
  user,
  online
})

function mkPipeline (existing: any[] = []): FakePipeline {
  return {
    findAll: jest.fn().mockResolvedValue(existing),
    tx: jest.fn().mockResolvedValue({}),
    handleBroadcast: jest.fn().mockResolvedValue(undefined),
    context: { modelDb: {} }
  }
}

describe('restart-storm protections', () => {
  let sm: TSessionManager
  let pipelineFactory: jest.Mock

  beforeAll(() => {
    setMetadata(serverToken.metadata.Secret, 'secret')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    const queue = {
      getProducer: jest.fn(() => ({ send: jest.fn().mockResolvedValue(undefined), close: jest.fn() })),
      createConsumer: jest.fn().mockReturnValue({ close: jest.fn() })
    }
    pipelineFactory = jest.fn()
    sm = new TSessionManager(
      new MeasureMetricsContext('test', {}),
      { pingTimeout: 10000, reconnectTimeout: 3 },
      {},
      undefined,
      'http://localhost:3000',
      true,
      false,
      queue as any,
      pipelineFactory
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  function installWorkspace (pipeline: FakePipeline, extra: Record<string, any> = {}): any {
    const workspace: any = {
      context: new MeasureMetricsContext('ws', {}),
      wsId: { uuid: ws, url: 'ws-url' },
      maintenance: false,
      with: async (op: (p: any) => Promise<any>) => await op(pipeline),
      ...extra
    }
    sm.workspaces.set(ws, workspace)
    return workspace
  }

  const q = (user: string, online: boolean, role?: AccountRole): void =>
    (sm as any).queueStatus(ws, mkSession(user, role), online)

  describe('presence status batching', () => {
    it('does nothing until the flush window elapses, then writes one batch for many users', async () => {
      const pipeline = mkPipeline()
      installWorkspace(pipeline)

      q('u1', true)
      q('u2', true)
      q('u3', true)
      expect(pipeline.tx).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(1000)

      expect(pipeline.findAll).toHaveBeenCalledTimes(1)
      expect(pipeline.findAll.mock.calls[0][1]).toBe(core.class.UserStatus)
      expect(pipeline.findAll.mock.calls[0][2]).toEqual({ user: { $in: ['u1', 'u2', 'u3'] } })
      expect(pipeline.tx).toHaveBeenCalledTimes(1)
      expect(pipeline.tx.mock.calls[0][1]).toHaveLength(3)
      expect(pipeline.handleBroadcast).toHaveBeenCalledTimes(1)
    })

    it('collapses connect/disconnect flapping: last write wins', async () => {
      const pipeline = mkPipeline([statusDoc('u1', true)])
      installWorkspace(pipeline)

      q('u1', false)
      q('u1', true)
      q('u1', false)
      await jest.advanceTimersByTimeAsync(1000)

      expect(pipeline.tx).toHaveBeenCalledTimes(1)
      const txes = pipeline.tx.mock.calls[0][1]
      expect(txes).toHaveLength(1)
      expect(txes[0].operations).toEqual({ online: false })
    })

    it('writes nothing when stored status already matches or an unknown user goes offline', async () => {
      const pipeline = mkPipeline([statusDoc('u1', true)])
      installWorkspace(pipeline)

      q('u1', true) // same as stored
      q('ghost', false) // never had a status
      await jest.advanceTimersByTimeAsync(1000)

      expect(pipeline.tx).not.toHaveBeenCalled()
      expect(pipeline.handleBroadcast).not.toHaveBeenCalled()
    })

    it('creates a status for a new online user', async () => {
      const pipeline = mkPipeline()
      installWorkspace(pipeline)

      q('u1', true)
      await jest.advanceTimersByTimeAsync(1000)

      const [tx] = pipeline.tx.mock.calls[0][1]
      expect(tx.objectClass).toBe(core.class.UserStatus)
      expect(tx.attributes).toEqual({ online: true, user: 'u1' })
    })

    it('ignores read-only guests', async () => {
      const pipeline = mkPipeline()
      installWorkspace(pipeline)

      q('guest', true, AccountRole.ReadOnlyGuest)
      await jest.advanceTimersByTimeAsync(1000)

      expect(pipeline.findAll).not.toHaveBeenCalled()
    })

    it('skips (and drops) the batch for a workspace in maintenance', async () => {
      const pipeline = mkPipeline()
      installWorkspace(pipeline, { maintenance: true })

      q('u1', true)
      await jest.advanceTimersByTimeAsync(5000)

      expect(pipeline.findAll).not.toHaveBeenCalled()
    })

    it('serializes flushes per workspace: a change during a running flush is flushed after it, not in parallel', async () => {
      let releaseFirstTx: () => void = () => {}
      const pipeline = mkPipeline()
      pipeline.tx.mockImplementationOnce(
        async () =>
          await new Promise<void>((resolve) => {
            releaseFirstTx = resolve
          })
      )
      installWorkspace(pipeline)

      q('u1', true)
      await jest.advanceTimersByTimeAsync(1000) // first flush starts, blocks in tx
      expect(pipeline.tx).toHaveBeenCalledTimes(1)

      q('u2', true)
      await jest.advanceTimersByTimeAsync(3000) // timer fires while first flush is running
      expect(pipeline.tx).toHaveBeenCalledTimes(1) // no overlap

      releaseFirstTx()
      await jest.advanceTimersByTimeAsync(1000)
      expect(pipeline.tx).toHaveBeenCalledTimes(2)
      expect(pipeline.tx.mock.calls[1][1]).toHaveLength(1)
    })

    it('reports a failed flush and keeps working afterwards', async () => {
      const pipeline = mkPipeline()
      pipeline.tx.mockRejectedValueOnce(new Error('db down'))
      installWorkspace(pipeline)

      q('u1', true)
      await jest.advanceTimersByTimeAsync(1000)
      expect(Analytics.handleError).toHaveBeenCalledTimes(1)

      q('u2', true)
      await jest.advanceTimersByTimeAsync(1000)
      expect(pipeline.tx).toHaveBeenCalledTimes(2) // statusFlushing was released
    })
  })

  describe('cold build limiter', () => {
    function mkFactory (): () => Promise<any> {
      const w = (sm as any).createWorkspace(
        new MeasureMetricsContext('c', {}),
        new MeasureMetricsContext('p', {}),
        { account: 'u' as AccountUuid, workspace: ws, extra: {} },
        'url',
        undefined,
        null
      )
      return w.factory
    }

    it('caps concurrent cold pipeline builds and drains the queue as slots free up', async () => {
      const pending: Array<{ resolve: (v: any) => void }> = []
      let running = 0
      let maxRunning = 0
      pipelineFactory.mockImplementation(async () => {
        running++
        maxRunning = Math.max(maxRunning, running)
        return await new Promise((resolve) => {
          pending.push({
            resolve: (v) => {
              running--
              resolve(v)
            }
          })
        })
      })
      const factory = mkFactory()
      const limit = sm.coldBuildLimiter.rate

      const builds = Array.from({ length: limit + 5 }, () => factory())
      await jest.advanceTimersByTimeAsync(0)
      expect(pipelineFactory).toHaveBeenCalledTimes(limit)

      pending.shift()?.resolve({ ok: 1 })
      await jest.advanceTimersByTimeAsync(0)
      expect(pipelineFactory.mock.calls.length).toBeGreaterThan(limit)

      while (pending.length > 0 || pipelineFactory.mock.calls.length < limit + 5) {
        pending.shift()?.resolve({ ok: 1 })
        await jest.advanceTimersByTimeAsync(0)
      }
      await Promise.all(builds)
      expect(maxRunning).toBeLessThanOrEqual(limit)
      expect(pipelineFactory).toHaveBeenCalledTimes(limit + 5)
    })

    it('releases the slot when a build fails', async () => {
      pipelineFactory.mockRejectedValue(new Error('boom'))
      const factory = mkFactory()
      const limit = sm.coldBuildLimiter.rate

      for (let i = 0; i < limit * 2; i++) {
        await expect(factory()).rejects.toThrow('boom')
      }
      expect(pipelineFactory).toHaveBeenCalledTimes(limit * 2)
    })
  })
})
