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
//

import { getClient, type AccountClient, type WorkspaceLoginInfo } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import {
  AccountRole,
  MeasureMetricsContext,
  type AccountUuid,
  type Doc,
  type Ref,
  type TxOperations,
  type WorkspaceUuid
} from '@hcengineering/core'
import { initStatisticsContext, type StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import type { Server } from 'http'
import { print } from './print'
import { createServer } from './server'

jest.mock('@hcengineering/account-client', () => ({ getClient: jest.fn(), isWorkspaceLoginInfo: jest.fn(() => true) }))
jest.mock('@hcengineering/api-client', () => ({ createRestTxOperations: jest.fn() }))
jest.mock('@hcengineering/server-core', () => ({ initStatisticsContext: jest.fn() }))
jest.mock('@hcengineering/server-storage', () => ({ buildStorageFromConfig: jest.fn() }))
jest.mock('@hcengineering/server-token', () => ({ generateReadOnlyToken: jest.fn(() => 'readonly-token') }))
jest.mock('@hcengineering/analytics-service', () => ({
  createOpenTelemetryMetricsContext: jest.fn(),
  SplitLogger: jest.fn()
}))
jest.mock('./config', () => ({
  __esModule: true,
  default: { AccountsUrl: 'http://account:3003', FrontUrl: 'http://localhost:8083' }
}))
jest.mock('./convert', () => ({ convertToHtml: jest.fn() }))
jest.mock('./print', () => ({
  print: jest.fn(),
  validKinds: ['pdf', 'jpeg', 'png', 'webp'],
  validPageOrientations: ['portrait', 'landscape']
}))

describe('print HTTP requests', () => {
  const ctx = new MeasureMetricsContext('print-test', {})
  const errorLog = jest.spyOn(ctx, 'error').mockImplementation(() => {})
  const storage: Partial<ReturnType<typeof buildStorageFromConfig>> = { put: jest.fn(), close: jest.fn() }
  const accounts: Partial<AccountClient> = { getLoginInfoByToken: jest.fn(), selectWorkspace: jest.fn() }
  const client: Partial<TxOperations> = { findOne: jest.fn(), close: jest.fn() }
  const login: WorkspaceLoginInfo = {
    account: 'account' as AccountUuid,
    token: 'user-token',
    workspace: 'workspace' as WorkspaceUuid,
    workspaceUrl: 'test-workspace',
    endpoint: 'ws://localhost:3334',
    role: AccountRole.User
  }
  let server: Server
  let origin: string

  beforeAll(async () => {
    jest.mocked(initStatisticsContext).mockReturnValue(ctx)
    jest.mocked(buildStorageFromConfig).mockReturnValue(storage as ReturnType<typeof buildStorageFromConfig>)
    jest.mocked(getClient).mockReturnValue(accounts as AccountClient)
    const storageConfig: Partial<StorageConfiguration> = {}
    server = createServer(storageConfig as StorageConfiguration, []).app.listen(0, '127.0.0.1')
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Missing test server address')
    origin = `http://127.0.0.1:${address.port}`
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(accounts.getLoginInfoByToken!).mockResolvedValue(login)
    jest.mocked(createRestTxOperations).mockResolvedValue(client as TxOperations)
    const doc: Partial<Doc> = { _id: 'document' as Ref<Doc> }
    jest.mocked(client.findOne!).mockResolvedValue(doc as Doc)
    jest.mocked(print).mockResolvedValue(Buffer.from('%PDF-test'))
  })

  afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error === undefined) resolve()
        else reject(error)
      })
    })
  })

  async function requestPrint (): Promise<Response> {
    return await fetch(`${origin}/print?objectClass=core:class:Doc&objectId=document`, {
      headers: { Authorization: 'Bearer user-token' }
    })
  }

  it('uses the endpoint returned for the authenticated workspace', async () => {
    const response = await requestPrint()
    expect(response.status).toBe(200)
    expect(accounts.getLoginInfoByToken).toHaveBeenCalled()
    expect(accounts.selectWorkspace).not.toHaveBeenCalled()
    expect(createRestTxOperations).toHaveBeenCalledWith('http://localhost:3334', 'workspace', 'readonly-token', false)
    expect(print).toHaveBeenCalled()
  })

  it('passes the original error and request context to the logger without authorization data', async () => {
    const refused = new Error('connect ECONNREFUSED 127.0.0.1:3334')
    Object.assign(refused, { code: 'ECONNREFUSED', address: '127.0.0.1', port: 3334 })
    const failure = new TypeError('fetch failed', { cause: new AggregateError([refused], 'Connection failed') })
    jest.mocked(createRestTxOperations).mockRejectedValueOnce(failure)
    const response = await requestPrint()
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ message: 'fetch failed' })
    expect(errorLog).toHaveBeenCalledWith(
      'request failed',
      expect.objectContaining({
        method: 'GET',
        path: '/print',
        err: failure
      })
    )
    expect(errorLog.mock.calls[0][1]?.err).toBe(failure)
    const logged = JSON.stringify(errorLog.mock.calls)
    expect(logged).not.toContain('user-token')
    expect(logged).not.toContain('readonly-token')
  })
})
