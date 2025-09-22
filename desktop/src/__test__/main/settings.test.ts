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

import { Settings } from '../../main/settings'
import { PackedConfig } from '../../main/config'

const createMockStore = (): { get: jest.Mock, set: jest.Mock } => {
  const store: Record<string, any> = {}
  return {
    get: jest.fn((key: string) => store[key]),
    set: jest.fn((key: string, value: any) => { store[key] = value })
  }
}

jest.mock('electron-store', () => {
  return jest.fn()
})

describe('Settings', () => {
  let originalEnvironment: NodeJS.ProcessEnv
  let stubStoreInstance: ReturnType<typeof createMockStore>

  beforeEach(() => {
    originalEnvironment = process.env
    process.env = { ...originalEnvironment }
    stubStoreInstance = createMockStore()
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnvironment
    jest.clearAllMocks()
  })

  describe('readServerUrl', () => {
    test('isDev is true', () => {
      const systemUnderTest = new Settings(stubStoreInstance as any, true)

      const actualUrl = systemUnderTest.readServerUrl()

      expect(actualUrl).toBe('http://huly.local:8087')
    })

    test('isDev is true and FRONT_URL is set', () => {
      process.env.FRONT_URL = 'http://custom-dev.local:3000'
      const systemUnderTest = new Settings(stubStoreInstance as any, true)

      const actualUrl = systemUnderTest.readServerUrl()

      expect(actualUrl).toBe('http://custom-dev.local:3000')
    })

    test('isDev is false and server is in store', () => {
      const expectedUrl = 'https://stored.server.com'
      stubStoreInstance.get.mockReturnValue(expectedUrl)
      const systemUnderTest = new Settings(stubStoreInstance as any, false)

      const actualUrl = systemUnderTest.readServerUrl()

      expect(actualUrl).toBe(expectedUrl)
    })

    test('store is empty and packed config exists', () => {
      stubStoreInstance.get.mockReturnValue(undefined)
      const expectedUrl = 'https://packed.server.com'
      const packedConfig: PackedConfig = { server: expectedUrl }
      const systemUnderTest = new Settings(stubStoreInstance as any, false, packedConfig)

      const actualUrl = systemUnderTest.readServerUrl()

      expect(actualUrl).toBe(expectedUrl)
    })

    test('store and packed config are empty', () => {
      stubStoreInstance.get.mockReturnValue(undefined)
      const expectedUrl = 'https://env.server.com'
      process.env.FRONT_URL = expectedUrl
      const systemUnderTest = new Settings(stubStoreInstance as any, false)

      const actualUrl = systemUnderTest.readServerUrl()

      expect(actualUrl).toBe(expectedUrl)
    })

    test('all options are unavailable', () => {
      stubStoreInstance.get.mockReturnValue(undefined)
      delete process.env.FRONT_URL
      const systemUnderTest = new Settings(stubStoreInstance as any, false)

      const result = systemUnderTest.readServerUrl()

      expect(result).toBe('https://huly.app')
    })

    test('all (store, packed config, environment) options are available', () => {
      const expectedUrl = 'https://store.priority.com'
      stubStoreInstance.get.mockReturnValue(expectedUrl)
      process.env.FRONT_URL = 'https://env.server.com'
      const packedConfig: PackedConfig = { server: 'https://packed.server.com' }
      const systemUnderTest = new Settings(stubStoreInstance as any, false, packedConfig)

      const actualUrl = systemUnderTest.readServerUrl()

      expect(actualUrl).toBe(expectedUrl)
    })
  })

  describe('read/write', () => {
    let systemUnderTest: Settings
    beforeEach(() => {
      systemUnderTest = new Settings(stubStoreInstance as any, false)
    })

    describe('isMinimizeToTrayEnabled', () => {
      test.each([
        { storedValue: true, expected: true, description: 'stored value is true' },
        { storedValue: false, expected: false, description: 'stored value is false' }
      ])('$description', ({ storedValue, expected }) => {
        stubStoreInstance.get.mockReturnValue(storedValue)

        const actualValue = systemUnderTest.isMinimizeToTrayEnabled()

        expect(actualValue).toBe(expected)
      })

      test.each([
        { storedValue: undefined, description: 'no value is stored (undefined)' },
        { storedValue: null, description: 'stored value is null' }
      ])('$description', ({ storedValue }) => {
        stubStoreInstance.get.mockReturnValue(storedValue)

        const actualValue = systemUnderTest.isMinimizeToTrayEnabled()

        expect(actualValue).toBe(false)
      })
    })

    describe('setMinimizeToTrayEnabled', () => {
      test.each([
        { value: true, description: 'stored value is true' },
        { value: false, description: 'stored value is false' }
      ])('$description', ({ value }) => {
        systemUnderTest.setMinimizeToTrayEnabled(value)

        expect(systemUnderTest.isMinimizeToTrayEnabled()).toBe(value)
      })
    })

    describe('setServerUrl', () => {
      test('write than read', () => {
        const expectedUrl = 'https://new.server.com'

        systemUnderTest.setServerUrl(expectedUrl)

        expect(systemUnderTest.readServerUrl()).toBe(expectedUrl)
      })
    })

    describe('getWindowBounds', () => {
      test('read', () => {
        const expectedValue = { x: 100, y: 300, width: 500, height: 700 }
        stubStoreInstance.get.mockReturnValue(expectedValue)

        const actulValue = systemUnderTest.getWindowBounds()

        expect(actulValue).toEqual(expectedValue)
      })

      test('no bounds are stored', () => {
        stubStoreInstance.get.mockReturnValue(undefined)

        expect(systemUnderTest.getWindowBounds()).toBeUndefined()
      })
    })

    describe('setWindowBounds', () => {
      test('write than read', () => {
        const expectedValue = { x: 100, y: 200, width: 800, height: 600 }

        systemUnderTest.setWindowBounds(expectedValue)

        expect(systemUnderTest.getWindowBounds()).toBe(expectedValue)
      })
    })
  })
})
