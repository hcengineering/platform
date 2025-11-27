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
import { DatalakeStorage } from '../client/datalake'
import { FrontStorage } from '../client/front'
import { HulylakeStorage } from '../client/hulylake'

describe('createFileStorage factory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('DatalakeStorage creation', () => {
    it('should create DatalakeStorage when datalakeUrl is provided', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: 'https://datalake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
    })

    it('should create DatalakeStorage when both datalakeUrl and hulylakeUrl are provided (datalake takes precedence)', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: 'https://datalake.example.com',
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
    })

    it('should create DatalakeStorage when datalakeUrl is non-empty string', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: 'https://datalake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
    })

    it('should not create DatalakeStorage when datalakeUrl is empty string', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: ''
      }

      const storage = createFileStorage(config)

      expect(storage).not.toBeInstanceOf(DatalakeStorage)
      expect(storage).toBeInstanceOf(FrontStorage)
    })

    it('should not create DatalakeStorage when datalakeUrl is undefined', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: undefined
      }

      const storage = createFileStorage(config)

      expect(storage).not.toBeInstanceOf(DatalakeStorage)
      expect(storage).toBeInstanceOf(FrontStorage)
    })
  })

  describe('HulylakeStorage creation', () => {
    it('should create HulylakeStorage when hulylakeUrl is provided and datalakeUrl is not', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(HulylakeStorage)
    })

    it('should create HulylakeStorage when hulylakeUrl is provided and datalakeUrl is empty', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: '',
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(HulylakeStorage)
    })

    it('should create HulylakeStorage when hulylakeUrl is provided and datalakeUrl is undefined', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: undefined,
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(HulylakeStorage)
    })

    it('should not create HulylakeStorage when hulylakeUrl is empty string', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        hulylakeUrl: ''
      }

      const storage = createFileStorage(config)

      expect(storage).not.toBeInstanceOf(HulylakeStorage)
      expect(storage).toBeInstanceOf(FrontStorage)
    })

    it('should not create HulylakeStorage when hulylakeUrl is undefined', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        hulylakeUrl: undefined
      }

      const storage = createFileStorage(config)

      expect(storage).not.toBeInstanceOf(HulylakeStorage)
      expect(storage).toBeInstanceOf(FrontStorage)
    })
  })

  describe('FrontStorage creation', () => {
    it('should create FrontStorage when only uploadUrl is provided', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(FrontStorage)
    })

    it('should create FrontStorage when all URLs are empty strings', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: '',
        hulylakeUrl: ''
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(FrontStorage)
    })

    it('should create FrontStorage when all optional URLs are undefined', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: undefined,
        hulylakeUrl: undefined
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(FrontStorage)
    })

    it('should create FrontStorage as fallback', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(FrontStorage)
    })
  })

  describe('priority and precedence', () => {
    it('should prioritize DatalakeStorage over HulylakeStorage', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: 'https://datalake.example.com',
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
      expect(storage).not.toBeInstanceOf(HulylakeStorage)
    })

    it('should prioritize HulylakeStorage over FrontStorage', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(HulylakeStorage)
      expect(storage).not.toBeInstanceOf(FrontStorage)
    })

    it('should use FrontStorage when no specialized storage is available', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(FrontStorage)
      expect(storage).not.toBeInstanceOf(DatalakeStorage)
      expect(storage).not.toBeInstanceOf(HulylakeStorage)
    })
  })

  describe('URL handling', () => {
    it('should pass correct URL to DatalakeStorage', () => {
      const datalakeUrl = 'https://datalake.example.com'
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl
      }

      const storage = createFileStorage(config) as DatalakeStorage

      // Test that the URL was passed correctly by checking the generated file URL
      const fileUrl = storage.getFileUrl('test-workspace', 'test-file', 'test.txt')
      expect(fileUrl).toContain(datalakeUrl)
    })

    it('should pass correct URL to HulylakeStorage', () => {
      const hulylakeUrl = 'https://hulylake.example.com'
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        hulylakeUrl
      }

      const storage = createFileStorage(config) as HulylakeStorage

      // Test that the URL was passed correctly by checking the generated file URL
      const fileUrl = storage.getFileUrl('test-workspace', 'test-file', 'test.txt')
      expect(fileUrl).toContain(hulylakeUrl)
    })

    it('should pass correct URL to FrontStorage', () => {
      const uploadUrl = 'https://upload.example.com'
      const config: FileStorageConfig = {
        uploadUrl
      }

      const storage = createFileStorage(config) as FrontStorage

      // Test that the URL was passed correctly by checking the generated file URL
      const fileUrl = storage.getFileUrl('test-workspace', 'test-file', 'test.txt')
      expect(fileUrl).toContain(uploadUrl)
    })
  })

  describe('edge cases', () => {
    it('should handle config with extra properties', () => {
      const config: FileStorageConfig & { extraProp: string } = {
        uploadUrl: 'https://upload.example.com',
        datalakeUrl: 'https://datalake.example.com',
        extraProp: 'ignored'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
    })

    it('should handle URLs with trailing slashes', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com/',
        datalakeUrl: 'https://datalake.example.com/'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
    })

    it('should handle URLs without trailing slashes', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com',
        hulylakeUrl: 'https://hulylake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(HulylakeStorage)
    })

    it('should handle URLs with different protocols', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'http://upload.example.com',
        datalakeUrl: 'http://datalake.example.com'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
    })

    it('should handle URLs with ports', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'https://upload.example.com:8080',
        hulylakeUrl: 'https://hulylake.example.com:9090'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(HulylakeStorage)
    })

    it('should handle localhost URLs', () => {
      const config: FileStorageConfig = {
        uploadUrl: 'http://localhost:3000',
        datalakeUrl: 'http://localhost:4000'
      }

      const storage = createFileStorage(config)

      expect(storage).toBeInstanceOf(DatalakeStorage)
    })
  })
})
