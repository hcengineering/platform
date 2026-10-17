//
// Copyright © 2026 Hardcore Engineering Inc.
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

import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { getClient } from '../client'

describe('AccountClient response handling', () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  async function getError (promise: Promise<any>): Promise<PlatformError<any>> {
    try {
      await promise
    } catch (err: any) {
      return err
    }
    throw new Error('Expected promise to reject')
  }

  it('should return the rpc result for a successful response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ result: { account: 'a1' } }), { status: 200 }))

    const result = await getClient('http://account').getLoginInfoByToken()

    expect(result).toEqual({ account: 'a1' })
  })

  it('should throw the status from a JSON error body of a non-2xx response', async () => {
    const error = new Status(Severity.ERROR, platform.status.UnknownMethod, { method: 'foo' })
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error }), { status: 404 }))

    const err = await getError(getClient('http://account').getLoginInfoByToken())

    expect(err).toBeInstanceOf(PlatformError)
    expect(err.status.code).toBe(platform.status.UnknownMethod)
  })

  it('should report the HTTP status for a non-JSON error response', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>504 Gateway Time-out</html>', { status: 504, statusText: 'Gateway Timeout' })
    )

    const err = await getError(getClient('http://account').getLoginInfoByToken())

    expect(err).toBeInstanceOf(PlatformError)
    expect(err.status.code).toBe(platform.status.UnknownError)
    expect(err.status.params.message).toBe('Unexpected response from account service: 504 Gateway Timeout')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('should report the HTTP status for a JSON error response without an error status', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Bad gateway' }), { status: 502 }))

    const err = await getError(getClient('http://account').getLoginInfoByToken())

    expect(err.status.code).toBe(platform.status.UnknownError)
    expect(err.status.params.message).toBe('Unexpected response from account service: 502')
  })

  it('should report the HTTP status for an invalid body of a successful response', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200, statusText: 'OK' }))

    const err = await getError(getClient('http://account').getLoginInfoByToken())

    expect(err.status.code).toBe(platform.status.UnknownError)
    expect(err.status.params.message).toBe('Unexpected response from account service: 200 OK')
  })

  it('should report the HTTP status for a non-JSON providers response', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503, statusText: 'Service Unavailable' }))

    const err = await getError(getClient('http://account').getProviders())

    expect(err.status.params.message).toBe('Unexpected response from account service: 503 Service Unavailable')
  })
})
