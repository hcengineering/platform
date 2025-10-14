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

import { DatalakeStorage } from '../client/datalake'
import * as upload from '../upload'

// Mock the upload module
jest.mock('../upload')
const mockUploadXhr = jest.mocked(upload.uploadXhr)
const mockUploadMultipart = jest.mocked(upload.uploadMultipart)

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('DatalakeStorage', () => {
  let storage: DatalakeStorage
  const baseUrl = 'https://datalake.example.com'

  beforeEach(() => {
    storage = new DatalakeStorage(baseUrl)
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockUploadXhr.mockClear()
    mockUploadMultipart.mockClear()
  })

  describe('getFileUrl', () => {
    it('should generate correct URL with filename', () => {
      const workspace = 'test-workspace'
      const file = 'file-123'
      const filename = 'document.pdf'

      const url = storage.getFileUrl(workspace, file, filename)

      expect(url).toBe(`${baseUrl}/blob/${workspace}/${file}/${filename}`)
    })

    it('should generate correct URL without filename', () => {
      const workspace = 'test-workspace'
      const file = 'file-123'

      const url = storage.getFileUrl(workspace, file)

      expect(url).toBe(`${baseUrl}/blob/${workspace}/${file}`)
    })

    it('should handle special characters in parameters', () => {
      const workspace = 'test workspace'
      const file = 'file 123'
      const filename = 'my document.pdf'

      const url = storage.getFileUrl(workspace, file, filename)

      expect(url).toBe(`${baseUrl}/blob/${workspace}/${file}/${filename}`)
    })

    it('should handle base URL with trailing slash', () => {
      const storageWithSlash = new DatalakeStorage('https://datalake.example.com/')
      const workspace = 'test-workspace'
      const file = 'file-123'
      const filename = 'test.txt'

      const url = storageWithSlash.getFileUrl(workspace, file, filename)

      expect(url).toBe('https://datalake.example.com/blob/test-workspace/file-123/test.txt')
    })
  })

  describe('getFileMeta', () => {
    it('should fetch file metadata successfully', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const file = 'file-123'
      const expectedMeta = {
        size: 1024,
        contentType: 'text/plain',
        lastModified: '2023-01-01T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedMeta)
      })

      const meta = await storage.getFileMeta(token, workspace, file)

      expect(meta).toEqual(expectedMeta)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/meta/${encodeURIComponent(workspace)}/${encodeURIComponent(file)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
    })

    it('should return empty object when metadata fetch fails', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const file = 'file-123'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const meta = await storage.getFileMeta(token, workspace, file)

      expect(meta).toEqual({})
    })

    it('should return empty object when network error occurs', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const file = 'file-123'

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const meta = await storage.getFileMeta(token, workspace, file)

      expect(meta).toEqual({})
    })

    it('should handle special characters in workspace and file names', async () => {
      const token = 'test-token'
      const workspace = 'test workspace'
      const file = 'file 123'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await storage.getFileMeta(token, workspace, file)

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/meta/${encodeURIComponent(workspace)}/${encodeURIComponent(file)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const file = 'file-123'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      await storage.deleteFile(token, workspace, file)

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/blob/${workspace}/${file}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    })

    it('should throw error when delete fails', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const file = 'file-123'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(storage.deleteFile(token, workspace, file)).rejects.toThrow('Failed to delete file')
    })

    it('should handle network errors during delete', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const file = 'file-123'

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(storage.deleteFile(token, workspace, file)).rejects.toThrow('Network error')
    })
  })

  describe('uploadFile', () => {
    describe('small file upload (≤ 10MB)', () => {
      it('should upload small file using form-data', async () => {
        const token = 'test-token'
        const workspace = 'test-workspace'
        const uuid = 'file-uuid-123'
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }) // 5MB

        mockUploadXhr.mockResolvedValueOnce({ status: 200 })

        await storage.uploadFile(token, workspace, uuid, file)

        expect(mockUploadXhr).toHaveBeenCalledWith(
          {
            url: `${baseUrl}/upload/form-data/${encodeURIComponent(workspace)}`,
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: expect.any(FormData)
          },
          undefined
        )

        // Check FormData contents
        const uploadCall = mockUploadXhr.mock.calls[0]
        const formData = uploadCall[0].body as FormData
        const uploadedFile = formData.get('file') as File
        expect(uploadedFile).toBeInstanceOf(File)
        expect(uploadedFile.name).toBe(uuid) // DatalakeStorage renames the file to uuid

        expect(mockUploadMultipart).not.toHaveBeenCalled()
      })

      it('should upload exactly 10MB file using form-data', async () => {
        const token = 'test-token'
        const workspace = 'test-workspace'
        const uuid = 'file-uuid-123'
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }) // exactly 10MB

        mockUploadXhr.mockResolvedValueOnce({ status: 200 })

        await storage.uploadFile(token, workspace, uuid, file)

        expect(mockUploadXhr).toHaveBeenCalled()
        expect(mockUploadMultipart).not.toHaveBeenCalled()
      })

      it('should pass upload options to uploadXhr', async () => {
        const token = 'test-token'
        const workspace = 'test-workspace'
        const uuid = 'file-uuid-123'
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 1024 }) // 1KB
        const onProgress = jest.fn()
        const controller = new AbortController()

        mockUploadXhr.mockResolvedValueOnce({ status: 200 })

        await storage.uploadFile(token, workspace, uuid, file, {
          onProgress,
          signal: controller.signal
        })

        expect(mockUploadXhr).toHaveBeenCalledWith(expect.any(Object), { onProgress, signal: controller.signal })
      })
    })

    describe('large file upload (> 10MB)', () => {
      it('should upload large file using multipart', async () => {
        const token = 'test-token'
        const workspace = 'test-workspace'
        const uuid = 'large-file-uuid'
        const file = new File(['large content'], 'large.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB

        mockUploadMultipart.mockResolvedValueOnce()

        await storage.uploadFile(token, workspace, uuid, file)

        expect(mockUploadMultipart).toHaveBeenCalledWith(
          {
            url: `${baseUrl}/upload/multipart/${encodeURIComponent(workspace)}/${encodeURIComponent(uuid)}`,
            headers: { Authorization: `Bearer ${token}` },
            body: file
          },
          undefined
        )

        expect(mockUploadXhr).not.toHaveBeenCalled()
      })

      it('should pass upload options to uploadMultipart', async () => {
        const token = 'test-token'
        const workspace = 'test-workspace'
        const uuid = 'large-file-uuid'
        const file = new File(['large content'], 'large.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 }) // 20MB
        const onProgress = jest.fn()
        const controller = new AbortController()

        mockUploadMultipart.mockResolvedValueOnce()

        await storage.uploadFile(token, workspace, uuid, file, {
          onProgress,
          signal: controller.signal
        })

        expect(mockUploadMultipart).toHaveBeenCalledWith(expect.any(Object), { onProgress, signal: controller.signal })
      })

      it('should handle special characters in workspace and uuid for multipart', async () => {
        const token = 'test-token'
        const workspace = 'test workspace'
        const uuid = 'file uuid 123'
        const file = new File(['large content'], 'large.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB

        mockUploadMultipart.mockResolvedValueOnce()

        await storage.uploadFile(token, workspace, uuid, file)

        expect(mockUploadMultipart).toHaveBeenCalledWith(
          {
            url: `${baseUrl}/upload/multipart/${encodeURIComponent(workspace)}/${encodeURIComponent(uuid)}`,
            headers: { Authorization: `Bearer ${token}` },
            body: file
          },
          undefined
        )
      })
    })

    describe('error handling', () => {
      it('should handle small file upload errors', async () => {
        const token = 'test-token'
        const workspace = 'test-workspace'
        const uuid = 'file-uuid-123'
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

        mockUploadXhr.mockRejectedValueOnce(new Error('Upload failed'))

        await expect(storage.uploadFile(token, workspace, uuid, file)).rejects.toThrow('Upload failed')
      })

      it('should handle large file upload errors', async () => {
        const token = 'test-token'
        const workspace = 'test-workspace'
        const uuid = 'large-file-uuid'
        const file = new File(['large content'], 'large.txt', { type: 'text/plain' })
        Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB

        mockUploadMultipart.mockRejectedValueOnce(new Error('Multipart upload failed'))

        await expect(storage.uploadFile(token, workspace, uuid, file)).rejects.toThrow('Multipart upload failed')
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete file lifecycle with small file', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'lifecycle-uuid'
      const filename = 'lifecycle.txt'
      const file = new File(['test content'], filename, { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

      // Upload small file
      mockUploadXhr.mockResolvedValueOnce({ status: 200 })
      await storage.uploadFile(token, workspace, uuid, file)

      // Get file URL
      const url = storage.getFileUrl(workspace, uuid, filename)
      expect(url).toBe(`${baseUrl}/blob/${workspace}/${uuid}/${filename}`)

      // Get file meta
      const expectedMeta = { size: 1024, contentType: 'text/plain' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedMeta)
      })
      const meta = await storage.getFileMeta(token, workspace, uuid)
      expect(meta).toEqual(expectedMeta)

      // Delete file
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })
      await storage.deleteFile(token, workspace, uuid)

      expect(mockUploadXhr).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledTimes(2) // meta + delete
    })

    it('should handle complete file lifecycle with large file', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'large-lifecycle-uuid'
      const filename = 'large-lifecycle.txt'
      const file = new File(['large content'], filename, { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB

      // Upload large file
      mockUploadMultipart.mockResolvedValueOnce()
      await storage.uploadFile(token, workspace, uuid, file)

      // Get file URL
      const url = storage.getFileUrl(workspace, uuid, filename)
      expect(url).toBe(`${baseUrl}/blob/${workspace}/${uuid}/${filename}`)

      // Get file meta
      const expectedMeta = { size: 15 * 1024 * 1024, contentType: 'text/plain' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedMeta)
      })
      const meta = await storage.getFileMeta(token, workspace, uuid)
      expect(meta).toEqual(expectedMeta)

      // Delete file
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })
      await storage.deleteFile(token, workspace, uuid)

      expect(mockUploadMultipart).toHaveBeenCalledTimes(1)
      expect(mockUploadXhr).not.toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledTimes(2) // meta + delete
    })

    it('should handle upload size threshold boundary', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'

      // Test file exactly at 10MB (should use form-data)
      const smallUuid = 'small-boundary-uuid'
      const smallFile = new File(['content'], 'small.txt', { type: 'text/plain' })
      Object.defineProperty(smallFile, 'size', { value: 10 * 1024 * 1024 })

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })
      await storage.uploadFile(token, workspace, smallUuid, smallFile)
      expect(mockUploadXhr).toHaveBeenCalled()
      expect(mockUploadMultipart).not.toHaveBeenCalled()

      // Reset mocks
      mockUploadXhr.mockClear()
      mockUploadMultipart.mockClear()

      // Test file just over 10MB (should use multipart)
      const largeUuid = 'large-boundary-uuid'
      const largeFile = new File(['content'], 'large.txt', { type: 'text/plain' })
      Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 + 1 })

      mockUploadMultipart.mockResolvedValueOnce()
      await storage.uploadFile(token, workspace, largeUuid, largeFile)
      expect(mockUploadMultipart).toHaveBeenCalled()
      expect(mockUploadXhr).not.toHaveBeenCalled()
    })
  })
})
