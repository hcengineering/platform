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

async function setStatus (status: Status, skipError?: boolean): Promise<void> {
  if (skipError !== true) {
    await setPlatformStatus(status)
  }
}

/** Notify platform and return a Status for load/resolve paths that do not use the per-message format cache. */
async function pipelineErrorToStatus (err: unknown, skipError?: boolean): Promise<Status> {
  const status = unknownError(err)
  await setStatus(status, skipError)
  return status
}

/**
 * On compile/resolve failure: cache failure for this intl id, notify platform, return `message` as UI fallback.
 */
async function handleIntlPipelineFailure (
  err: unknown,
  message: IntlString,
  localeCache: Map<IntlString, IntlMessageFormat | Status>,
  skipError?: boolean
): Promise<IntlString> {
  const status = unknownError(err)
  localeCache.set(message, status)
  await setStatus(status, skipError)
  return message
}

async function loadTranslationsForComponent (
  plugin: Plugin,
  locale: string,
  skipError?: boolean
): Promise<Messages | Status> {
  const loader = loaders.get(plugin)
  if (loader === undefined) {
    const status = new Status(Severity.ERROR, platform.status.NoLoaderForStrings, { plugin })
    await setStatus(status, skipError)
    return status
  }
  try {
    return (await loader(locale)) as Record<string, IntlString> | Status
  } catch (err) {
    console.error('No translations found for plugin', plugin, err)
    try {
      return (await loader('en')) as Record<string, IntlString> | Status
    } catch (err: any) {
      return await pipelineErrorToStatus(err, skipError)
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

async function getTranslation (
  id: _IdInfo,
  locale: string,
  skipError?: boolean
): Promise<IntlString | Status | undefined> {
  try {
    const localtTanslations = translations.get(locale) ?? new Map<Plugin, Messages | Status<any>>()
    if (!translations.has(locale)) {
      translations.set(locale, localtTanslations)
    }
    let messages = localtTanslations.get(id.component)
    if (messages === undefined) {
      messages = await loadTranslationsForComponent(id.component, locale, skipError)
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
          eng = await loadTranslationsForComponent(id.component, 'en', skipError)
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
    return await pipelineErrorToStatus(err, skipError)
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
  language?: string,
  skipError?: boolean
): Promise<string> {
  const locale = language ?? getMetadata(platform.metadata.locale) ?? 'en'
  const localCache = cache.get(locale) ?? new Map<IntlString, IntlMessageFormat | Status>()
  if (!cache.has(locale)) {
    cache.set(locale, localCache)
  }
  try {
    const compiled = localCache.get(message)

    if (compiled !== undefined) {
      if (compiled instanceof Status) {
        return message as string
      }
      return compiled.format(params)
    }
    const id = _parseId(message)
    if (id.component === _EmbeddedId) {
      return id.name
    }
    const translation = getCachedTranslation(id, locale) ?? (await getTranslation(id, locale, skipError)) ?? message
    if (translation instanceof Status) {
      localCache.set(message, translation)
      return message as string
    }
    const compiledNew = new IntlMessageFormat(translation, locale, undefined, { ignoreTag: true })
    localCache.set(message, compiledNew)
    return compiledNew.format(params)
  } catch (err) {
    return (await handleIntlPipelineFailure(err, message, localCache, skipError)) as string
  }
}
/**
 * Will do a translation in case language file already in cache, a translate is called and Promise is returned overwise
 */
export function translateCB<P extends Record<string, any>> (
  message: IntlString<P>,
  params: P,
  language: string | undefined,
  resolve: (value: string) => void,
  skipError?: boolean
): void {
  const locale = language ?? getMetadata(platform.metadata.locale) ?? 'en'
  const localCache = cache.get(locale) ?? new Map<IntlString, IntlMessageFormat | Status>()
  if (!cache.has(locale)) {
    cache.set(locale, localCache)
  }
  try {
    const compiled = localCache.get(message)

    if (compiled !== undefined) {
      if (compiled instanceof Status) {
        resolve(message)
        return
      }
      resolve(compiled.format(params))
      return
    }
    const id = _parseId(message)
    if (id.component === _EmbeddedId) {
      resolve(id.name)
      return
    }
    const translation = getCachedTranslation(id, locale)
    if (translation === undefined || translation instanceof Status) {
      void translate(message, params, language, skipError)
        .then((res) => {
          resolve(res)
        })
        .catch((err) => {
          void handleIntlPipelineFailure(err, message, localCache, skipError).then(resolve)
        })
      return
    }

    const compiledNew = new IntlMessageFormat(translation, locale, undefined, { ignoreTag: true })
    localCache.set(message, compiledNew)
    resolve(compiledNew.format(params))
  } catch (err) {
    void handleIntlPipelineFailure(err, message, localCache, skipError).then(resolve)
  }
}
