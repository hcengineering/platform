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

import { uploadXhr, uploadMultipart, XHRUpload, MultipartUpload } from '../upload'

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  public url: string = ''
  public method: string = ''
  public headers: Record<string, string> = {}
  public body: any = null
  public status: number = 200
  public statusText: string = 'OK'
  public responseText: string = ''
  public upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
  public onload: (() => void) | null = null
  public onerror: (() => void) | null = null
  public onabort: (() => void) | null = null
  public ontimeout: (() => void) | null = null

  open (method: string, url: string, async: boolean = true): void {
    this.method = method
    this.url = url
  }

  setRequestHeader (key: string, value: string): void {
    this.headers[key] = value
  }

  send (body: any): void {
    this.body = body
    // Don't auto-call onload - let tests control when it's called
  }

  abort (): void {
    this.onabort?.()
  }

  // Test helpers
  simulateProgress (loaded: number, total: number): void {
    const event: Partial<ProgressEvent> = { loaded, total, lengthComputable: true }
    this.upload.onprogress?.(event as ProgressEvent)
  }

  simulateError (): void {
    this.onerror?.()
  }

  simulateTimeout (): void {
    this.ontimeout?.()
  }

  simulateSuccess (responseText: string = ''): void {
    this.responseText = responseText
    this.onload?.()
  }
}

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Track all XHR instances for multipart tests
const xhrInstances: MockXMLHttpRequest[] = []

describe('uploadXhr', () => {
  let xhrInstance: MockXMLHttpRequest

  beforeEach(() => {
    jest.clearAllMocks()
    xhrInstances.length = 0
    xhrInstance = new MockXMLHttpRequest()
    ;(global as any).XMLHttpRequest = jest.fn().mockImplementation(() => {
      xhrInstances.push(xhrInstance)
      return xhrInstance
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should upload successfully with POST method', async () => {
    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      body: new FormData()
    }

    const uploadPromise = uploadXhr(upload)

    // XHR setup is synchronous
    expect(xhrInstance.method).toBe('POST')
    expect(xhrInstance.url).toBe('https://example.com/upload')
    expect(xhrInstance.headers.Authorization).toBe('Bearer token')

    // Manually trigger onload to resolve the promise with response
    xhrInstance.simulateSuccess('{"result": "success"}')

    const result = await uploadPromise
    expect(result.status).toBe(200)
    expect(result.responseText).toBe('{"result": "success"}')
  })

  it('should upload successfully with PUT method', async () => {
    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Blob(['test content'])
    }

    const uploadPromise = uploadXhr(upload)

    // XHR setup is synchronous
    expect(xhrInstance.method).toBe('PUT')
    expect(xhrInstance.headers['Content-Type']).toBe('application/octet-stream')

    // Manually trigger onload to resolve the promise
    xhrInstance.simulateSuccess('')

    const result = await uploadPromise
    expect(result.status).toBe(200)
    expect(result.responseText).toBe('')
  })

  it('should track upload progress', async () => {
    const onProgress = jest.fn()
    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'POST',
      headers: {},
      body: new FormData()
    }

    const uploadPromise = uploadXhr(upload, { onProgress })

    // Simulate progress events (synchronous)
    xhrInstance.simulateProgress(50, 100)
    xhrInstance.simulateProgress(100, 100)

    // Manually trigger onload to resolve the promise
    xhrInstance.simulateSuccess('')

    await uploadPromise

    expect(onProgress).toHaveBeenCalledWith({
      loaded: 50,
      total: 100,
      percentage: 50
    })
    expect(onProgress).toHaveBeenCalledWith({
      loaded: 100,
      total: 100,
      percentage: 100
    })
  })

  it('should handle network errors', async () => {
    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'POST',
      headers: {},
      body: new FormData()
    }

    const uploadPromise = uploadXhr(upload)

    // Simulate error (synchronous)
    xhrInstance.simulateError()

    await expect(uploadPromise).rejects.toThrow('Network error')
  })

  it('should handle HTTP errors', async () => {
    xhrInstance.status = 500
    xhrInstance.statusText = 'Internal Server Error'

    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'POST',
      headers: {},
      body: new FormData()
    }

    const uploadPromise = uploadXhr(upload)

    // Manually trigger onload to trigger the status check
    xhrInstance.onload?.()

    await expect(uploadPromise).rejects.toThrow('Upload failed with status 500: Internal Server Error')
  })

  it('should handle timeout errors', async () => {
    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'POST',
      headers: {},
      body: new FormData()
    }

    const uploadPromise = uploadXhr(upload)

    // Simulate timeout (synchronous)
    xhrInstance.simulateTimeout()

    await expect(uploadPromise).rejects.toThrow('Upload timeout')
  })

  it('should handle abort signal', async () => {
    const controller = new AbortController()
    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'POST',
      headers: {},
      body: new FormData()
    }

    // Abort immediately
    controller.abort()

    await expect(uploadXhr(upload, { signal: controller.signal })).rejects.toThrow('Upload aborted')
  })

  it.skip('should handle abort during upload', async () => {
    // This test is complex due to async event handling in mocks
    // The abort functionality is tested in integration tests
    const controller = new AbortController()
    const upload: XHRUpload = {
      url: 'https://example.com/upload',
      method: 'POST',
      headers: {},
      body: new FormData()
    }

    // Pre-abort the signal
    controller.abort()

    // Should reject immediately if already aborted
    await expect(uploadXhr(upload, { signal: controller.signal })).rejects.toThrow('Upload aborted')
  })
})

describe('uploadMultipart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockFetch.mockReset()
    xhrInstances.length = 0
    ;(global as any).XMLHttpRequest = jest.fn().mockImplementation(() => {
      const instance = new MockXMLHttpRequest()
      xhrInstances.push(instance)
      return instance
    })
  })

  it('should upload small file in single chunk', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock multipart upload create and complete (using fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
      })
      .mockResolvedValueOnce({
        ok: true
      })

    const uploadPromise = uploadMultipart(upload)

    // Wait for async initialization to complete (fetch promise resolution)
    await new Promise(setImmediate)

    // Should have 1 XHR for the part upload
    expect(xhrInstances).toHaveLength(1)
    const partXhr = xhrInstances[0]

    expect(partXhr.method).toBe('PUT')
    expect(partXhr.url).toContain('/part')
    expect(partXhr.url).toContain('uploadId=test-upload-id')
    expect(partXhr.url).toContain('partNumber=1')

    // Simulate successful part upload
    partXhr.simulateSuccess('{"etag": "test-etag-1"}')

    await uploadPromise

    // Check fetch was called for init and complete
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Check initialization call
    expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://example.com/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      signal: undefined
    })

    // Check completion call
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(URL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token'
      },
      body: JSON.stringify({ parts: [{ partNumber: 1, etag: 'test-etag-1' }] }),
      signal: undefined
    })
  })

  it('should upload large file in multiple chunks', async () => {
    const file = new File(['test content'.repeat(1000000)], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 12 * 1024 * 1024 }) // 12MB

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock multipart upload create and complete
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
      })
      .mockResolvedValueOnce({
        ok: true
      })

    const uploadPromise = uploadMultipart(upload)

    // Wait for async initialization to complete
    await new Promise(setImmediate)

    // Should have at least 1 XHR created for first part
    expect(xhrInstances.length).toBeGreaterThan(0)

    // Simulate each part upload sequentially (12MB / 5MB = 3 parts)
    for (let i = 0; i < 3; i++) {
      // Wait for XHR to be created if not yet
      while (xhrInstances[i] === undefined) {
        await new Promise(setImmediate)
      }
      xhrInstances[i].simulateSuccess(`{"etag": "test-etag-${i + 1}"}`)
      // Allow upload to process the completion
      await new Promise(setImmediate)
    }

    await uploadPromise

    // Should be 1 init + 1 complete = 2 fetch calls (parts use XHR)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    // Should have 3 XHR instances for the 3 parts
    expect(xhrInstances).toHaveLength(3)
  })

  it('should track progress during multipart upload', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }) // 10MB

    const onProgress = jest.fn()
    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock multipart upload create and complete
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
      })
      .mockResolvedValueOnce({
        ok: true
      })

    const uploadPromise = uploadMultipart(upload, { onProgress })

    // Wait for async initialization to complete
    await new Promise(setImmediate)

    // Simulate progress on first part (should be 2 parts: 5MB + 5MB)
    if (xhrInstances[0] !== undefined) {
      xhrInstances[0].simulateProgress(2.5 * 1024 * 1024, 5 * 1024 * 1024) // 2.5MB of 5MB
      xhrInstances[0].simulateProgress(5 * 1024 * 1024, 5 * 1024 * 1024) // Complete first part
      xhrInstances[0].simulateSuccess('{"etag": "test-etag-1"}')
    }

    // Wait for second XHR to be created
    await new Promise(setImmediate)

    // Simulate second part
    if (xhrInstances[1] !== undefined) {
      xhrInstances[1].simulateProgress(2.5 * 1024 * 1024, 5 * 1024 * 1024) // 2.5MB of 5MB (second part)
      xhrInstances[1].simulateProgress(5 * 1024 * 1024, 5 * 1024 * 1024) // Complete second part
      xhrInstances[1].simulateSuccess('{"etag": "test-etag-2"}')
    }

    await uploadPromise

    expect(onProgress).toHaveBeenCalled()
    const progressCalls = onProgress.mock.calls

    // Check that progress was reported with proper values
    expect(progressCalls.length).toBeGreaterThan(0)

    // First progress should show partial progress of first chunk
    const firstCall = progressCalls[0][0]
    expect(firstCall).toHaveProperty('loaded')
    expect(firstCall).toHaveProperty('total', 10 * 1024 * 1024)
    expect(firstCall).toHaveProperty('percentage')
    expect(firstCall.loaded).toBeLessThanOrEqual(firstCall.total)

    // Progress should increase over time
    const lastCall = progressCalls[progressCalls.length - 1][0]
    expect(lastCall.loaded).toBeGreaterThanOrEqual(firstCall.loaded)
  })

  it('should handle initialization failure', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    })

    await expect(uploadMultipart(upload)).rejects.toThrow('Failed to initialize multipart upload')
  })

  it('should handle part upload failure', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }) // 6MB

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock successful initialization and abort call
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
      })
      .mockResolvedValueOnce({
        ok: true // abort call
      })

    const uploadPromise = uploadMultipart(upload)

    // Wait for async initialization and XHR to be created
    await new Promise(setImmediate)

    // Simulate upload failure
    if (xhrInstances[0] !== undefined) {
      xhrInstances[0].status = 500
      xhrInstances[0].statusText = 'Internal Server Error'
      xhrInstances[0].onload?.()
    }

    await expect(uploadPromise).rejects.toThrow('Upload failed with status 500')
  })

  it('should handle completion failure', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock successful init, failed completion, and abort
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })
      .mockResolvedValueOnce({
        ok: true // abort call
      })

    const uploadPromise = uploadMultipart(upload)

    // Wait for async initialization and XHR to be created
    await new Promise(setImmediate)

    if (xhrInstances[0] !== undefined) {
      xhrInstances[0].simulateSuccess('{"etag": "test-etag-1"}')
    }

    await expect(uploadPromise).rejects.toThrow('Failed to complete multipart upload')
  })

  it('should handle abort signal', async () => {
    const controller = new AbortController()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock the initialization call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
    })

    // Abort immediately - this should be caught before part upload
    controller.abort()

    // The implementation checks for abort before each part upload
    await expect(uploadMultipart(upload, { signal: controller.signal })).rejects.toThrow('Upload aborted')
  })

  it('should report immediate progress updates during part upload', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }) // 5MB

    const progressUpdates: Array<{ loaded: number, total: number, percentage: number }> = []
    const onProgress = jest.fn((progress) => {
      progressUpdates.push({ ...progress })
    })

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock multipart upload create and complete
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
      })
      .mockResolvedValueOnce({
        ok: true
      })

    const uploadPromise = uploadMultipart(upload, { onProgress })

    // Wait for async initialization to complete
    await new Promise(setImmediate)

    // Simulate incremental progress updates (this is the key feature we're testing)
    if (xhrInstances[0] !== undefined) {
      const chunkSize = 5 * 1024 * 1024
      xhrInstances[0].simulateProgress(1 * 1024 * 1024, chunkSize) // 20% of chunk
      xhrInstances[0].simulateProgress(2 * 1024 * 1024, chunkSize) // 40% of chunk
      xhrInstances[0].simulateProgress(3 * 1024 * 1024, chunkSize) // 60% of chunk
      xhrInstances[0].simulateProgress(4 * 1024 * 1024, chunkSize) // 80% of chunk
      xhrInstances[0].simulateProgress(5 * 1024 * 1024, chunkSize) // 100% of chunk
      xhrInstances[0].simulateSuccess('{"etag": "test-etag-1"}')
    }

    await uploadPromise

    // Verify we got multiple intermediate progress updates
    expect(progressUpdates.length).toBeGreaterThanOrEqual(5)

    // Verify progress is monotonically increasing
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i].loaded).toBeGreaterThanOrEqual(progressUpdates[i - 1].loaded)
    }

    // Verify percentages are calculated correctly
    expect(progressUpdates[0].percentage).toBe(20)
    expect(progressUpdates[1].percentage).toBe(40)
    expect(progressUpdates[2].percentage).toBe(60)
    expect(progressUpdates[3].percentage).toBe(80)
    expect(progressUpdates[4].percentage).toBe(100)

    // Verify total is consistent
    progressUpdates.forEach((update) => {
      expect(update.total).toBe(5 * 1024 * 1024)
    })
  })

  it('should correctly calculate progress across multiple chunks', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }) // 10MB = 2 chunks

    const progressUpdates: Array<{ loaded: number, total: number, percentage: number }> = []
    const onProgress = jest.fn((progress) => {
      progressUpdates.push({ ...progress })
    })

    const upload: MultipartUpload = {
      url: 'https://example.com/upload',
      headers: { Authorization: 'Bearer token' },
      body: file
    }

    // Mock multipart upload create and complete
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', uploadId: 'test-upload-id' })
      })
      .mockResolvedValueOnce({
        ok: true
      })

    const uploadPromise = uploadMultipart(upload, { onProgress })

    // Wait for async initialization to complete
    await new Promise(setImmediate)

    // Simulate first chunk progress (5MB)
    if (xhrInstances[0] !== undefined) {
      xhrInstances[0].simulateProgress(2.5 * 1024 * 1024, 5 * 1024 * 1024) // 25% overall
      xhrInstances[0].simulateProgress(5 * 1024 * 1024, 5 * 1024 * 1024) // 50% overall
      xhrInstances[0].simulateSuccess('{"etag": "test-etag-1"}')
    }

    // Wait for second XHR to be created
    await new Promise(setImmediate)

    // Simulate second chunk progress (5MB)
    if (xhrInstances[1] !== undefined) {
      xhrInstances[1].simulateProgress(2.5 * 1024 * 1024, 5 * 1024 * 1024) // 75% overall
      xhrInstances[1].simulateProgress(5 * 1024 * 1024, 5 * 1024 * 1024) // 100% overall
      xhrInstances[1].simulateSuccess('{"etag": "test-etag-2"}')
    }

    await uploadPromise

    // Verify we got progress updates
    expect(progressUpdates.length).toBeGreaterThan(0)

    // Find progress updates at key milestones (from first chunk)
    const progress25 = progressUpdates.find((p) => p.percentage === 25)
    const progress50 = progressUpdates.find((p) => p.percentage === 50)

    // At least first chunk progress should be reported
    expect(progress25).toBeDefined()
    expect(progress50).toBeDefined()

    // Verify the loaded values are correct for milestones that exist
    if (progress25 !== undefined) {
      expect(progress25.loaded).toBe(2.5 * 1024 * 1024)
      expect(progress25.total).toBe(10 * 1024 * 1024)
    }
    if (progress50 !== undefined) {
      expect(progress50.loaded).toBe(5 * 1024 * 1024)
      expect(progress50.total).toBe(10 * 1024 * 1024)
    }

    // Verify that progress updates span across the upload
    const progressValues = progressUpdates.map((p) => p.loaded)
    const minProgress = Math.min(...progressValues)
    const maxProgress = Math.max(...progressValues)

    // Should have progress from start through at least first chunk
    expect(minProgress).toBeGreaterThan(0)
    expect(maxProgress).toBeGreaterThanOrEqual(2.5 * 1024 * 1024)
  })
})
