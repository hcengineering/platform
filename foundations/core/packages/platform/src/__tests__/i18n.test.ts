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
import platform, { getEmbeddedLabel, plugin } from '../platform'
import { Severity, Status } from '../status'

import { addStringsLoader, loadPluginStrings, translate, translateCB } from '../i18n'
import { addEventListener, PlatformEvent, removeEventListener } from '../event'

function translateCBAsync (
  message: IntlString,
  params: Record<string, any>,
  language: string | undefined
): Promise<string> {
  return new Promise((resolve) => {
    translateCB(message, params, language, resolve)
  })
}

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

  it('translateCB should resolve with message when bad id (_parseId throws)', async () => {
    expect.assertions(2)
    const message = 'invalidIntlIdCB' as IntlString
    const checkStatus = new Status(Severity.ERROR, platform.status.InvalidId, { id: message })
    const eventListener = async (event: string, data: any): Promise<void> => {
      expect(data).toEqual(checkStatus)
    }
    addEventListener(PlatformEvent, eventListener)
    const out = await translateCBAsync(message, {}, 'en')
    expect(out).toBe(message)
    removeEventListener(PlatformEvent, eventListener)
  })

  it('translateCB should match translate for loaded string', async () => {
    const fromTranslate = await translate(test.string.loadingPlugin, { plugin: 'cb' })
    const fromCB = await translateCBAsync(test.string.loadingPlugin, { plugin: 'cb' }, 'en')
    expect(fromCB).toBe(fromTranslate)
  })

  it('translate and translateCB should return embedded label text', async () => {
    const embedded = getEmbeddedLabel('Embedded copy')
    expect(await translate(embedded, {})).toBe('Embedded copy')
    expect(await translateCBAsync(embedded, {}, 'en')).toBe('Embedded copy')
  })

  it('loadPluginStrings(force) should clear format cache so strings still resolve', async () => {
    await translate(test.string.loadingPlugin, { plugin: 'before' })
    await loadPluginStrings('en', true)
    const after = await translate(test.string.loadingPlugin, { plugin: 'after' })
    expect(after).toContain('after')
  })

  it('translate with skipError should not broadcast platform status (no loader)', async () => {
    const pluginId = 'plugin-skip-error-no-loader'
    const message = `${pluginId}:string:any` as IntlString
    let events = 0
    const listener = async (): Promise<void> => {
      events++
    }
    addEventListener(PlatformEvent, listener)
    await translate(message, {}, 'en', true)
    removeEventListener(PlatformEvent, listener)
    expect(events).toBe(0)
  })

  it('translate should return message id and emit status when ICU format params are missing', async () => {
    const fmtPlugin = 'i18n-icu-format-test' as Plugin
    addStringsLoader(fmtPlugin, async () => ({
      string: {
        badPlural: '{dias, plural, =0 {} other {#d}} {horas, plural, =0 {} other {#h}}'
      }
    }))
    const message = `${fmtPlugin}:string:badPlural` as IntlString
    expect.assertions(2)
    let gotStatus = false
    const listener = async (_event: string, data: any): Promise<void> => {
      if (data instanceof Status) {
        gotStatus = true
      }
    }
    addEventListener(PlatformEvent, listener)
    const out = await translate(message, { days: 1, hours: 2 } as any, 'en')
    removeEventListener(PlatformEvent, listener)
    expect(out).toBe(message)
    expect(gotStatus).toBe(true)
  })

  it('translateCB should resolve to message id when ICU format params are missing', async () => {
    const fmtPlugin = 'i18n-icu-format-test-cb' as Plugin
    addStringsLoader(fmtPlugin, async () => ({
      string: {
        badPlural: '{dias, plural, =0 {} other {#d}}'
      }
    }))
    const message = `${fmtPlugin}:string:badPlural` as IntlString
    expect.assertions(2)
    let gotStatus = false
    const listener = async (_event: string, data: any): Promise<void> => {
      if (data instanceof Status) {
        gotStatus = true
      }
    }
    addEventListener(PlatformEvent, listener)
    const out = await translateCBAsync(message, { days: 1 }, 'en')
    removeEventListener(PlatformEvent, listener)
    expect(out).toBe(message)
    expect(gotStatus).toBe(true)
  })

  it('translateCB should defer to translate when translation is not yet cached', async () => {
    const deferPlugin = 'i18n-defer-translate' as Plugin
    const deferMsg = `${deferPlugin}:string:only` as IntlString
    addStringsLoader(deferPlugin, async (locale: string) => {
      if (locale === 'en') {
        return { string: { only: 'Deferred {v}' } }
      }
      return { string: { only: 'Deferred {v}' } }
    })
    const out = await translateCBAsync(deferMsg, { v: 'ok' }, 'en')
    expect(out).toBe('Deferred ok')
  })
})
