//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Plugin, IntlString } from '../platform'
import platform, { plugin } from '../platform'
import { Severity, Status } from '../status'

import { addStringsLoader, translate } from '../i18n'
import { addEventListener, PlatformEvent, removeEventListener } from '../event'

const testId = 'test-strings' as Plugin

const test = plugin(testId, {
  string: {
    loadingPlugin: '' as IntlString<{ plugin: string }>
  }
})

describe('i18n', () => {
  it('should translate string', async () => {
    addStringsLoader(testId, async (locale: string) => await import(`./lang/${locale}.json`))
    const translated = await translate(test.string.loadingPlugin, { plugin: 'xxx' })
    expect(translated).toBe('Loading plugin <b>xxx</b>...')
  })

  it('should return id when no translation found', async () => {
    const id = (testId + '.inexistent') as IntlString
    const inexistent = await translate(id, {})
    expect(inexistent).toBe(id)
  })

  it('should cache translated string', async () => {
    const translated = await translate(test.string.loadingPlugin, { plugin: 'xxx' })
    expect(translated).toBe('Loading plugin <b>xxx</b>...')
  })

  it('should emit status and return id when no loader', async () => {
    expect.assertions(2)
    const plugin = 'plugin-without-string-loader'
    const message = `${plugin}:string:id`

    const checkStatus = new Status(Severity.ERROR, platform.status.NoLoaderForStrings, { plugin })
    const eventListener = async (event: string, data: any): Promise<void> => {
      expect(data).toEqual(checkStatus)
    }
    addEventListener(PlatformEvent, eventListener)
    const translated = await translate(message as IntlString, {})
    expect(translated).toBe(message)
    removeEventListener(PlatformEvent, eventListener)
  })

  it('should emit status and return id when bad loader', async () => {
    expect.assertions(2)
    const plugin = 'component-for-bad-loader'
    const message = `${plugin}:string:id`
    const errorMessage = 'bad loader'
    addStringsLoader(plugin as Plugin, (locale: string) => {
      throw new Error(errorMessage)
    })

    const checkStatus = new Status(Severity.ERROR, platform.status.UnknownError, { message: errorMessage })
    const eventListener = async (event: string, data: any): Promise<void> => {
      expect(data).toEqual(checkStatus)
    }
    addEventListener(PlatformEvent, eventListener)
    const translated = await translate(message as IntlString, {})
    expect(translated).toBe(message)
    removeEventListener(PlatformEvent, eventListener)
  })

  it('should cache error', async () => {
    const plugin = 'component'
    const message = `${plugin}:string:id`

    const checkStatus = new Status(Severity.ERROR, platform.status.NoLoaderForStrings, { plugin })
    let calls = 0
    const eventListener = async (event: string, data: any): Promise<void> => {
      ++calls
      expect(data).toEqual(checkStatus)
    }

    addEventListener(PlatformEvent, eventListener)
    const t1 = await translate(message as IntlString, {})
    const t2 = await translate(message as IntlString, {})
    expect(t1).toBe(t2)
    removeEventListener(PlatformEvent, eventListener)
    expect(calls).toBe(1)
  })

  it('should return message when bad id', async () => {
    expect.assertions(2)
    const message = 'testMessage' as IntlString
    const checkStatus = new Status(Severity.ERROR, platform.status.InvalidId, { id: message })
    const eventListener = async (event: string, data: any): Promise<void> => {
      expect(data).toEqual(checkStatus)
    }
    addEventListener(PlatformEvent, eventListener)
    const translated = await translate(message, {})
    expect(translated).toBe(message)
    removeEventListener(PlatformEvent, eventListener)
  })
})
