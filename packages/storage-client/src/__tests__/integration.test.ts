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

import { createFileStorage, FileStorageConfig } from '../client'
import { FileStorage, FileStorageUploadOptions } from '../types'
import * as upload from '../upload'

// Mock the upload module
jest.mock('../upload')
const mockUploadXhr = jest.mocked(upload.uploadXhr)
const mockUploadMultipart = jest.mocked(upload.uploadMultipart)

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  public url: string = ''
  public method: string = ''
  public headers: Record<string, string> = {}
  public body: any = null
  public status: number = 200
  public statusText: string = 'OK'
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
    setTimeout(() => {
      this.onload?.()
    }, 0)
  }

  abort (): void {
    this.onabort?.()
  }
}

;(global as any).XMLHttpRequest = MockXMLHttpRequest

beforeAll(() => {})

afterAll(() => {})

describe('Storage Client Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockUploadXhr.mockClear()
    mockUploadMultipart.mockClear()
  })

  describe('Front Storage Integration', () => {
    let storage: FileStorage

    beforeEach(() => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://files.example.com'
      }
      storage = createFileStorage(config)
    })

    it('should complete full file lifecycle with Front storage', async () => {
      const token = 'test-token'
      const workspace = 'integration-workspace'
      const uuid = 'integration-file-uuid'
      const filename = 'integration-test.txt'
      const file = new File(['Integration test content'], filename, { type: 'text/plain' })

      // Mock successful upload
      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      // Upload file
      await storage.uploadFile(token, workspace, uuid, file)

      // Verify upload was called with correct parameters
      expect(mockUploadXhr).toHaveBeenCalledWith(
        {
          url: 'https://files.example.com/integration-workspace',
          method: 'POST',
          headers: { Authorization: 'Bearer test-token' },
          body: expect.any(FormData)
        },
        undefined
      )

      // Generate file URL
      const fileUrl = storage.getFileUrl(workspace, uuid, filename)
      expect(fileUrl).toBe(`https://files.example.com/${workspace}/${filename}?file=${uuid}&workspace=${workspace}`)

      // Get file metadata (should return empty object for Front storage)
      const meta = await storage.getFileMeta(token, workspace, uuid)
      expect(meta).toEqual({})

      // Mock successful delete
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

      // Delete file
      await storage.deleteFile(token, workspace, uuid)

      // Delete uses the file ID URL, not the filename URL
      const deleteUrl = storage.getFileUrl(workspace, uuid)
      expect(mockFetch).toHaveBeenCalledWith(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' }
      })
    })

    it('should handle upload with progress tracking', async () => {
      const token = 'test-token'
      const workspace = 'progress-workspace'
      const uuid = 'progress-uuid'
      const file = new File(['Progress test'], 'progress.txt', { type: 'text/plain' })
      const progressCallback = jest.fn()

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      await storage.uploadFile(token, workspace, uuid, file, {
        onProgress: progressCallback
      })

      expect(mockUploadXhr).toHaveBeenCalledWith(expect.any(Object), { onProgress: progressCallback })
    })

    it('should handle upload with abort signal', async () => {
      const token = 'test-token'
      const workspace = 'abort-workspace'
      const uuid = 'abort-uuid'
      const file = new File(['Abort test'], 'abort.txt', { type: 'text/plain' })
      const controller = new AbortController()

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      await storage.uploadFile(token, workspace, uuid, file, {
        signal: controller.signal
      })

      expect(mockUploadXhr).toHaveBeenCalledWith(expect.any(Object), { signal: controller.signal })
    })
  })

  describe('Datalake Storage Integration', () => {
    let storage: FileStorage

    beforeEach(() => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://files.example.com',
        datalakeUrl: 'https://datalake.example.com'
      }
      storage = createFileStorage(config)
    })

    it('should complete full file lifecycle with small file', async () => {
      const token = 'test-token'
      const workspace = 'datalake-workspace'
      const uuid = 'small-file-uuid'
      const filename = 'small-file.txt'
      const file = new File(['Small file content'], filename, { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

      // Mock successful small file upload
      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      // Upload small file (should use form-data)
      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalledWith(
        {
          url: `https://datalake.example.com/upload/form-data/${encodeURIComponent(workspace)}`,
          method: 'POST',
          headers: { Authorization: 'Bearer test-token' },
          body: expect.any(FormData)
        },
        undefined
      )

      // Generate file URL
      const fileUrl = storage.getFileUrl(workspace, uuid, filename)
      expect(fileUrl).toBe(`https://datalake.example.com/blob/${workspace}/${uuid}/${filename}`)

      // Mock file metadata response
      const expectedMeta = { size: 1024, contentType: 'text/plain' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedMeta)
      })

      // Get file metadata
      const meta = await storage.getFileMeta(token, workspace, uuid)
      expect(meta).toEqual(expectedMeta)

      // Mock successful delete
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

      // Delete file
      await storage.deleteFile(token, workspace, uuid)

      expect(mockFetch).toHaveBeenCalledWith(`https://datalake.example.com/blob/${workspace}/${uuid}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' }
      })
    })

    it('should complete full file lifecycle with large file', async () => {
      const token = 'test-token'
      const workspace = 'datalake-workspace'
      const uuid = 'large-file-uuid'
      const filename = 'large-file.txt'
      const file = new File(['Large file content'], filename, { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB

      // Mock successful multipart upload
      mockUploadMultipart.mockResolvedValueOnce()

      // Upload large file (should use multipart)
      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadMultipart).toHaveBeenCalledWith(
        {
          url: `https://datalake.example.com/upload/multipart/${encodeURIComponent(workspace)}/${encodeURIComponent(uuid)}`,
          headers: { Authorization: 'Bearer test-token' },
          body: file
        },
        undefined
      )

      expect(mockUploadXhr).not.toHaveBeenCalled()

      // Verify other operations work the same
      const fileUrl = storage.getFileUrl(workspace, uuid, filename)
      expect(fileUrl).toBe(`https://datalake.example.com/blob/${workspace}/${uuid}/${filename}`)
    })

    it('should handle file size threshold correctly', async () => {
      const token = 'test-token'
      const workspace = 'threshold-workspace'

      // Test exactly 10MB file (should use form-data)
      const boundaryUuid = 'boundary-uuid'
      const boundaryFile = new File(['boundary content'], 'boundary.txt', { type: 'text/plain' })
      Object.defineProperty(boundaryFile, 'size', { value: 10 * 1024 * 1024 }) // exactly 10MB

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })
      await storage.uploadFile(token, workspace, boundaryUuid, boundaryFile)

      expect(mockUploadXhr).toHaveBeenCalled()
      expect(mockUploadMultipart).not.toHaveBeenCalled()

      // Reset mocks
      mockUploadXhr.mockClear()
      mockUploadMultipart.mockClear()

      // Test 10MB + 1 byte file (should use multipart)
      const overBoundaryUuid = 'over-boundary-uuid'
      const overBoundaryFile = new File(['over boundary content'], 'over-boundary.txt', { type: 'text/plain' })
      Object.defineProperty(overBoundaryFile, 'size', { value: 10 * 1024 * 1024 + 1 }) // 10MB + 1 byte

      mockUploadMultipart.mockResolvedValueOnce()
      await storage.uploadFile(token, workspace, overBoundaryUuid, overBoundaryFile)

      expect(mockUploadMultipart).toHaveBeenCalled()
      expect(mockUploadXhr).not.toHaveBeenCalled()
    })
  })

  describe('Hulylake Storage Integration', () => {
    let storage: FileStorage

    beforeEach(() => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://files.example.com',
        hulylakeUrl: 'https://hulylake.example.com'
      }
      storage = createFileStorage(config)
    })

    it('should complete full file lifecycle with Hulylake storage', async () => {
      const token = 'test-token'
      const workspace = 'hulylake-workspace'
      const uuid = 'hulylake-file-uuid'
      const filename = 'hulylake-test.txt'
      const file = new File(['Hulylake test content'], filename, { type: 'text/plain' })

      // Mock successful upload
      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      // Upload file (always uses PUT method)
      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalledWith(
        {
          url: `https://hulylake.example.com/api/${workspace}/${uuid}`,
          method: 'PUT',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'text/plain',
            'Content-Length': file.size.toString()
          },
          body: file
        },
        undefined
      )

      // Generate file URL
      const fileUrl = storage.getFileUrl(workspace, uuid, filename)
      expect(fileUrl).toBe(`https://hulylake.example.com/api/${workspace}/${uuid}`)

      // Get file metadata (should return empty object for Hulylake storage)
      const meta = await storage.getFileMeta(token, workspace, uuid)
      expect(meta).toEqual({})

      // Mock successful delete
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

      // Delete file
      await storage.deleteFile(token, workspace, uuid)

      expect(mockFetch).toHaveBeenCalledWith(fileUrl, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' }
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle upload failures across all storage types', async () => {
      const configs: Array<{ name: string, config: FileStorageConfig }> = [
        { name: 'Front', config: { uploadUrl: 'https://front.example.com' } },
        {
          name: 'Datalake',
          config: { uploadUrl: 'https://front.example.com', datalakeUrl: 'https://datalake.example.com' }
        },
        {
          name: 'Hulylake',
          config: { uploadUrl: 'https://front.example.com', hulylakeUrl: 'https://hulylake.example.com' }
        }
      ]

      for (const { name, config } of configs) {
        const storage = createFileStorage(config)
        const token = 'test-token'
        const workspace = `${name.toLowerCase()}-workspace`
        const uuid = `${name.toLowerCase()}-uuid`
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

        // Mock upload failure
        mockUploadXhr.mockRejectedValueOnce(new Error(`${name} upload failed`))
        mockUploadMultipart.mockRejectedValueOnce(new Error(`${name} multipart upload failed`))

        await expect(storage.uploadFile(token, workspace, uuid, file)).rejects.toThrow(
          new RegExp(`${name}.*upload failed`)
        )

        // Reset mocks for next iteration
        mockUploadXhr.mockClear()
        mockUploadMultipart.mockClear()
      }
    })

    it('should handle delete failures across all storage types', async () => {
      const configs: Array<{ name: string, config: FileStorageConfig }> = [
        { name: 'Front', config: { uploadUrl: 'https://front.example.com' } },
        {
          name: 'Datalake',
          config: { uploadUrl: 'https://front.example.com', datalakeUrl: 'https://datalake.example.com' }
        },
        {
          name: 'Hulylake',
          config: { uploadUrl: 'https://front.example.com', hulylakeUrl: 'https://hulylake.example.com' }
        }
      ]

      for (const { name, config } of configs) {
        const storage = createFileStorage(config)
        const token = 'test-token'
        const workspace = `${name.toLowerCase()}-workspace`
        const uuid = `${name.toLowerCase()}-uuid`

        // Mock delete failure
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })

        await expect(storage.deleteFile(token, workspace, uuid)).rejects.toThrow('Failed to delete file')

        // Reset mocks for next iteration
        mockFetch.mockClear()
      }
    })
  })

  describe('Configuration Priority Integration', () => {
    it('should respect storage priority in real usage scenarios', async () => {
      // Test that Datalake takes priority over Hulylake
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: 'https://datalake.example.com',
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)
      const token = 'test-token'
      const workspace = 'priority-workspace'
      const uuid = 'priority-uuid'
      const file = new File(['priority test'], 'priority.txt', { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 1024 }) // Small file to ensure form-data upload

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      await storage.uploadFile(token, workspace, uuid, file)

      // Should use Datalake form-data endpoint, not Hulylake PUT endpoint
      expect(mockUploadXhr).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `https://datalake.example.com/upload/form-data/${encodeURIComponent(workspace)}`,
          method: 'POST' // Datalake uses POST for form-data, Hulylake uses PUT
        }),
        undefined
      )
    })
  })

  describe('Upload Options Integration', () => {
    it('should pass upload options correctly across all storage types', async () => {
      const onProgress = jest.fn()
      const controller = new AbortController()
      const options: FileStorageUploadOptions = {
        onProgress,
        signal: controller.signal
      }

      const configs: Array<{ name: string, config: FileStorageConfig }> = [
        { name: 'Front', config: { uploadUrl: 'https://front.example.com' } },
        {
          name: 'Datalake',
          config: { uploadUrl: 'https://front.example.com', datalakeUrl: 'https://datalake.example.com' }
        },
        {
          name: 'Hulylake',
          config: { uploadUrl: 'https://front.example.com', hulylakeUrl: 'https://hulylake.example.com' }
        }
      ]

      for (const { name, config } of configs) {
        const storage = createFileStorage(config)
        const token = 'test-token'
        const workspace = `${name.toLowerCase()}-options-workspace`
        const uuid = `${name.toLowerCase()}-options-uuid`
        const file = new File(['options test'], 'options.txt', { type: 'text/plain' })

        if (name === 'Datalake') {
          Object.defineProperty(file, 'size', { value: 1024 }) // Ensure small file for XHR upload
        }

        mockUploadXhr.mockResolvedValueOnce({ status: 200 })
        mockUploadMultipart.mockResolvedValueOnce()

        await storage.uploadFile(token, workspace, uuid, file, options)

        if (name === 'Datalake' && file.size <= 10 * 1024 * 1024) {
          expect(mockUploadXhr).toHaveBeenCalledWith(expect.any(Object), options)
        } else if (name !== 'Datalake') {
          expect(mockUploadXhr).toHaveBeenCalledWith(expect.any(Object), options)
        }

        // Reset mocks for next iteration
        mockUploadXhr.mockClear()
        mockUploadMultipart.mockClear()
      }
    })
  })
})
