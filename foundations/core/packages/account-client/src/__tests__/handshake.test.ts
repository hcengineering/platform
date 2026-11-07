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

import type { Data, Version } from '@hcengineering/core'
import { getClient } from '../client'

const version: Data<Version> = { major: 0, minor: 7, patch: 0 }
afterEach(() => {
  jest.restoreAllMocks()
})

test('forwards cancellation to the in-flight handshake HTTP request', async () => {
  const controller = new AbortController()
  const aborted = new Error('aborted')
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
    return await new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener(
        'abort',
        () => {
          reject(aborted)
        },
        { once: true }
      )
    })
  })
  const client = getClient('http://account.invalid', 'token')
  const handshake = client.workerHandshake('', version, 'all', controller.signal)
  controller.abort()
  await expect(handshake).rejects.toBe(aborted)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
})
