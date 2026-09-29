//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { getMetadata } from '@hcengineering/platform'
import { convertForPreview, convertToHTML } from '../utils'

jest.mock('@hcengineering/platform', () => ({ getMetadata: jest.fn() }), { virtual: true })
jest.mock('../plugin', () => ({ __esModule: true, default: { metadata: { PrintURL: 'print-url' } } }))

describe('DOCX preview conversion', () => {
  const fetchMock = jest.fn()
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock
    jest.mocked(getMetadata).mockReturnValue('https://print.example')
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  function respond (body: unknown, status = 200): void {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
  }

  it.each(['application/pdf', 'text/html'] as const)('returns a validated %s preview', async (contentType) => {
    respond({ id: 'preview-id', contentType })
    const controller = new AbortController()

    await expect(convertForPreview('source-id', 'workspace-token', controller.signal)).resolves.toEqual({
      id: 'preview-id',
      contentType
    })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('https://print.example/convert/source-id?format=preview')
    expect(options).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer workspace-token', Accept: 'application/json' },
      signal: controller.signal
    })
  })

  it('treats the legacy response as HTML', async () => {
    respond({ id: 'legacy-id' })
    await expect(convertForPreview('source-id', 'token')).resolves.toEqual({
      id: 'legacy-id',
      contentType: 'text/html'
    })
  })

  it.each([
    {},
    null,
    { id: '' },
    { id: ' ' },
    { id: 123 },
    { id: 'id', contentType: null },
    { id: 'id', contentType: 'image/png' }
  ])('rejects malformed preview metadata: %j', async (body) => {
    respond(body)
    await expect(convertForPreview('source-id', 'token')).rejects.toThrow('Invalid preview response')
  })

  it('rejects a missing token without requesting conversion', async () => {
    await expect(convertForPreview('source-id', '')).rejects.toThrow('Missing authentication token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a failed conversion even for a non-JSON service error', async () => {
    fetchMock.mockResolvedValue(new Response('Gateway unavailable', { status: 503 }))
    await expect(convertForPreview('source-id', 'token')).rejects.toThrow('503')
  })

  it('reports the service conversion error', async () => {
    respond({ message: 'Conversion queue is full' }, 503)
    await expect(convertForPreview('source-id', 'token')).rejects.toThrow('Conversion queue is full')
  })

  it('rejects malformed success JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not json'))
    await expect(convertForPreview('source-id', 'token')).rejects.toThrow()
  })

  it('preserves an aborted request rejection', async () => {
    const error = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValue(error)
    await expect(convertForPreview('source-id', 'token')).rejects.toBe(error)
  })

  it('requests HTML explicitly for existing callers', async () => {
    respond({ id: 'html-id', contentType: 'text/html' })
    await expect(convertToHTML('source-id', 'token')).resolves.toBe('html-id')
    expect(fetchMock.mock.calls[0][0].toString()).toBe('https://print.example/convert/source-id?format=html')
  })

  it('preserves the empty-token behavior of the HTML helper', async () => {
    await expect(convertToHTML('source-id', '')).resolves.toBe('')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
