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

import { HulylakeStorage } from '../client/hulylake'
import * as upload from '../upload'

// Mock the upload module
jest.mock('../upload')
const mockUploadXhr = jest.mocked(upload.uploadXhr)

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('HulylakeStorage', () => {
  let storage: HulylakeStorage
  const baseUrl = 'https://hulylake.example.com'

  beforeEach(() => {
    storage = new HulylakeStorage(baseUrl)
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockUploadXhr.mockClear()
  })

  describe('getFileUrl', () => {
    it('should generate correct URL', () => {
      const workspace = 'test-workspace'
      const file = 'file-123'

      const url = storage.getFileUrl(workspace, file)

      expect(url).toBe(`${baseUrl}/api/${workspace}/${file}`)
    })

    it('should handle special characters in workspace and file names', () => {
      const workspace = 'test workspace'
      const file = 'file 123'

      const url = storage.getFileUrl(workspace, file)

      expect(url).toBe(`${baseUrl}/api/${workspace}/${file}`)
    })

    it('should handle base URL with trailing slash', () => {
      const storageWithSlash = new HulylakeStorage('https://hulylake.example.com/')
      const workspace = 'test-workspace'
      const file = 'file-123'

      const url = storageWithSlash.getFileUrl(workspace, file)

      expect(url).toBe('https://hulylake.example.com/api/test-workspace/file-123')
    })

    it('should handle base URL without trailing slash', () => {
      const storageWithoutSlash = new HulylakeStorage('https://hulylake.example.com')
      const workspace = 'test-workspace'
      const file = 'file-123'

      const url = storageWithoutSlash.getFileUrl(workspace, file)

      expect(url).toBe('https://hulylake.example.com/api/test-workspace/file-123')
    })

    it('should ignore filename parameter', () => {
      const workspace = 'test-workspace'
      const file = 'file-123'
      const filename = 'ignored.txt'

      // The current implementation ignores the filename parameter
      const url = storage.getFileUrl(workspace, file, filename)

      expect(url).toBe(`${baseUrl}/api/${workspace}/${file}`)
    })
  })

  describe('getFileMeta', () => {
    it('should return empty object', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const file = 'file-123'

      const meta = await storage.getFileMeta(token, workspace, file)

      expect(meta).toEqual({})
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

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/${workspace}/${file}`, {
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
    it('should upload file successfully with PUT method', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'file-uuid-123'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      mockUploadXhr.mockResolvedValueOnce({ status: 200, responseText: '' })

      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalledWith(
        {
          url: `${baseUrl}/api/${workspace}/${uuid}`,
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': file.type,
            'Content-Length': file.size.toString()
          },
          body: file
        },
        undefined
      )
    })

    it('should upload file with progress tracking', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'file-uuid-123'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const onProgress = jest.fn()

      mockUploadXhr.mockResolvedValueOnce({ status: 200, responseText: '' })

      await storage.uploadFile(token, workspace, uuid, file, { onProgress })

      expect(mockUploadXhr).toHaveBeenCalledWith(expect.any(Object), { onProgress })
    })

    it('should upload file with abort signal', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'file-uuid-123'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const controller = new AbortController()

      mockUploadXhr.mockResolvedValueOnce({ status: 200, responseText: '' })

      await storage.uploadFile(token, workspace, uuid, file, { signal: controller.signal })

      expect(mockUploadXhr).toHaveBeenCalledWith(expect.any(Object), { signal: controller.signal })
    })

    it('should handle upload errors', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'file-uuid-123'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      mockUploadXhr.mockRejectedValueOnce(new Error('Upload failed'))

      await expect(storage.uploadFile(token, workspace, uuid, file)).rejects.toThrow('Upload failed')
    })

    it('should handle different file types', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'image-uuid-123'
      const file = new File(['binary data'], 'image.png', { type: 'image/png' })

      mockUploadXhr.mockResolvedValueOnce({ status: 201, responseText: '' })

      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'image/png'
          }),
          body: file
        }),
        undefined
      )
    })

    it('should handle empty files', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'empty-uuid-123'
      const file = new File([''], 'empty.txt', { type: 'text/plain' })

      mockUploadXhr.mockResolvedValueOnce({ status: 200, responseText: '' })

      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          body: file
        }),
        undefined
      )
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete file lifecycle', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'lifecycle-uuid'
      const filename = 'lifecycle.txt'
      const file = new File(['test content'], filename, { type: 'text/plain' })

      // Upload file
      mockUploadXhr.mockResolvedValueOnce({ status: 200, responseText: '' })
      await storage.uploadFile(token, workspace, uuid, file)

      // Get file URL
      const url = storage.getFileUrl(workspace, uuid, filename)
      expect(url).toBe(`${baseUrl}/api/${workspace}/${uuid}`)

      // Get file meta (should return empty object for HulylakeStorage)
      const meta = await storage.getFileMeta(token, workspace, uuid)
      expect(meta).toEqual({})

      // Delete file
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })
      await storage.deleteFile(token, workspace, uuid)

      expect(mockUploadXhr).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
