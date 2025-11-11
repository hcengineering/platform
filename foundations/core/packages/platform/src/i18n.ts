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

import { IntlMessageFormat } from 'intl-messageformat'
import { setPlatformStatus } from './event'
import { _IdInfo, _parseId } from './ident'
import type { IntlString, Plugin } from './platform'
import { Severity, Status, unknownError } from './status'

import { getMetadata } from './metadata'
import platform, { _EmbeddedId } from './platform'

/**
 * @public
 */
export type Loader = (locale: string) => Promise<Record<string, string | Record<string, string>>>

type Messages = Record<string, IntlString | Record<string, IntlString>>

const loaders = new Map<Plugin, Loader>()
const translations = new Map<string, Map<Plugin, Messages | Status>>()
const cache = new Map<string, Map<IntlString, IntlMessageFormat | Status>>()
const englishTranslationsForMissing = new Map<Plugin, Messages | Status>()
/**
 * @public
 * @param plugin -
 * @param loader -
 */
export function addStringsLoader (plugin: Plugin, loader: Loader): void {
  loaders.set(plugin, loader)
}

/**
 * Perform load of all internationalization sources for all plugins available.
 * @public
 */
export async function loadPluginStrings (locale: string, force: boolean = false): Promise<void> {
  if (force) {
    cache.clear()
  }
  for (const [plugin] of loaders) {
    const localtTanslations = translations.get(locale) ?? new Map<Plugin, Messages | Status<any>>()
    if (!translations.has(locale)) {
      translations.set(locale, localtTanslations)
    }
    let messages = localtTanslations.get(plugin)
    if (messages === undefined || force) {
      messages = await loadTranslationsForComponent(plugin, locale)
      localtTanslations.set(plugin, messages)
    }
  }
}

async function loadTranslationsForComponent (plugin: Plugin, locale: string): Promise<Messages | Status> {
  const loader = loaders.get(plugin)
  if (loader === undefined) {
    const status = new Status(Severity.ERROR, platform.status.NoLoaderForStrings, { plugin })
    await setPlatformStatus(status)
    return status
  }
  try {
    return (await loader(locale)) as Record<string, IntlString> | Status
  } catch (err) {
    console.error('No translations found for plugin', plugin, err)
    try {
      return (await loader('en')) as Record<string, IntlString> | Status
    } catch (err: any) {
      const status = unknownError(err)
      await setPlatformStatus(status)
      return status
    }
  }
}

function getCachedTranslation (id: _IdInfo, locale: string): IntlString | Status | undefined {
  const localtTanslations = translations.get(locale)
  if (localtTanslations === undefined) {
    return undefined
  }
  const messages = localtTanslations.get(id.component)
  if (messages === undefined) {
    return undefined
  }
  if (messages instanceof Status) {
    return messages
  }
  if (id.kind !== undefined) {
    if ((messages[id.kind] as Record<string, IntlString>)?.[id.name] !== undefined) {
      return (messages[id.kind] as Record<string, IntlString>)?.[id.name]
    }
  }
}

async function getTranslation (id: _IdInfo, locale: string): Promise<IntlString | Status | undefined> {
  try {
    const localtTanslations = translations.get(locale) ?? new Map<Plugin, Messages | Status<any>>()
    if (!translations.has(locale)) {
      translations.set(locale, localtTanslations)
    }
    let messages = localtTanslations.get(id.component)
    if (messages === undefined) {
      messages = await loadTranslationsForComponent(id.component, locale)
      localtTanslations.set(id.component, messages)
    }
    if (messages instanceof Status) {
      return messages
    }
    if (id.kind !== undefined) {
      if ((messages[id.kind] as Record<string, IntlString>)?.[id.name] !== undefined) {
        return (messages[id.kind] as Record<string, IntlString>)?.[id.name]
      } else {
        let eng = englishTranslationsForMissing.get(id.component)
        if (eng === undefined) {
          eng = await loadTranslationsForComponent(id.component, 'en')
          englishTranslationsForMissing.set(id.component, eng)
        }
        if (eng instanceof Status) {
          return eng
        }
        return (eng[id.kind] as Record<string, IntlString>)?.[id.name]
      }
    } else {
      return messages[id.name] as IntlString
    }
  } catch (err) {
    const status = unknownError(err)
    await setPlatformStatus(status)
    return status
  }
}

/**
 * @public
 * @param message -
 * @param params -
 * @returns
 */
export async function translate<P extends Record<string, any>> (
  message: IntlString<P>,
  params: P,
  language?: string
): Promise<string> {
  const locale = language ?? getMetadata(platform.metadata.locale) ?? 'en'
  const localCache = cache.get(locale) ?? new Map<IntlString, IntlMessageFormat | Status>()
  if (!cache.has(locale)) {
    cache.set(locale, localCache)
  }
  const compiled = localCache.get(message)

  if (compiled !== undefined) {
    if (compiled instanceof Status) {
      return message
    }
    return compiled.format(params)
  } else {
    try {
      const id = _parseId(message)
      if (id.component === _EmbeddedId) {
        return id.name
      }
      const translation = getCachedTranslation(id, locale) ?? (await getTranslation(id, locale)) ?? message
      if (translation instanceof Status) {
        localCache.set(message, translation)
        return message
      }
      const compiled = new IntlMessageFormat(translation, locale, undefined, { ignoreTag: true })
      localCache.set(message, compiled)
      return compiled.format(params)
    } catch (err) {
      const status = unknownError(err)
      void setPlatformStatus(status)
      localCache.set(message, status)
      return message
    }
  }
}
/**
 * Will do a translation in case language file already in cache, a translate is called and Promise is returned overwise
 */
export function translateCB<P extends Record<string, any>> (
  message: IntlString<P>,
  params: P,
  language: string | undefined,
  resolve: (value: string) => void
): void {
  const locale = language ?? getMetadata(platform.metadata.locale) ?? 'en'
  const localCache = cache.get(locale) ?? new Map<IntlString, IntlMessageFormat | Status>()
  if (!cache.has(locale)) {
    cache.set(locale, localCache)
  }
  const compiled = localCache.get(message)

  if (compiled !== undefined) {
    if (compiled instanceof Status) {
      resolve(message)
      return
    }
    resolve(compiled.format(params))
  } else {
    let id: _IdInfo
    try {
      id = _parseId(message)
      if (id.component === _EmbeddedId) {
        resolve(id.name)
        return
      }
    } catch (err) {
      const status = unknownError(err)
      void setPlatformStatus(status)
      localCache.set(message, status)
      resolve(message)
      return
    }
    const translation = getCachedTranslation(id, locale)
    if (translation === undefined || translation instanceof Status) {
      void translate(message, params, language)
        .then((res) => {
          resolve(res)
        })
        .catch((err) => {
          const status = unknownError(err)
          void setPlatformStatus(status)
          localCache.set(message, status)
          resolve(message)
        })
      return
    }

    const compiled = new IntlMessageFormat(translation, locale, undefined, { ignoreTag: true })
    localCache.set(message, compiled)
    resolve(compiled.format(params))
  }
}
