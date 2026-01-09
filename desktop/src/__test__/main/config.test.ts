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

// Mock electron app before importing config
const mockApp = {
  getPath: jest.fn((name: string) => {
    if (name === 'userData') {
      return '/mock/userData'
    }
    return `/mock/${name}`
  }),
  getName: jest.fn(() => 'TestApp')
}

jest.mock('electron', () => ({
  app: mockApp
}))

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}

jest.mock('fs', () => mockFs)

import { readPackedConfig, PackedConfig } from '../../main/config'

describe('config', () => {
  let originalResourcesPath: string | undefined
  let originalVersion: string | undefined
  let originalConsoleError: typeof console.error
  let originalConsoleLog: typeof console.log

  beforeEach(() => {
    originalResourcesPath = (process as any).resourcesPath
    originalVersion = process.env.VERSION
    originalConsoleError = console.error
    originalConsoleLog = console.log

    // Setup default mocks
    ;(process as any).resourcesPath = '/mock/resources'
    process.env.VERSION = '1.0.0'
    console.error = jest.fn()
    console.log = jest.fn()

    // Reset all mocks
    jest.clearAllMocks()
    mockFs.existsSync.mockReturnValue(false)
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })
    mockFs.writeFileSync.mockReturnValue(undefined)
    mockFs.mkdirSync.mockReturnValue(undefined)
  })

  afterEach(() => {
    ;(process as any).resourcesPath = originalResourcesPath
    if (originalVersion !== undefined) {
      process.env.VERSION = originalVersion
    } else {
      delete process.env.VERSION
    }
    console.error = originalConsoleError
    console.log = originalConsoleLog
  })

  describe('readPackedConfig', () => {
    describe('migration on first run', () => {
      test('does not migrate bundled config to userData when userData config does not exist', () => {
        const bundledConfig: PackedConfig = {
          server: 'https://app.example.com',
          updatesChannelKey: 'test'
        }

        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return false
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/resources/config/config.json') {
            return JSON.stringify(bundledConfig)
          }
          throw new Error('File not found')
        })

        const result = readPackedConfig()

        // Should fallback to bundled config without _version (migration doesn't set it)
        expect(result).toEqual(bundledConfig)
        expect(mockFs.writeFileSync).not.toHaveBeenCalled()
      })

      test('does not create userData directory if it does not exist', () => {
        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return false
          if (filePath === '/mock/userData/config.json') return false
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockReturnValue(JSON.stringify({ server: 'https://app.example.com' }))

        readPackedConfig()

        expect(mockFs.mkdirSync).not.toHaveBeenCalled()
      })
    })

    describe('config update on version change', () => {
      test('updates userData config when bundled config version is newer', () => {
        const oldUserDataConfig: PackedConfig = {
          server: 'https://old.server.com',
          updatesChannelKey: 'old',
          _version: '0.9.0'
        }

        const newBundledConfig: PackedConfig = {
          server: 'https://new.server.com',
          updatesChannelKey: 'new'
        }

        let readCallCount = 0
        let writeCallCount = 0
        const mergedConfig = {
          ...oldUserDataConfig,
          ...newBundledConfig,
          _version: '1.0.0'
        }

        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return true
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          readCallCount++
          if (filePath === '/mock/userData/config.json') {
            if (readCallCount === 1) {
              // First read: old userData config (during migration check)
              return JSON.stringify(oldUserDataConfig)
            }
            // After write, return merged config
            if (writeCallCount > 0) {
              return JSON.stringify(mergedConfig)
            }
            return JSON.stringify(oldUserDataConfig)
          }
          if (filePath === '/mock/resources/config/config.json') {
            return JSON.stringify(newBundledConfig)
          }
          throw new Error('File not found')
        })

        mockFs.writeFileSync.mockImplementation(() => {
          writeCallCount++
        })

        const result = readPackedConfig()

        // Merged config: userData base, bundled overwrites, version updated
        expect(result).toEqual({
          server: 'https://new.server.com', // Bundled overwrites
          updatesChannelKey: 'new', // Bundled overwrites
          _version: '1.0.0' // Updated to bundled version
        })

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/mock/userData/config.json',
          JSON.stringify(mergedConfig, null, 2),
          'utf8'
        )
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Updated userData config with new bundled config values'),
          expect.any(String)
        )
      })

      test('does not update userData config when versions match', () => {
        const userDataConfig: PackedConfig = {
          server: 'https://user.server.com',
          _version: '1.0.0'
        }

        const bundledConfig: PackedConfig = {
          server: 'https://bundled.server.com'
        }

        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return true
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData/config.json') {
            return JSON.stringify(userDataConfig)
          }
          if (filePath === '/mock/resources/config/config.json') {
            return JSON.stringify(bundledConfig)
          }
          return '{}'
        })

        const result = readPackedConfig()

        // Should return userData config without modification
        expect(result).toEqual(userDataConfig)
        expect(mockFs.writeFileSync).not.toHaveBeenCalled()
      })
    })

    describe('reading config', () => {
      test('reads from userData config when it exists', () => {
        const userDataConfig: PackedConfig = {
          server: 'https://userdata.server.com',
          updatesChannelKey: 'userdata'
        }

        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData/config.json') {
            return JSON.stringify(userDataConfig)
          }
          return '{}'
        })

        const result = readPackedConfig()

        expect(result).toEqual(userDataConfig)
        expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/userData/config.json', 'utf8')
      })

      test('falls back to bundled config when userData config does not exist', () => {
        const bundledConfig: PackedConfig = {
          server: 'https://bundled.server.com'
        }

        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return false
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/resources/config/config.json') {
            return JSON.stringify(bundledConfig)
          }
          throw new Error('File not found')
        })

        const result = readPackedConfig()

        // Should fallback to bundled config without _version (migration doesn't set it)
        expect(result).toEqual(bundledConfig)
      })

      test('returns undefined when no config exists', () => {
        mockFs.existsSync.mockReturnValue(false)
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('File not found')
        })

        const result = readPackedConfig()

        expect(result).toBeUndefined()
      })
    })

    describe('error handling', () => {
      test('handles corrupted userData config by falling back to bundled config', () => {
        const bundledConfig: PackedConfig = {
          server: 'https://bundled.server.com'
        }

        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return true
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData/config.json') {
            // First read fails (corrupted) - this happens in migrateConfigIfNeeded
            // Second read also fails - this happens in readPackedConfig
            throw new Error('Invalid JSON')
          }
          if (filePath === '/mock/resources/config/config.json') {
            return JSON.stringify(bundledConfig)
          }
          throw new Error('File not found')
        })

        const result = readPackedConfig()

        // Should fallback to bundled config without _version (migration doesn't set it)
        expect(result).toEqual(bundledConfig)
        expect(mockFs.writeFileSync).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalled()
      })

      test('handles missing bundled config gracefully', () => {
        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return false
          if (filePath === '/mock/resources/config/config.json') return false
          return false
        })

        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('File not found')
        })

        const result = readPackedConfig()

        expect(result).toBeUndefined()
        expect(mockFs.writeFileSync).not.toHaveBeenCalled()
      })

      test('handles file system errors during migration', () => {
        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return false
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('Permission denied')
        })

        const result = readPackedConfig()

        expect(result).toBeUndefined()
        // Migration catches errors, so we should see the error logged
        expect(console.error).toHaveBeenCalled()
      })
    })

    describe('merge behavior', () => {
      test('preserves userData fields not in bundled config', () => {
        const userDataConfig: PackedConfig = {
          server: 'https://old.server.com',
          updatesChannelKey: 'custom',
          _version: '0.9.0',
          // @ts-expect-error - testing custom field preservation
          customField: 'user-value'
        }

        const bundledConfig: PackedConfig = {
          server: 'https://new.server.com'
          // updatesChannelKey not in bundled - when spread, undefined values don't overwrite
        }

        let readCallCount = 0
        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return true
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          readCallCount++
          if (filePath === '/mock/userData/config.json') {
            if (readCallCount === 1) {
              return JSON.stringify(userDataConfig)
            }
            // After merge: userData base, bundled overwrites defined fields only
            // Since updatesChannelKey is not in bundled, it's preserved from userData
            const merged = {
              ...userDataConfig,
              ...bundledConfig,
              _version: '1.0.0'
            }
            // updatesChannelKey from userData is preserved because bundled doesn't have it
            merged.updatesChannelKey = userDataConfig.updatesChannelKey
            return JSON.stringify(merged)
          }
          if (filePath === '/mock/resources/config/config.json') {
            return JSON.stringify(bundledConfig)
          }
          throw new Error('File not found')
        })

        const result = readPackedConfig()

        // Bundled overwrites server, but userData updatesChannelKey should be preserved
        expect(result?.server).toBe('https://new.server.com')
        expect(result?.updatesChannelKey).toBe('custom') // Preserved from userData (not in bundled)
        expect(result?._version).toBe('1.0.0')
      })

      test('handles QMS server URL update scenario', () => {
        const oldUserDataConfig: PackedConfig = {
          server: 'https://old.tracex.co',
          updatesChannelKey: 'tracex',
          _version: '0.7.100'
        }

        const newBundledConfig: PackedConfig = {
          server: 'https://app.tracex.co/',
          updatesChannelKey: 'tracex'
        }

        let readCallCount = 0
        mockFs.existsSync.mockImplementation((filePath: string) => {
          if (filePath === '/mock/userData') return true
          if (filePath === '/mock/userData/config.json') return true
          if (filePath === '/mock/resources/config/config.json') return true
          return false
        })

        mockFs.readFileSync.mockImplementation((filePath: string) => {
          readCallCount++
          if (filePath === '/mock/userData/config.json') {
            if (readCallCount === 1) {
              return JSON.stringify(oldUserDataConfig)
            }
            // After merge, return merged config
            return JSON.stringify({
              ...oldUserDataConfig,
              ...newBundledConfig,
              _version: '1.0.0'
            })
          }
          if (filePath === '/mock/resources/config/config.json') {
            return JSON.stringify(newBundledConfig)
          }
          throw new Error('File not found')
        })

        const result = readPackedConfig()

        // Server URL should be updated from bundled config
        expect(result?.server).toBe('https://app.tracex.co/')
        expect(result?.updatesChannelKey).toBe('tracex')
        expect(result?._version).toBe('1.0.0')
      })
    })
  })
})
