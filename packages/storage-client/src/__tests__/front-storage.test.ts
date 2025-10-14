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

import { FrontStorage } from '../client/front'
import * as upload from '../upload'

// Mock the upload module
jest.mock('../upload')
const mockUploadXhr = jest.mocked(upload.uploadXhr)

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('FrontStorage', () => {
  let storage: FrontStorage
  const baseUrl = 'https://files.example.com'

  beforeEach(() => {
    storage = new FrontStorage(baseUrl)
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockUploadXhr.mockClear()
  })

  describe('getFileUrl', () => {
    it('should generate correct URL with file ID only', () => {
      const workspace = 'test-workspace'
      const file = 'file-123'

      const url = storage.getFileUrl(workspace, file)

      expect(url).toBe(`${baseUrl}/${workspace}/${file}?file=${file}&workspace=${workspace}`)
    })

    it('should generate correct URL with custom filename', () => {
      const workspace = 'test-workspace'
      const file = 'file-123'
      const filename = 'document.pdf'

      const url = storage.getFileUrl(workspace, file, filename)

      expect(url).toBe(`${baseUrl}/${workspace}/${filename}?file=${file}&workspace=${workspace}`)
    })

    it('should handle special characters in workspace and file names', () => {
      const workspace = 'test workspace'
      const file = 'file 123'
      const filename = 'my document.pdf'

      const url = storage.getFileUrl(workspace, file, filename)

      expect(url).toBe(`${baseUrl}/${workspace}/${filename}?file=${file}&workspace=${workspace}`)
    })

    it('should handle base URL with trailing slash', () => {
      const storageWithSlash = new FrontStorage('https://files.example.com/')
      const workspace = 'test-workspace'
      const file = 'file-123'

      const url = storageWithSlash.getFileUrl(workspace, file)

      expect(url).toBe('https://files.example.com/test-workspace/file-123?file=file-123&workspace=test-workspace')
    })

    it('should handle base URL without trailing slash', () => {
      const storageWithoutSlash = new FrontStorage('https://files.example.com')
      const workspace = 'test-workspace'
      const file = 'file-123'

      const url = storageWithoutSlash.getFileUrl(workspace, file)

      expect(url).toBe('https://files.example.com/test-workspace/file-123?file=file-123&workspace=test-workspace')
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

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/${workspace}/${file}?file=${file}&workspace=${workspace}`, {
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

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/${workspace}/${file}?file=${file}&workspace=${workspace}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
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
    it('should upload file successfully', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'file-uuid-123'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalledWith(
        {
          url: `${baseUrl}/${workspace}`,
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
      expect(uploadedFile.name).toBe(uuid)
      expect(uploadedFile.type).toBe('text/plain')
    })

    it('should upload file with progress tracking', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'file-uuid-123'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const onProgress = jest.fn()

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      await storage.uploadFile(token, workspace, uuid, file, { onProgress })

      expect(mockUploadXhr).toHaveBeenCalledWith(
        {
          url: `${baseUrl}/${workspace}`,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: expect.any(FormData)
        },
        { onProgress }
      )
    })

    it('should upload file with abort signal', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'file-uuid-123'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const controller = new AbortController()

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      await storage.uploadFile(token, workspace, uuid, file, { signal: controller.signal })

      expect(mockUploadXhr).toHaveBeenCalledWith(
        {
          url: `${baseUrl}/${workspace}`,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: expect.any(FormData)
        },
        { signal: controller.signal }
      )
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

      mockUploadXhr.mockResolvedValueOnce({ status: 201 })

      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/${workspace}`,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }),
        undefined
      )

      const formData = (mockUploadXhr.mock.calls[0][0] as any).body as FormData
      const uploadedFile = formData.get('file') as File
      expect(uploadedFile).toBeInstanceOf(File)
      expect(uploadedFile.name).toBe(uuid)
      expect(uploadedFile.type).toBe('image/png')
    })

    it('should handle empty files', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'empty-uuid-123'
      const file = new File([''], 'empty.txt', { type: 'text/plain' })

      mockUploadXhr.mockResolvedValueOnce({ status: 200 })

      await storage.uploadFile(token, workspace, uuid, file)

      expect(mockUploadXhr).toHaveBeenCalled()
      const formData = (mockUploadXhr.mock.calls[0][0] as any).body as FormData
      const uploadedFile = formData.get('file') as File
      expect(uploadedFile).toBeInstanceOf(File)
      expect(uploadedFile.name).toBe(uuid)
      expect(uploadedFile.type).toBe('text/plain')
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete file lifecycle', async () => {
      const token = 'test-token'
      const workspace = 'test-workspace'
      const uuid = 'lifecycle-uuid'
      const file = new File(['test content'], 'lifecycle.txt', { type: 'text/plain' })

      // Upload file
      mockUploadXhr.mockResolvedValueOnce({ status: 200 })
      await storage.uploadFile(token, workspace, uuid, file)

      // Get file URL
      const url = storage.getFileUrl(workspace, uuid, 'lifecycle.txt')
      expect(url).toContain(uuid)
      expect(url).toContain('lifecycle.txt')

      // Get file meta (should return empty object for FrontStorage)
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
