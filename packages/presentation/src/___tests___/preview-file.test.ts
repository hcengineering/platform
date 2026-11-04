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

import { getMetadata } from '@hcengineering/platform'
import { getFileUrl } from '../file'
import { fetchPreviewFile } from '../preview-file'

jest.mock('@hcengineering/platform', () => ({ getMetadata: jest.fn() }))
jest.mock('../file', () => ({ getFileUrl: jest.fn() }))
jest.mock('../plugin', () => ({ __esModule: true, default: { metadata: { Token: 'token' } } }))

describe('preview file authentication', () => {
  const originalFetch = globalThis.fetch
  const source = 'http://storage.example/blob/workspace/file'
  let fetchMock: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.mocked(getMetadata).mockReturnValue('readonly-token')
    jest.mocked(getFileUrl).mockReturnValue(source)
    fetchMock = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('file', { status: 200 }))
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('can use wildcard CORS with bearer authentication instead of credentialed cookies', async () => {
    await fetchPreviewFile('blob-id', 'image.png')
    const request = fetchMock.mock.calls[0][1]
    expect(request?.credentials).toBe('omit')
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer readonly-token')
  })

  it('never sends the workspace token to an external file URL', async () => {
    await fetchPreviewFile('https://external.example/image.png', 'image.png')
    const request = fetchMock.mock.calls[0][1]
    expect(new Headers(request?.headers).has('Authorization')).toBe(false)
    expect(request?.credentials).toBe('omit')
  })

  it('retains HEAD and cancellation for PDF access checks', async () => {
    const controller = new AbortController()
    await fetchPreviewFile('blob-id', 'document.pdf', { method: 'HEAD', signal: controller.signal })
    expect(fetchMock.mock.calls[0][1]?.method).toBe('HEAD')
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
  })

  it('rejects an authorization error instead of rendering its JSON as document text', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"Unauthorized"}', { status: 401 }))
    await expect(fetchPreviewFile('blob-id', 'text.txt')).rejects.toThrow('HTTP 401')
  })
})
