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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import core from '@hcengineering/core'
import platform from '@hcengineering/platform'
import { RestClientImpl } from '../rest/rest'

describe('REST response retries', () => {
  const errorBody = JSON.stringify({ error: 'Class is not registered in the model.', _class: 'missing:class:Doc' })
  const originalFetch = globalThis.fetch
  const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()

  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it.each(['findAll', 'getModel'] as const)(
    'does not retry %s after HTTP 400 and preserves the status text',
    async (method) => {
      fetchMock.mockImplementation(async () => new Response(errorBody, { status: 400, statusText: 'Bad Request' }))
      const client = new RestClientImpl('http://localhost', 'workspace', 'test-token')
      const request = method === 'findAll' ? client.findAll(core.class.Doc, {}) : client.getModel(true)

      await expect(request).rejects.toMatchObject({
        status: { code: platform.status.BadRequest, params: { message: 'Bad Request' } }
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it('continues to retry HTTP 500', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 500, statusText: 'Internal Server Error' }))
    const client = new RestClientImpl('http://localhost', 'workspace', 'test-token')

    await expect(client.findAll(core.class.Doc, {})).rejects.toThrow('Internal Server Error')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('retries HTTP 429 but stops on the following HTTP 400', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After-ms': '1' } }))
      .mockImplementation(async () => new Response(errorBody, { status: 400, statusText: 'Bad Request' }))
    const client = new RestClientImpl('http://localhost', 'workspace', 'test-token')

    await expect(client.findAll(core.class.Doc, {})).rejects.toMatchObject({
      status: { code: platform.status.BadRequest }
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
