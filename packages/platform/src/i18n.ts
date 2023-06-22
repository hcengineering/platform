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
import platform from './platform'

/**
 * @public
 */
export type Loader = (locale: string) => Promise<Record<string, string | Record<string, string>>>

type Messages = Record<string, IntlString | Record<string, IntlString>>

const loaders = new Map<Plugin, Loader>()
const translations = new Map<Plugin, Messages | Status>()
const cache = new Map<IntlString, IntlMessageFormat | Status>()

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
    let messages = translations.get(plugin)
    if (messages === undefined || force) {
      messages = await loadTranslationsForComponent(plugin, locale)
      translations.set(plugin, messages)
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
    console.error(err)
    const status = unknownError(err)
    await setPlatformStatus(status)
    return status
  }
}

async function getTranslation (id: _IdInfo, locale: string): Promise<IntlString | Status | undefined> {
  try {
    let messages = translations.get(id.component)
    if (messages === undefined) {
      messages = await loadTranslationsForComponent(id.component, locale)
      translations.set(id.component, messages)
    }
    if (messages instanceof Status) {
      return messages
    }
    return id.kind !== undefined
      ? (messages[id.kind] as Record<string, IntlString>)?.[id.name]
      : (messages[id.name] as IntlString)
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
  const compiled = cache.get(message)

  if (compiled !== undefined) {
    if (compiled instanceof Status) {
      return message
    }
    return compiled.format(params)
  } else {
    try {
      const id = _parseId(message)
      if (id.component === 'embedded') {
        return id.name
      }
      const translation = (await getTranslation(id, locale)) ?? message
      if (translation instanceof Status) {
        cache.set(message, translation)
        return message
      }
      const compiled = new IntlMessageFormat(translation, locale)
      cache.set(message, compiled)
      return compiled.format(params)
    } catch (err) {
      const status = unknownError(err)
      await setPlatformStatus(status)
      cache.set(message, status)
      return message
    }
  }
}
