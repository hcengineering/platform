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

import { getWorkspaceToken, loadServerConfig, type WorkspaceToken } from '@hcengineering/api-client'
import core, {
  MeasureMetricsContext,
  systemAccount,
  type LoadModelResponse
} from '@hcengineering/core'
import {
  createNetworkClient,
  shutdownNetworkTickMgr,
  WorkspaceServiceClient,
  type NetworkClient
} from '@hcengineering/net-workspace'
import type { BroadcastOps, Session } from '@hcengineering/server-core'
import { decodeToken } from '@hcengineering/server-token'

describe('net-api-server', () => {
  const testCtx = new MeasureMetricsContext('test', {})
  const wsName = 'api-tests'

  let apiWorkspace1: WorkspaceToken
  let apiWorkspace2: WorkspaceToken

  beforeAll(async () => {
    const config = await loadServerConfig('http://huly.local:8083')

    apiWorkspace1 = await getWorkspaceToken(
      'http://huly.local:8083',
      {
        email: 'user1',
        password: '1234',
        workspace: wsName
      },
      config
    )
    apiWorkspace2 = await getWorkspaceToken(
      'http://huly.local:8083',
      {
        email: 'user1',
        password: '1234',
        workspace: wsName + '-cr'
      },
      config,
      'europe'
    )
  })

  function connect (
    token: WorkspaceToken,
    broadcast: BroadcastOps = {
      broadcast (ctx, tx, targets, exclude) {},
      broadcastSessions (measure, sessionIds) {}
    }
  ): { client: NetworkClient, serviceClient: WorkspaceServiceClient } {
    const client = createNetworkClient('localhost:3737')
    const serviceClient = new WorkspaceServiceClient(
      client,
      testCtx,
      {
        uuid: token.workspaceId,
        url: token.info.workspaceUrl,
        dataId: token.info.workspaceDataId
      },
      '0.7.0',
      broadcast,
      new Map(),
      null,
      token.region
    )
    return { client, serviceClient }
  }

  it('load model test', async () => {
    const { client, serviceClient } = connect(apiWorkspace1)
    const s1 = await serviceClient.createSession(testCtx, 's1', decodeToken(apiWorkspace1.token), systemAccount)

    const mdl = await serviceClient.loadModel(testCtx, s1)
    expect(typeof mdl === 'object').toBe(true)
    const lmr = mdl as LoadModelResponse
    expect(lmr.full).toBe(true)
    expect(lmr.transactions.length).toBeGreaterThan(1)
    await serviceClient.close(testCtx)
    await client.close()
  })

  it('find space test', async () => {
    const { client, serviceClient } = connect(apiWorkspace1)
    const s1 = await serviceClient.createSession(testCtx, 's1', decodeToken(apiWorkspace1.token), systemAccount)

    await performanceCheck(serviceClient, testCtx, s1)

    await serviceClient.close(testCtx)
    await client.close()
  })
  it('europe space test', async () => {
    const { client, serviceClient } = connect(apiWorkspace2)
    const s1 = await serviceClient.createSession(testCtx, 's1', decodeToken(apiWorkspace1.token), systemAccount)

    await performanceCheck(serviceClient, testCtx, s1)

    await serviceClient.close(testCtx)
    await client.close()
  })

  afterAll(async () => {
    shutdownNetworkTickMgr()
  })
})

async function performanceCheck (
  serviceClient: WorkspaceServiceClient,
  testCtx: MeasureMetricsContext,
  s1: Session
): Promise<void> {
  let ops = 0
  let total = 0
  const attempts = 500
  for (let i = 0; i < attempts; i++) {
    const st = performance.now()
    const spaces = await serviceClient.findAll(testCtx, s1, core.class.Space, {})
    expect(spaces.length).toBeGreaterThanOrEqual(21)
    const ed = performance.now()
    ops++
    total += ed - st
  }
  const avg = total / ops
  console.log('ops:', ops, 'total:', total, 'avg:', avg)
  expect(ops).toEqual(attempts)
  expect(avg).toBeLessThan(10)
}
