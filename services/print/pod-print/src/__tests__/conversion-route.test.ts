// Copyright © 2026 Huly Contributors.
import { type Server } from 'http'

import config from '../config'
import { convertToPdf } from '../preview'
import { createServer } from '../server'

const mockStorage = { stat: jest.fn(), read: jest.fn(), put: jest.fn(), close: jest.fn() }
const mockContext: { with: jest.Mock, error: jest.Mock } = {
  with: jest.fn(async (_name, _attrs, operation) => await Promise.resolve(operation(mockContext))),
  error: jest.fn()
}
jest.mock(
  'cors',
  () => () => (_req: unknown, _res: unknown, next: () => void) => {
    next()
  },
  { virtual: true }
)
jest.mock('@hcengineering/api-client', () => ({}), { virtual: true })
jest.mock('@hcengineering/core', () => ({ newMetrics: jest.fn() }), { virtual: true })
jest.mock('@hcengineering/server-core', () => ({ initStatisticsContext: () => mockContext }), { virtual: true })
jest.mock('@hcengineering/server-storage', () => ({ buildStorageFromConfig: () => mockStorage }), { virtual: true })
jest.mock('@hcengineering/server-guest-resources', () => ({}), { virtual: true })
jest.mock('@hcengineering/analytics-service', () => ({}), { virtual: true })
jest.mock(
  '@hcengineering/account-client',
  () => ({
    getClient: (_url: string, token: string) => ({
      getLoginInfoByToken: async () =>
        token === 'invalid' ? {} : { workspace: token, workspaceDataId: token, workspaceUrl: token }
    }),
    isWorkspaceLoginInfo: (info: any) => info.workspace !== undefined
  }),
  { virtual: true }
)
jest.mock('../config', () => ({
  __esModule: true,
  default: { GotenbergUrl: 'http://converter', AccountsUrl: 'http://accounts' }
}))
jest.mock('../print', () => ({}))
jest.mock('../convert', () => ({ convertToHtml: jest.fn(async () => '<p>HTML</p>') }))
jest.mock('../preview', () => ({
  ...jest.requireActual('../preview'),
  convertToPdf: jest.fn(async () => Buffer.from('%PDF-fixture'))
}))

describe('authenticated conversion route', () => {
  let server: Server
  let base: string
  let etag: string
  let sourceType: string
  let size: number
  const cache = new Map<string, any>()
  const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  beforeAll(async () => {
    const app = createServer({} as any, []).app
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
    base = `http://127.0.0.1:${(server.address() as any).port}`
  })
  afterAll(async () => {
    await new Promise<void>((resolve) =>
      server.close(() => {
        resolve()
      })
    )
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.clear()
    etag = 'version-one'
    sourceType = docx
    size = 12
    config.GotenbergUrl = 'http://converter'
    mockStorage.stat.mockImplementation(async (_ctx, ws, id) =>
      id === 'source' ? { contentType: sourceType, etag, size } : cache.get(`${ws.uuid}/${id}`)
    )
    mockStorage.read.mockResolvedValue([Buffer.from('document')])
    mockStorage.put.mockImplementation(async (_ctx, ws, id, _bytes, contentType) => {
      cache.set(`${ws.uuid}/${id}`, { contentType })
    })
  })
  const request = async (query = '?format=preview', token = 'workspace-a'): Promise<Response> =>
    await fetch(`${base}/convert/source${query}`, { headers: { Authorization: `Bearer ${token}` } })

  it('authenticates before storage access', async () => {
    expect((await request('', 'invalid')).status).toBe(401)
    expect(mockStorage.stat).not.toHaveBeenCalled()
  })
  it('caches the PDF by workspace and source version while retaining the source', async () => {
    const first = await (await request()).json()
    expect(first.contentType).toBe('application/pdf')
    expect(await (await request()).json()).toEqual(first)
    expect(convertToPdf).toHaveBeenCalledTimes(1)
    await request('?format=preview', 'workspace-b')
    expect(convertToPdf).toHaveBeenCalledTimes(2)
    etag = 'version-two'
    expect((await (await request()).json()).id).not.toBe(first.id)
    expect(convertToPdf).toHaveBeenCalledTimes(3)
    expect(mockStorage.put.mock.calls.every((call) => call[2] !== 'source')).toBe(true)
  })
  it('keeps old clients on HTML and falls back when no PDF converter is configured', async () => {
    expect((await (await request('')).json()).contentType).toBe('text/html')
    config.GotenbergUrl = ''
    expect((await (await request()).json()).contentType).toBe('text/html')
    expect((await request('?format=pdf')).status).toBe(503)
    expect(convertToPdf).not.toHaveBeenCalled()
  })
  it('rejects DOC and oversized sources before reading their bytes', async () => {
    sourceType = 'application/msword'
    expect((await request()).status).toBe(400)
    sourceType = docx
    size = 26 * 1024 * 1024
    expect((await request()).status).toBe(413)
    expect(mockStorage.read).not.toHaveBeenCalled()
  })
  it('completes HTML conversion while a PDF conversion is stalled', async () => {
    let releasePdf!: (value: Buffer) => void
    let markStarted!: () => void
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    jest.mocked(convertToPdf).mockImplementationOnce(
      async () =>
        await new Promise<Buffer>((resolve) => {
          releasePdf = resolve
          markStarted()
        })
    )
    const pdf = request()
    await started
    let deadline: ReturnType<typeof setTimeout> | undefined
    try {
      const html = await Promise.race([
        request('?format=html'),
        new Promise<never>((_resolve, reject) => {
          deadline = setTimeout(() => {
            reject(new Error('HTML is blocked by PDF conversion'))
          }, 1000)
        })
      ])
      expect(html.status).toBe(200)
      expect((await html.json()).contentType).toBe('text/html')
    } finally {
      clearTimeout(deadline)
      releasePdf(Buffer.from('%PDF-fixture'))
      await pdf
    }
  })
  it.each(['', '?format=html'])('preserves oversized legacy HTML conversion for %s', async (query) => {
    size = 26 * 1024 * 1024
    mockStorage.read.mockResolvedValue([Buffer.alloc(size)])
    const response = await request(query)
    expect(response.status).toBe(200)
    expect((await response.json()).contentType).toBe('text/html')
    expect(mockStorage.read).toHaveBeenCalledTimes(1)
    expect(convertToPdf).not.toHaveBeenCalled()
  })
  it('does not cache failed conversions and permits retry', async () => {
    jest.mocked(convertToPdf).mockRejectedValueOnce(new Error('converter failed'))
    expect((await request()).status).toBe(500)
    expect(mockStorage.put).not.toHaveBeenCalled()
    expect((await request()).status).toBe(200)
  })
})
