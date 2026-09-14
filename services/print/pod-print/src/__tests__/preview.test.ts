// Copyright © 2026 Huly Contributors.
import { convertToPdf, createPreviewQueue, getPreviewId } from '../preview'

describe('document preview', () => {
  afterEach(() => jest.restoreAllMocks())

  it('preserves legacy cache keys and separates PDF versions', () => {
    expect(getPreviewId('file', '"etag"', 'html')).toBe('file@etag')
    expect(getPreviewId('file', '"etag"', 'pdf')).not.toBe(getPreviewId('file', '"etag"', 'html'))
    expect(getPreviewId('file', 'new', 'pdf')).not.toBe(getPreviewId('file', 'old', 'pdf'))
  })

  it('serializes conversions, coalesces duplicates and bounds the queue', async () => {
    const queue = createPreviewQueue(1)
    let release!: (value: string) => void
    const first = jest.fn(
      async () =>
        await new Promise<string>((resolve) => {
          release = resolve
        })
    )
    const second = jest.fn(async () => 'second')
    const a = queue.run('a', first)
    const duplicate = queue.run('a', first)
    const b = queue.run('b', second)
    await expect(queue.run('c', second)).rejects.toMatchObject({ code: 503 })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
    release('first')
    expect(await a).toBe('first')
    expect(await duplicate).toBe('first')
    expect(await b).toBe('second')
  })

  it('releases failed jobs so retry is possible', async () => {
    const queue = createPreviewQueue()
    await expect(
      queue.run('a', async () => {
        throw new Error('broken')
      })
    ).rejects.toThrow('broken')
    await expect(queue.run('a', async () => 'retry')).resolves.toBe('retry')
  })

  it('sends document bytes and returns a validated PDF', async () => {
    const request = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('%PDF-1.7\nfixture', {
        headers: { 'Content-Type': 'application/pdf' }
      })
    )
    expect((await convertToPdf(Buffer.from('docx'), 'http://converter:3000/')).toString()).toContain('%PDF-')
    const [url, options] = request.mock.calls[0]
    expect(url).toBe('http://converter:3000/forms/libreoffice/convert')
    expect(options?.method).toBe('POST')
    expect((options?.body as FormData).get('files')).toBeInstanceOf(Blob)
  })

  it.each([
    [200, 'text/html', '%PDF-1.7'],
    [200, 'application/pdf', 'not a pdf'],
    [500, 'application/pdf', '%PDF-1.7']
  ])('rejects an invalid converter response %s %s', async (status, contentType, body) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(body, {
        status,
        headers: { 'Content-Type': contentType }
      })
    )
    await expect(convertToPdf(Buffer.from('docx'), 'http://converter')).rejects.toMatchObject({ code: 502 })
  })

  it('bounds both input and streamed output', async () => {
    const request = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('%PDF-too-large', {
        headers: { 'Content-Type': 'application/pdf' }
      })
    )
    await expect(convertToPdf(Buffer.alloc(26 * 1024 * 1024), 'http://converter')).rejects.toMatchObject({ code: 413 })
    expect(request).not.toHaveBeenCalled()
    await expect(convertToPdf(Buffer.from('docx'), 'http://converter', { maxOutputBytes: 8 })).rejects.toMatchObject({
      code: 502
    })
  })

  it('aborts stalled conversions', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url, options) =>
        await new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'))
          })
        })
    )
    await expect(convertToPdf(Buffer.from('docx'), 'http://converter', { timeoutMs: 10 })).rejects.toMatchObject({
      code: 504
    })
  })
})
